# Ramp Backend Engineering Internship
## Resume & Interview Preparation Guide

**Based on:** CorpSpend - Corporate Spend Management Platform  
**Prepared for:** Ramp Backend Engineering Internship (12-16 weeks)

---

## Table of Contents

1. [Tech Stack Alignment](#tech-stack-alignment)
2. [Feature Mapping to Ramp Products](#feature-mapping-to-ramp-products)
3. [Resume Bullet Points](#resume-bullet-points)
4. [Technical Highlights](#technical-highlights)
5. [Architecture Overview](#architecture-overview)
6. [Interview Questions & Answers](#interview-questions--answers)
7. [Ramp-Specific Preparation](#ramp-specific-preparation)
8. [Code Highlights](#code-highlights)

---

## Tech Stack Alignment

Your project uses technologies that **directly match** Ramp's stack mentioned in the job description:

| Your Project | Ramp's Stack | Match |
|-------------|--------------|-------|
| Flask 3.0 | Flask | ✅ Direct |
| SQLAlchemy 2.0 | SQLAlchemy | ✅ Direct |
| PostgreSQL 15 | PostgreSQL | ✅ Direct |
| Celery 5.3 + Redis | Celery | ✅ Direct |
| Python 3.x | Python | ✅ Direct |
| Docker & Docker Compose | AWS | ✅ Production-ready |
| Pydantic 2.5 | — | Bonus |
| React + TypeScript | — | Full-stack bonus |

---

## Feature Mapping to Ramp Products

### 1. Fraud Detection Engine → Ramp's Risk/Fraud Platform

**What you built:**
- Rule-based fraud detection system with extensible architecture
- Three fraud rules implemented:
  - **Amount Threshold Rule**: Blocks transactions over $5,000
  - **Merchant Blacklist Rule**: Blocks known bad merchants
  - **Velocity Rule**: Flags rapid successive transactions (>10/minute)
- Weighted scoring system (0.0000 to 1.0000)
- Fail-fast pattern: reject suspicious transactions before acquiring database locks
- Blocked vs. Flagged distinction for workflow routing

### 2. Receipt Matching System → Ramp's Receipt Matching

**What you built:**
- Asynchronous receipt OCR processing using Celery + Redis
- Transaction matching algorithm with confidence scoring:
  - Amount similarity (60% weight)
  - Merchant name matching (40% weight)
- Auto-verification at 80%+ confidence
- Manual review flagging for lower confidence matches
- Retry logic with exponential backoff (max 3 retries)

### 3. Financial Ledger Service → Ramp's Treasury Management

**What you built:**
- ACID-compliant transaction processing with PostgreSQL
- Row-level locking using `SELECT FOR UPDATE` to prevent race conditions
- Decimal-precision monetary values (never using floats for money)
- Card lifecycle management (active/frozen/cancelled states)
- Balance constraints enforced at database level

### 4. RESTful API Platform → Ramp's Web-App Platform

**What you built:**
- Full CRUD operations for cards & transactions
- Pagination and filtering support
- Pydantic schemas for request validation & response serialization
- Custom exception handlers (InsufficientFundsError, FraudDetectedError, etc.)
- AI-powered chatbot with LLM fallback chain (Groq → Ollama → Smart responses)

---

## Resume Bullet Points

### Option A: Concise Version (3-4 bullets)

**CorpSpend** — *Corporate Spend Management Platform*  
*Python, Flask, SQLAlchemy, PostgreSQL, Celery, Redis, Docker*

- Built real-time fraud detection engine with configurable rules (amount thresholds, merchant blacklists, velocity limits), blocking high-risk transactions before database operations
- Implemented concurrent transaction processing with PostgreSQL row-level locking to prevent balance race conditions, ensuring financial data integrity
- Developed async receipt-to-transaction matching pipeline using Celery workers with confidence scoring and automatic retry logic
- Deployed containerized microservices (API, worker, scheduler) with Docker Compose, PostgreSQL, and Redis

### Option B: Detailed Version (5-6 bullets)

**CorpSpend** — *Corporate Spend Management Platform*  
*Python, Flask, SQLAlchemy, PostgreSQL, Celery, Redis, React, TypeScript, Docker*

- Architected fraud detection middleware processing transactions through rule-based checks (amount limits, blacklists, velocity) with weighted risk scoring (0.0-1.0)
- Solved concurrent balance update race conditions using PostgreSQL `SELECT FOR UPDATE` locking within ACID-compliant transactions
- Built async receipt OCR pipeline with Celery, implementing confidence-based matching (auto-verify at 80%+) and exponential backoff retries
- Designed RESTful API with Pydantic validation, custom exception handlers, and paginated queries for cards and transactions
- Used `Decimal` types for all monetary values to prevent floating-point precision errors in financial calculations
- Orchestrated 6-container architecture (frontend, API, worker, scheduler, PostgreSQL, Redis) with health checks and service dependencies

### Option C: One-liner for Skills Section

> Full-stack fintech platform with Flask, PostgreSQL, Celery; implemented fraud detection, receipt matching, and concurrent transaction processing

---

## Technical Highlights

### 1. Concurrency Control

**Problem:** Race condition where two simultaneous transactions could both read the same balance and approve, causing overdraft.

**Solution:** PostgreSQL row-level locking with `SELECT FOR UPDATE`

```python
# Acquire exclusive lock on card row
stmt = (
    select(Card)
    .where(Card.id == card_id)
    .with_for_update()  # This is the critical lock
)
card = db.session.execute(stmt).scalar_one_or_none()
```

**Key Insight:** Fraud checks run BEFORE acquiring the lock to minimize lock hold time.

### 2. Fraud Detection Architecture

**Design Pattern:** Extensible rule-based engine

```python
class FraudRule:
    def evaluate(self, amount, merchant_name, card_id) -> (bool, str):
        # Returns (violated, reason)
        raise NotImplementedError

class AmountThresholdRule(FraudRule):
    def evaluate(self, amount, merchant_name, card_id):
        if amount > self.max_amount:
            return True, f"Amount ${amount} exceeds ${self.max_amount}"
        return False, None
```

**Scoring System:**
- Weight 1.0 = Immediate block
- Weight < 1.0 = Accumulates; blocks at total ≥ 0.7

### 3. Async Task Processing

**Pattern:** Fire-and-forget with status polling

```python
@celery_app.task(
    bind=True,
    max_retries=3,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_jitter=True,
)
def match_receipt(self, receipt_path, transaction_id):
    # OCR processing + transaction matching
    pass
```

**Reliability Features:**
- `task_acks_late=True` — Acknowledge after completion
- `task_reject_on_worker_lost=True` — Re-queue on worker death

### 4. Financial Data Integrity

**Database Constraints:**
```sql
CHECK (current_balance >= 0)
CHECK (current_balance <= spending_limit)
CHECK (spending_limit > 0)
CHECK (amount > 0)
```

**Python Types:**
```python
# PostgreSQL Numeric → Python Decimal
spending_limit = Column(Numeric(precision=15, scale=2))
# Supports up to $9,999,999,999,999.99
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CORPSPEND ARCHITECTURE                    │
└─────────────────────────────────────────────────────────────────┘

                    ┌─────────────┐
                    │   React     │
                    │  Frontend   │
                    │  (Port 3000)│
                    └──────┬──────┘
                           │ HTTP
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                         FLASK API (Port 5001)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Routes    │  │  Pydantic   │  │    Error Handlers       │  │
│  │  /cards     │  │  Schemas    │  │  - ValidationError      │  │
│  │  /trans     │  │             │  │  - InsufficientFunds    │  │
│  │  /receipts  │  │             │  │  - FraudDetected        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└───────────────────────────┬──────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ FRAUD ENGINE  │   │ LEDGER SERVICE│   │    REDIS      │
│               │   │               │   │   (Broker)    │
│ - Amount Rule │   │ - SELECT FOR  │   │               │
│ - Blacklist   │   │   UPDATE      │   │  ┌─────────┐  │
│ - Velocity    │   │ - ACID txns   │   │  │ Celery  │  │
│               │   │               │   │  │ Tasks   │  │
└───────────────┘   └───────┬───────┘   └──┴────┬────┴──┘
                            │                   │
                            ▼                   ▼
                    ┌───────────────┐   ┌───────────────┐
                    │  PostgreSQL   │   │ CELERY WORKER │
                    │               │   │               │
                    │ - users       │   │ - match_receipt│
                    │ - cards       │   │ - gen_report  │
                    │ - transactions│   │               │
                    └───────────────┘   └───────────────┘
```

**Docker Compose Services:**
1. `frontend` — React + Nginx (port 3000)
2. `api` — Flask + Gunicorn (port 5001)
3. `worker` — Celery worker processes
4. `beat` — Celery scheduler
5. `flower` — Celery monitoring UI (port 5555)
6. `db` — PostgreSQL 15 (port 5432)
7. `redis` — Redis 7 (port 6379)

---

## Interview Questions & Answers

### Q1: "Walk me through how you handle concurrent transactions"

**Answer:**
> "The core problem is a race condition: if two transactions hit the same card simultaneously, both might read the same balance and approve, causing an overdraft.
>
> I solved this with PostgreSQL row-level locking. When processing a transaction, I use `SELECT FOR UPDATE` which acquires an exclusive lock on the card row. The second transaction blocks until the first commits.
>
> Here's the key insight: I run fraud checks BEFORE acquiring the lock. This is critical for performance—I don't want to hold expensive row locks while running CPU-bound fraud rules. Bad transactions get rejected early without touching the database lock."

### Q2: "Why did you use Decimal instead of float for money?"

**Answer:**
> "Floats use binary representation, which can't exactly represent decimal fractions. For example, `0.1 + 0.2` in Python equals `0.30000000000000004`, not `0.3`.
>
> In financial systems, this causes real problems—cents disappear or appear out of nowhere. I used Python's `Decimal` type and PostgreSQL's `Numeric(15,2)` which use base-10 arithmetic and store exact values. The database even enforces constraints like `current_balance >= 0`."

### Q3: "How does your fraud detection system work?"

**Answer:**
> "I built an extensible rule-based engine. Each rule is a class that evaluates transaction data and returns a violation flag plus a weighted score.
>
> Currently I have three rules:
> 1. **Amount threshold** — blocks transactions over $5,000 (weight 1.0)
> 2. **Merchant blacklist** — blocks known bad merchants (weight 1.0)
> 3. **Velocity check** — flags if >10 transactions per minute (weight 0.3)
>
> Weights of 1.0 immediately block; lower weights accumulate. If total score exceeds 0.7, the transaction is flagged for review but still processed. The architecture makes it easy to add new rules—just implement the `evaluate()` method."

### Q4: "Explain your receipt matching pipeline"

**Answer:**
> "Receipt processing is inherently slow (OCR takes seconds), so I made it async with Celery.
>
> When a user uploads a receipt, the API immediately returns HTTP 202 with a task ID. A Celery worker picks up the job, runs OCR, and calculates a match confidence score against recent transactions.
>
> The matching algorithm combines:
> - Amount similarity (60% weight)
> - Merchant name matching (40% weight)
>
> If confidence is ≥80%, I auto-verify the transaction. Otherwise, I flag it for manual review. The task has retry logic—3 attempts with exponential backoff if something fails."

### Q5: "What happens if your Celery worker crashes mid-task?"

**Answer:**
> "I configured `task_acks_late=True`, which means the task isn't acknowledged until it completes successfully. If the worker dies, Redis still has the message and another worker will pick it up.
>
> I also set `task_reject_on_worker_lost=True` to explicitly re-queue on worker death. Combined with `max_retries=3` and `retry_backoff=True`, the system is resilient to transient failures."

### Q6: "How would you scale this system?"

**Answer:**
> "Several paths depending on the bottleneck:
>
> 1. **API layer**: Run multiple Gunicorn workers behind a load balancer. The app is stateless—all state is in PostgreSQL.
>
> 2. **Database**: PostgreSQL read replicas for query load. For write-heavy scenarios, I'd consider sharding by card_id.
>
> 3. **Celery workers**: Horizontal scaling—just spin up more workers. I already have separate queues for OCR (`ocr` queue) and reports (`reports` queue) so I can scale them independently.
>
> 4. **Fraud detection**: Currently in-memory velocity tracking. For distributed workers, I'd move to Redis with `ZSET` for time-windowed counting—each card's transactions stored with timestamps, expired via TTL."

### Q7: "Why Flask over FastAPI or Django?"

**Answer:**
> "Flask gave me the right balance of simplicity and control for a financial system. Django would've brought too much magic for something requiring precise transaction handling. FastAPI is great, but Flask's synchronous model is simpler for database transactions with row-level locking.
>
> I added Pydantic manually for request validation, which gives me FastAPI-like benefits. For async work, I offload to Celery rather than making the API async—this keeps the transaction boundaries clear."

### Q8: "How do you ensure data integrity for financial transactions?"

**Answer:**
> "Multiple layers:
>
> 1. **Database constraints**: PostgreSQL enforces `CHECK (current_balance >= 0)` and `CHECK (current_balance <= spending_limit)`. Invalid states are impossible.
>
> 2. **Row-level locking**: Prevents concurrent modification race conditions.
>
> 3. **Single transaction**: Balance update and transaction creation happen in one database transaction. If either fails, both rollback.
>
> 4. **Decimal precision**: All money uses `Numeric(15,2)` in PostgreSQL and `Decimal` in Python.
>
> 5. **Immutable audit trail**: Transactions are append-only. I never delete or modify historical records—declined transactions are recorded with their status."

---

## Ramp-Specific Preparation

### Alignment with Ramp's Values

| Ramp Requirement | Your Demonstration |
|-----------------|-------------------|
| "Track record of shipping high quality products" | Full-stack fintech app from design to deployment |
| "Turn business ideas into engineering solutions" | Fraud rules, receipt matching, card management |
| "Fast-paced environment" | Async processing, fail-fast patterns, efficient locking |
| "Familiarity with Flask, SQLAlchemy, PostgreSQL, Celery" | **100% match** with your stack |
| "Interest in financial technology" | Built a corporate spend management platform |
| "Strong sense of ownership" | End-to-end implementation from API to worker to frontend |

### Additional Questions to Prepare

1. **"Tell me about a time you had to debug a production issue"**
   - Prepare a story about debugging race conditions or async task failures

2. **"How would you add a new fraud rule?"**
   - Walk through extending the `FraudRule` base class and adding to `FraudEngine`

3. **"What's the difference between APPROVED, VERIFIED, and FLAGGED statuses?"**
   - `APPROVED`: Passed fraud checks, balance deducted
   - `FLAGGED`: Passed with elevated risk score, needs manual review
   - `VERIFIED`: Receipt successfully matched via OCR

4. **"How would you implement spending limits by category?"**
   - Add category limits to Card model
   - Check `merchant_category` in `process_transaction()`
   - Sum recent transactions by category before approving

5. **"Describe a tradeoff you made in this project"**
   - Example: In-memory velocity tracking vs. Redis (simplicity vs. distributed support)
   - Example: Synchronous fraud checks vs. async (latency vs. throughput)

---

## Code Highlights

### Fraud Detection Engine (fraud.py)

```python
class FraudEngine:
    def check_transaction(self, amount, merchant_name, card_id):
        result = FraudCheckResult()
        
        for rule in self.rules:
            violated, reason = rule.evaluate(amount, merchant_name, card_id)
            
            if violated:
                result.add_risk(rule.weight, reason)
                
                # Critical rules block immediately
                if rule.weight >= Decimal('1.0000'):
                    result.blocked = True
                    break
        
        return result
```

### Ledger Service - Transaction Processing (ledger.py)

```python
def process_transaction(self, card_id, amount, merchant_name, ...):
    # PHASE 1: Fraud Detection (Pre-Lock)
    fraud_result = self.fraud_engine.check_transaction(...)
    if fraud_result.blocked:
        raise FraudDetectedError(fraud_result)
    
    # PHASE 2: Row-Level Locking
    stmt = select(Card).where(Card.id == card_id).with_for_update()
    card = db.session.execute(stmt).scalar_one_or_none()
    
    # PHASE 3: Balance Validation & Atomic Update
    if amount > card.available_balance:
        raise InsufficientFundsError(...)
    
    card.current_balance += amount
    transaction = Transaction(card_id=card_id, amount=amount, ...)
    db.session.add(transaction)
    db.session.commit()  # Releases lock
    
    return TransactionResult(success=True, transaction=transaction)
```

### Celery Task with Retry (tasks.py)

```python
@celery_app.task(
    bind=True,
    max_retries=3,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_jitter=True,
)
def match_receipt(self, receipt_path, transaction_id=None):
    # Simulate OCR processing
    ocr_result = run_ocr(receipt_path)
    
    # Calculate match confidence
    confidence = (amount_score * 0.6) + (merchant_score * 0.4)
    
    # Auto-verify if high confidence
    if confidence >= 0.80:
        ledger_service.verify_transaction_receipt(transaction_id)
    
    return {'status': 'success', 'confidence': confidence}
```

### Database Model with Constraints (models.py)

```python
class Card(db.Model):
    spending_limit = Column(Numeric(precision=15, scale=2), nullable=False)
    current_balance = Column(Numeric(precision=15, scale=2), default=Decimal('0.00'))
    
    __table_args__ = (
        CheckConstraint('current_balance >= 0'),
        CheckConstraint('current_balance <= spending_limit'),
        CheckConstraint('spending_limit > 0'),
    )
    
    @property
    def available_balance(self):
        return self.spending_limit - self.current_balance
```

---

## Quick Reference Card

### Your Stack → Ramp's Stack
```
Flask          → Flask           ✅
SQLAlchemy 2.0 → SQLAlchemy      ✅
PostgreSQL 15  → PostgreSQL      ✅
Celery + Redis → Celery          ✅
Python 3.x     → Python          ✅
Docker         → AWS             ✅
```

### Key Technical Decisions
1. `SELECT FOR UPDATE` for concurrency control
2. `Decimal` types for financial precision
3. Fraud checks before database locks (fail-fast)
4. `task_acks_late=True` for task reliability
5. Separate Celery queues for different workloads

### Transaction Flow
```
Request → Fraud Check → Acquire Lock → Validate Balance → Update → Commit → Release Lock
```

### Receipt Flow
```
Upload → HTTP 202 → Celery Task → OCR → Match Transactions → Auto-verify or Flag
```

---

*Document generated from CorpSpend codebase analysis*  
*Target: Ramp Backend Engineering Internship*

