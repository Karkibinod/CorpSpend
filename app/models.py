"""
FinLedger Database Models

SQLAlchemy 2.0 ORM models for the corporate spend management system.

CRITICAL DESIGN DECISIONS:
- All monetary values use DECIMAL (via Numeric) to avoid floating-point precision errors
- UUID primary keys for distributed system compatibility
- Proper indexing for query performance
- Timestamps for audit trails
"""

import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum as PyEnum

from sqlalchemy import (
    Column, String, Numeric, DateTime, ForeignKey, 
    Boolean, Text, Index, Enum, CheckConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app import db


class TransactionStatus(PyEnum):
    """Transaction lifecycle states."""
    PENDING = 'pending'
    APPROVED = 'approved'
    DECLINED = 'declined'
    VERIFIED = 'verified'  # After receipt reconciliation
    FLAGGED = 'flagged'    # Potential fraud


class CardStatus(PyEnum):
    """Card lifecycle states."""
    ACTIVE = 'active'
    FROZEN = 'frozen'
    CANCELLED = 'cancelled'


class User(db.Model):
    """
    User Model for Authentication
    
    Stores user credentials and profile information.
    Passwords are hashed using werkzeug's security functions.
    """
    __tablename__ = 'users'
    
    id = Column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4,
        comment='Unique identifier for the user'
    )
    email = Column(
        String(255), 
        unique=True, 
        nullable=False, 
        index=True,
        comment='User email address (used for login)'
    )
    password_hash = Column(
        String(255), 
        nullable=False,
        comment='Hashed password'
    )
    name = Column(
        String(255), 
        nullable=False,
        comment='User display name'
    )
    role = Column(
        String(50), 
        nullable=False, 
        default='user',
        comment='User role (admin, user)'
    )
    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        comment='Whether the user account is active'
    )
    
    # Audit timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<User {self.email}>'


class Card(db.Model):
    """
    Corporate Card Model
    
    Represents a corporate spending card with defined limits.
    The current_balance tracks remaining spending capacity.
    
    IMPORTANT: current_balance should only be modified within a transaction
    that holds a row-level lock (SELECT FOR UPDATE) to prevent race conditions.
    """
    __tablename__ = 'cards'
    
    id = Column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4,
        comment='Unique identifier for the card'
    )
    card_number = Column(
        String(16), 
        unique=True, 
        nullable=False, 
        index=True,
        comment='16-digit card number (masked in API responses)'
    )
    cardholder_name = Column(
        String(255), 
        nullable=False,
        comment='Name of the authorized cardholder'
    )
    
    # MONETARY VALUES - Always use Numeric/DECIMAL, NEVER float
    # Precision: 15 total digits, 2 decimal places (supports up to $9,999,999,999,999.99)
    spending_limit = Column(
        Numeric(precision=15, scale=2), 
        nullable=False,
        comment='Maximum spending limit for this card'
    )
    current_balance = Column(
        Numeric(precision=15, scale=2), 
        nullable=False,
        default=Decimal('0.00'),
        comment='Current spent amount (must not exceed spending_limit)'
    )
    
    status = Column(
        Enum(CardStatus), 
        nullable=False, 
        default=CardStatus.ACTIVE,
        index=True
    )
    
    # Audit timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    transactions = relationship('Transaction', back_populates='card', lazy='dynamic')
    
    # Database constraints
    __table_args__ = (
        CheckConstraint(
            'current_balance >= 0',
            name='check_balance_non_negative'
        ),
        CheckConstraint(
            'current_balance <= spending_limit',
            name='check_balance_within_limit'
        ),
        CheckConstraint(
            'spending_limit > 0',
            name='check_limit_positive'
        ),
    )
    
    @property
    def available_balance(self) -> Decimal:
        """Calculate remaining spending capacity."""
        return self.spending_limit - self.current_balance
    
    def __repr__(self):
        return f'<Card {self.card_number[-4:]} | Balance: ${self.current_balance}/{self.spending_limit}>'


class Transaction(db.Model):
    """
    Financial Transaction Model
    
    Records all spending activities against corporate cards.
    Each transaction is immutable once created (append-only ledger pattern).
    
    Receipt verification happens asynchronously via Celery tasks.
    """
    __tablename__ = 'transactions'
    
    id = Column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    card_id = Column(
        UUID(as_uuid=True), 
        ForeignKey('cards.id', ondelete='RESTRICT'),  # Never allow card deletion with transactions
        nullable=False,
        index=True
    )
    
    # MONETARY VALUE - DECIMAL type for financial accuracy
    amount = Column(
        Numeric(precision=15, scale=2), 
        nullable=False,
        comment='Transaction amount in USD'
    )
    
    merchant_name = Column(
        String(255), 
        nullable=False,
        index=True,
        comment='Name of the merchant/vendor'
    )
    merchant_category = Column(
        String(100),
        nullable=True,
        comment='MCC category (e.g., TRAVEL, OFFICE_SUPPLIES)'
    )
    description = Column(
        Text,
        nullable=True,
        comment='Optional transaction description/memo'
    )
    
    status = Column(
        Enum(TransactionStatus), 
        nullable=False, 
        default=TransactionStatus.PENDING,
        index=True
    )
    
    # Receipt reconciliation fields
    receipt_path = Column(
        String(500),
        nullable=True,
        comment='File path to uploaded receipt image'
    )
    receipt_verified = Column(
        Boolean, 
        nullable=False, 
        default=False,
        comment='True if receipt has been verified via OCR'
    )
    receipt_verified_at = Column(
        DateTime,
        nullable=True,
        comment='Timestamp of receipt verification'
    )
    
    # Fraud detection metadata
    fraud_score = Column(
        Numeric(precision=5, scale=4),
        nullable=True,
        comment='Fraud probability score (0.0000 to 1.0000)'
    )
    fraud_reason = Column(
        String(500),
        nullable=True,
        comment='Reason for fraud flag, if applicable'
    )
    
    # Audit timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    card = relationship('Card', back_populates='transactions')
    
    # Database constraints
    __table_args__ = (
        CheckConstraint(
            'amount > 0',
            name='check_amount_positive'
        ),
        # Composite index for common queries
        Index('ix_transactions_card_status', 'card_id', 'status'),
        Index('ix_transactions_created_at_desc', created_at.desc()),
    )
    
    def __repr__(self):
        return f'<Transaction {self.id} | ${self.amount} @ {self.merchant_name}>'

