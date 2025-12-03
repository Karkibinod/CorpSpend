# FinLedger - Corporate Spend Management Platform

A robust, production-ready corporate spend management system built with Python, Flask, PostgreSQL, and Celery. Designed for high-frequency financial transactions with strict ACID compliance and concurrency control.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FINLEDGER                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   API        │    │   Worker     │    │   Beat       │       │
│  │   Service    │    │   Service    │    │   Scheduler  │       │
│  │  (Gunicorn)  │    │  (Celery)    │    │  (Celery)    │       │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘       │
│         │                   │                   │                │
│         ▼                   ▼                   ▼                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                      Redis 7                              │    │
│  │              (Message Broker + Result Backend)            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                             │                                    │
│                             ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   PostgreSQL 15                           │    │
│  │        (ACID Compliant + Row-Level Locking)              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 🔐 Concurrency Control: Why SELECT FOR UPDATE?

### The Race Condition Problem

Consider a card with $1,000 spending limit and $900 current balance ($100 available).
Without proper locking, two simultaneous $100 transactions could both succeed:

```
Thread A                          Thread B
--------                          --------
1. Read balance = $900            1. Read balance = $900
2. Check: 900 + 100 <= 1000 ✓     2. Check: 900 + 100 <= 1000 ✓  
3. Update: balance = $1000        3. Update: balance = $1000

Result: Both succeed! Only $100 charged instead of $200.
```

### The Solution: Row-Level Locking

```python
# From app/services/ledger.py
stmt = (
    select(Card)
    .where(Card.id == card_id)
    .with_for_update()  # <-- PostgreSQL row-level lock
)
```

With `SELECT FOR UPDATE`, the sequence becomes:

```
Thread A                          Thread B
--------                          --------
1. SELECT FOR UPDATE              1. SELECT FOR UPDATE
   (acquires exclusive lock)         (BLOCKS - waiting)
2. Read balance = $900            
3. Check: 900 + 100 <= 1000 ✓     
4. Update: balance = $1000        
5. COMMIT (releases lock)         
                                  2. Read balance = $1000 (fresh!)
                                  3. Check: 1000 + 100 > 1000 ✗
                                  4. REJECT - insufficient funds
```

## 🚀 Quick Start

### Using Docker Compose (Recommended)

```bash
# Clone and navigate to the project
cd finledger

# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f api

# Run database migrations (first time only)
docker-compose exec api flask db upgrade
```

### Local Development

```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export FLASK_ENV=development
export DATABASE_URL=postgresql://finledger:finledger_dev@localhost:5432/finledger_dev
export CELERY_BROKER_URL=redis://localhost:6379/0

# Run migrations
flask db upgrade

# Start API server
python run.py

# In another terminal, start Celery worker
celery -A worker.celery_config:celery_app worker --loglevel=INFO
```

## 📚 API Reference

### Cards

#### Create Card
```bash
POST /api/v1/cards
Content-Type: application/json

{
  "card_number": "4111111111111111",
  "cardholder_name": "John Doe",
  "spending_limit": 10000.00
}
```

#### Get Card
```bash
GET /api/v1/cards/{card_id}
```

#### Get Card Balance
```bash
GET /api/v1/cards/{card_id}/balance
```

#### List Cards
```bash
GET /api/v1/cards?page=1&per_page=20&status=active
```

### Transactions

#### Create Transaction
```bash
POST /api/v1/transactions
Content-Type: application/json

{
  "card_id": "uuid-of-card",
  "amount": 149.99,
  "merchant_name": "Office Supplies Inc",
  "merchant_category": "OFFICE",
  "description": "Monthly supplies order"
}
```

**Response (Success):**
```json
{
  "id": "transaction-uuid",
  "card_id": "card-uuid",
  "amount": "149.99",
  "merchant_name": "OFFICE SUPPLIES INC",
  "status": "approved",
  "receipt_verified": false,
  "created_at": "2024-01-15T10:30:00Z"
}
```

**Response (Fraud Detected):**
```json
{
  "error": "FRAUD_DETECTED",
  "message": "Transaction blocked by fraud detection",
  "details": {
    "score": "1.0000",
    "reasons": ["Transaction amount $6000.00 exceeds maximum allowed $5000.00"]
  }
}
```

#### Get Transaction
```bash
GET /api/v1/transactions/{transaction_id}
```

#### List Transactions
```bash
GET /api/v1/transactions?card_id={uuid}&status=approved&page=1
```

### Receipts

#### Upload Receipt
```bash
POST /api/v1/upload-receipt
Content-Type: multipart/form-data

file: [receipt.jpg]
transaction_id: [optional-transaction-uuid]
```

**Response:**
```json
{
  "message": "Receipt uploaded successfully. OCR processing queued.",
  "task_id": "celery-task-uuid",
  "transaction_id": "linked-transaction-uuid",
  "status": "processing"
}
```

#### Check Receipt Status
```bash
GET /api/v1/receipts/status/{task_id}
```

## 🛡️ Fraud Detection

The Fraud Engine runs **synchronously before database operations** to fail fast:

| Rule | Threshold | Action |
|------|-----------|--------|
| Amount Threshold | > $5,000 | Block |
| Merchant Blacklist | Exact/Partial Match | Block |
| Velocity Check | > 10 txn/minute | Flag |

### Blacklisted Merchants (Default)
- `SUSPICIOUS_VENDOR_1`
- `BLACKLISTED_MERCHANT`
- `FRAUD_CORP`
- `SCAM_ENTERPRISES`

## 💾 Database Schema

### Cards Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| card_number | VARCHAR(16) | Unique, indexed |
| cardholder_name | VARCHAR(255) | Card holder name |
| spending_limit | NUMERIC(15,2) | Maximum limit |
| current_balance | NUMERIC(15,2) | Current spent amount |
| status | ENUM | active/frozen/cancelled |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update |

### Transactions Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| card_id | UUID | Foreign key to cards |
| amount | NUMERIC(15,2) | Transaction amount |
| merchant_name | VARCHAR(255) | Merchant name (normalized) |
| status | ENUM | pending/approved/declined/verified/flagged |
| receipt_path | VARCHAR(500) | Path to receipt file |
| receipt_verified | BOOLEAN | OCR verification status |
| fraud_score | NUMERIC(5,4) | Risk score 0-1 |
| created_at | TIMESTAMP | Transaction time |

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FLASK_ENV` | development | Environment mode |
| `DATABASE_URL` | - | PostgreSQL connection string |
| `CELERY_BROKER_URL` | redis://localhost:6379/0 | Redis broker URL |
| `FRAUD_MAX_TRANSACTION_AMOUNT` | 5000.00 | Max single transaction |
| `UPLOAD_FOLDER` | /tmp/finledger/receipts | Receipt storage path |

## 🧪 Testing Concurrency

To verify the row-level locking works correctly:

```python
import asyncio
import httpx

async def test_concurrent_transactions():
    """Send 10 simultaneous transactions to the same card."""
    async with httpx.AsyncClient() as client:
        tasks = [
            client.post(
                "http://localhost:5000/api/v1/transactions",
                json={
                    "card_id": "your-card-uuid",
                    "amount": 100.00,
                    "merchant_name": "Test Merchant"
                }
            )
            for _ in range(10)
        ]
        responses = await asyncio.gather(*tasks)
        
        approved = sum(1 for r in responses if r.status_code == 201)
        declined = sum(1 for r in responses if r.status_code == 402)
        
        print(f"Approved: {approved}, Declined (insufficient funds): {declined}")

asyncio.run(test_concurrent_transactions())
```

## 📁 Project Structure

```
finledger/
├── app/
│   ├── __init__.py          # Flask app factory
│   ├── config.py             # Environment configurations
│   ├── models.py             # SQLAlchemy models (Card, Transaction)
│   ├── schemas.py            # Pydantic validation schemas
│   ├── routes.py             # API endpoints
│   └── services/
│       ├── __init__.py
│       ├── ledger.py         # Transaction logic with row locking
│       └── fraud.py          # Fraud detection engine
├── worker/
│   ├── __init__.py
│   ├── celery_config.py      # Celery configuration
│   └── tasks.py              # Async tasks (OCR, reporting)
├── scripts/
│   └── init-db.sql           # Database initialization
├── requirements.txt          # Python dependencies
├── Dockerfile                # Multi-stage Docker build
├── docker-compose.yml        # Service orchestration
├── run.py                    # WSGI entry point
└── README.md
```

## 🔒 Security Considerations

1. **NEVER use floats for money** - All monetary values use `DECIMAL(15,2)`
2. **Card numbers are masked** in API responses (shows only last 4 digits)
3. **Non-root Docker containers** for production security
4. **Row-level locking** prevents financial race conditions
5. **Input validation** at API boundary with Pydantic
6. **Fraud detection** runs before any database operations

## 📈 Scaling Considerations

- **Horizontal API scaling**: Run multiple Gunicorn instances behind a load balancer
- **Worker scaling**: Increase Celery concurrency or add more worker containers
- **Database read replicas**: Use for read-heavy reporting queries
- **Redis cluster**: For high-availability message brokering

## 📄 License

MIT License - See LICENSE file for details.

