# CorpSpend - The Autonomous Finance Platform

A robust, production-ready corporate spend management system built with Python, Flask, PostgreSQL, Celery, and a modern React frontend. Features AI-powered assistance, real-time fraud detection, and ACID-compliant transaction processing.

# Demo Link
https://corpspend-frontend.onrender.com/

### Test Credentials
```
Email: admin@corpspend.io
Password: admin123
```


## ✨ Key Features

- 🔐 **User Authentication** - Secure login/signup with session management
- 🤖 **AI Chatbot** - Intelligent assistant powered by Llama 3.2 (Groq/Ollama)
- 💳 **Card Management** - Issue and manage corporate cards with spending limits
- 💸 **Transaction Processing** - Real-time fraud detection and approval
- 🧾 **Receipt OCR** - Automatic receipt scanning and transaction matching
- 📊 **Analytics Dashboard** - Real-time spending insights and charts
- 🛡️ **Fraud Protection** - Configurable rules with merchant blacklisting

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CORPSPEND                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐                           │
│  │   Frontend   │    │  AI Chatbot  │   Llama 3.2 / Groq        │
│  │   (Nginx)    │    │   Assistant  │   Smart Fallback          │
│  │   Port 3000  │    └──────────────┘                           │
│  └──────┬───────┘                                               │
│         │                                                       │
│         ▼                                                       │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   API        │    │   Worker     │    │   Beat       │       │
│  │   Service    │    │   Service    │    │   Scheduler  │       │
│  │  Port 5001   │    │  (Celery)    │    │  (Celery)    │       │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘       │
│         │                   │                   │               │
│         ▼                   ▼                   ▼               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                      Redis 7                            │    │
│  │              (Message Broker + Result Backend)          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                             │                                   │
│                             ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   PostgreSQL 15                         │    │
│  │        (ACID Compliant + Row-Level Locking)             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Using Docker Compose (Recommended)

```bash
# Clone and navigate to the project
git clone https://github.com/Karkibinod/CorpSpend
cd CorpSpend

# Create .env file from template
cp env.config .env

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f api
```

### Access the Application

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | Main web application |
| **API** | http://localhost:5001 | REST API endpoints |
| **Flower** | http://localhost:5555 | Celery task monitoring |



Or create a new account via the signup page!

## 🤖 AI Chatbot

The built-in AI assistant helps users navigate the platform. It supports multiple backends:

### Priority Order:
1. **Groq API** (fastest) - Set `GROQ_API_KEY` environment variable
2. **Ollama** (local) - Run `ollama serve` with Llama 3.2
3. **Smart Fallback** - Built-in intelligent responses (always works)

### Enable AI-Powered Chat

**Option 1: Groq (Free & Fast)**
```bash
# Get free API key at https://console.groq.com
export GROQ_API_KEY=your-key-here
docker-compose up -d
```

**Option 2: Ollama (Local)**
```bash
# Install and run Ollama
brew install ollama
ollama serve
ollama run llama3.2
```

## 🎨 Frontend Features

- **Dashboard**: Real-time spending overview with interactive charts
- **Cards**: Issue corporate cards with spending limits and status tracking
- **Transactions**: Process payments with live fraud detection feedback
- **Receipts**: Drag-and-drop upload with OCR auto-matching
- **Settings**: Configure fraud rules, notifications, appearance (dark/light mode)
- **Help Center**: FAQs, documentation, and AI assistant
- **Authentication**: Secure login/signup with session persistence

**Tech Stack**: React 18, TypeScript, Tailwind CSS, Framer Motion, Recharts, Vite

## 🔐 Authentication

### Login
```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@corpspend.io",
  "password": "admin123"
}
```

### Signup
```bash
POST /api/v1/auth/signup
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@company.com",
  "password": "securepass123"
}
```

## 📚 API Reference

### Cards

```bash
# Create Card
POST /api/v1/cards
{
  "card_number": "4111111111111111",
  "cardholder_name": "John Doe",
  "spending_limit": 10000.00
}

# Get Card
GET /api/v1/cards/{card_id}

# List Cards
GET /api/v1/cards?page=1&per_page=20&status=active
```

### Transactions

```bash
# Create Transaction
POST /api/v1/transactions
{
  "card_id": "uuid-of-card",
  "amount": 149.99,
  "merchant_name": "Office Supplies Inc",
  "merchant_category": "OFFICE"
}

# List Transactions
GET /api/v1/transactions?status=approved&page=1
```

### Receipts

```bash
# Upload Receipt
POST /api/v1/upload-receipt
Content-Type: multipart/form-data
file: [receipt.jpg]
transaction_id: [optional-uuid]

# Check Status
GET /api/v1/receipts/status/{task_id}
```

### Chat

```bash
# Send Message to AI
POST /api/v1/chat
{
  "message": "How do I create a new card?",
  "context": "System context...",
  "history": []
}
```

## 🛡️ Fraud Detection

Real-time fraud protection with configurable rules:

| Rule | Threshold | Action |
|------|-----------|--------|
| Amount Limit | > $5,000 | Block |
| Merchant Blacklist | Match | Block |
| Velocity Check | > 10/minute | Flag |

### Default Blacklisted Merchants
- `SUSPICIOUS_VENDOR_1`
- `BLACKLISTED_MERCHANT`
- `FRAUD_CORP`
- `SCAM_ENTERPRISES`

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FLASK_ENV` | production | Environment mode |
| `DATABASE_URL` | - | PostgreSQL connection |
| `CELERY_BROKER_URL` | redis://redis:6379/0 | Redis broker |
| `GROQ_API_KEY` | - | Groq API for AI chat |
| `OLLAMA_URL` | http://host.docker.internal:11434 | Ollama endpoint |
| `TEST_USER_EMAIL` | admin@corpspend.io | Default test user |
| `TEST_USER_PASSWORD` | admin123 | Default test password |

## 📁 Project Structure

```
CorpSpend/
├── .env                          # Environment variables (create from env.config)
├── .gitignore                    # Git ignore rules
├── .dockerignore                 # Docker ignore rules
├── Dockerfile                    # Backend Docker build
├── docker-compose.yml            # Full stack orchestration
├── env.config                    # Environment template
├── requirements.txt              # Python dependencies
├── run.py                        # Flask entry point
├── README.md                     # This file
├── app/                          # Flask Backend
│   ├── __init__.py               # Flask app factory
│   ├── config.py                 # Environment configurations
│   ├── models.py                 # SQLAlchemy models
│   ├── schemas.py                # Pydantic validation
│   ├── routes.py                 # API endpoints (auth, chat, cards, etc.)
│   └── services/
│       ├── ledger.py             # Transaction logic with row locking
│       └── fraud.py              # Fraud detection engine
├── worker/                       # Celery Workers
│   ├── celery_config.py          # Celery configuration
│   └── tasks.py                  # Async tasks (OCR, reporting)
├── frontend/                     # React Frontend
│   ├── src/
│   │   ├── api/client.ts         # API client
│   │   ├── components/
│   │   │   ├── Login.tsx         # Authentication
│   │   │   ├── Signup.tsx        # User registration
│   │   │   ├── Dashboard.tsx     # Overview & charts
│   │   │   ├── Cards.tsx         # Card management
│   │   │   ├── Transactions.tsx  # Transaction list
│   │   │   ├── Receipts.tsx      # Receipt upload & OCR
│   │   │   ├── Chatbot.tsx       # AI assistant
│   │   │   └── Settings.tsx      # Configuration
│   │   ├── context/
│   │   │   ├── AuthContext.tsx   # Authentication state
│   │   │   └── ThemeContext.tsx  # Theme management
│   │   └── types/index.ts        # TypeScript definitions
│   ├── package.json
│   ├── tailwind.config.js
│   └── Dockerfile
└── scripts/
    └── init-db.sql               # Database initialization
```

## 🔒 Security Features

1. **Session-based authentication** with secure token storage
2. **Password validation** - minimum 6 characters required
3. **DECIMAL for money** - Never use floats for financial calculations
4. **Card number masking** - Only last 4 digits shown in responses
5. **Row-level locking** - Prevents race conditions in concurrent transactions
6. **Input validation** - Pydantic schemas at API boundary
7. **Fraud detection** - Runs before any database operations

## 🔐 Concurrency Control

Uses PostgreSQL `SELECT FOR UPDATE` to prevent race conditions:

```python
stmt = (
    select(Card)
    .where(Card.id == card_id)
    .with_for_update()  # Exclusive row lock
)
```

This ensures that concurrent transactions to the same card are serialized properly.

## 📈 Scaling

- **Horizontal API scaling**: Multiple Gunicorn workers behind load balancer
- **Worker scaling**: Increase Celery concurrency or add containers
- **Database replicas**: Read replicas for reporting queries
- **Redis cluster**: High-availability message brokering

## 🧪 Development

### Local Backend
```bash
cd CorpSpend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Copy environment config
cp env.config .env

# Edit .env if needed, then run
python run.py
```

### Local Frontend
```bash
cd CorpSpend/frontend
npm install
npm run dev
```

### Using Docker (Recommended)
```bash
cd CorpSpend
cp env.config .env
docker-compose up -d --build
```



2. **API URL Mismatch (Production)**
   - Ensure `VITE_API_URL` is set correctly in your frontend environment
   - Check browser console for API_BASE URL being used
   - The frontend should log: `API_BASE: https://your-api.onrender.com/api/v1`

3. **Database Not Persisting**
   - If using Docker locally, ensure PostgreSQL volume is mounted
   - Check if database migrations have run: `docker-compose logs api`

4. **Debug Steps:**
   ```bash
   # Open browser developer tools (F12) and check Console tab
   # You should see these logs:
   # 📝 Attempting signup for: email@example.com
   # ✅ Signup successful
   # 🔑 Login attempt for: email@example.com
   # ✅ Login successful, redirecting...
   
   # Check Network tab for actual API requests
   # Verify the request URL is correct (not 404)
   ```

5. **Test with Default Credentials**
   ```
   Email: admin@corpspend.io
   Password: admin123
   ```
   If this works, the issue is with your signup/account.

### API Connection Issues

**Error: "Cannot connect to API server"**

1. **Local Development:**
   - Ensure backend is running: `python run.py` or `docker-compose up api`
   - Check if API is accessible: `curl http://localhost:5001/api/v1/auth/login`

2. **Production:**
   - Verify `VITE_API_URL` environment variable is set
   - Check CORS settings if getting blocked
   - Ensure backend service is running on Render

### Database Issues

**Error: "Invalid email or password" for newly created account**

```bash
# Check if user was actually created
docker-compose exec api python -c "
from app import create_app, db
from app.models import User
app = create_app()
with app.app_context():
    users = User.query.all()
    for u in users:
        print(f'{u.email} - {u.name}')
"
```

### Resetting Everything

```bash
# Stop all containers and remove volumes
docker-compose down -v

# Rebuild and start fresh
docker-compose up -d --build

# This creates a fresh database with the default test user
```

## 📄 License

MIT License - See LICENSE file for details.

---

Built with ❤️ using Flask, PostgreSQL, React, and Llama 3.2
