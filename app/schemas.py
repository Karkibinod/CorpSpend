"""
FinLedger Pydantic Schemas

Pydantic models for request/response validation and serialization.
These schemas ensure data integrity at the API boundary before
any database operations occur.
"""

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, ConfigDict


# ============================================================================
# Enums for API serialization
# ============================================================================

class TransactionStatusSchema(str, Enum):
    """Transaction status values for API."""
    PENDING = 'pending'
    APPROVED = 'approved'
    DECLINED = 'declined'
    VERIFIED = 'verified'
    FLAGGED = 'flagged'


class CardStatusSchema(str, Enum):
    """Card status values for API."""
    ACTIVE = 'active'
    FROZEN = 'frozen'
    CANCELLED = 'cancelled'


# ============================================================================
# Card Schemas
# ============================================================================

class CardCreateRequest(BaseModel):
    """Schema for creating a new corporate card."""
    
    card_number: str = Field(
        ...,
        min_length=16,
        max_length=16,
        pattern=r'^\d{16}$',
        description='16-digit card number'
    )
    cardholder_name: str = Field(
        ...,
        min_length=2,
        max_length=255,
        description='Full name of the cardholder'
    )
    spending_limit: Decimal = Field(
        ...,
        gt=Decimal('0'),
        le=Decimal('1000000.00'),  # Max $1M limit
        description='Maximum spending limit in USD'
    )
    
    @field_validator('spending_limit', mode='before')
    @classmethod
    def round_spending_limit(cls, v):
        """Ensure spending limit has exactly 2 decimal places."""
        if isinstance(v, (int, float, str)):
            return Decimal(str(v)).quantize(Decimal('0.01'))
        return v


class CardResponse(BaseModel):
    """Schema for card API responses."""
    
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    card_number: str
    cardholder_name: str
    spending_limit: Decimal
    current_balance: Decimal
    available_balance: Decimal
    status: CardStatusSchema
    created_at: datetime
    updated_at: datetime
    
    @field_validator('card_number', mode='after')
    @classmethod
    def mask_card_number(cls, v: str) -> str:
        """Mask card number for security, showing only last 4 digits."""
        return f'****-****-****-{v[-4:]}'


class CardUpdateRequest(BaseModel):
    """Schema for updating card properties."""
    
    spending_limit: Optional[Decimal] = Field(
        None,
        gt=Decimal('0'),
        le=Decimal('1000000.00')
    )
    status: Optional[CardStatusSchema] = None


# ============================================================================
# Transaction Schemas
# ============================================================================

class TransactionCreateRequest(BaseModel):
    """
    Schema for creating a new transaction.
    
    Note: Validation here is the first line of defense.
    The Fraud Engine provides additional business rule validation.
    """
    
    card_id: UUID = Field(..., description='UUID of the card to charge')
    amount: Decimal = Field(
        ...,
        gt=Decimal('0'),
        le=Decimal('100000.00'),  # Single transaction max $100K
        description='Transaction amount in USD'
    )
    merchant_name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description='Name of the merchant'
    )
    merchant_category: Optional[str] = Field(
        None,
        max_length=100,
        description='Merchant category code'
    )
    description: Optional[str] = Field(
        None,
        max_length=1000,
        description='Transaction description/memo'
    )
    
    @field_validator('amount', mode='before')
    @classmethod
    def round_amount(cls, v):
        """Ensure amount has exactly 2 decimal places."""
        if isinstance(v, (int, float, str)):
            return Decimal(str(v)).quantize(Decimal('0.01'))
        return v
    
    @field_validator('merchant_name', mode='after')
    @classmethod
    def normalize_merchant_name(cls, v: str) -> str:
        """Normalize merchant name to uppercase for consistent matching."""
        return v.strip().upper()


class TransactionResponse(BaseModel):
    """Schema for transaction API responses."""
    
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    card_id: UUID
    amount: Decimal
    merchant_name: str
    merchant_category: Optional[str]
    description: Optional[str]
    status: TransactionStatusSchema
    receipt_verified: bool
    receipt_verified_at: Optional[datetime]
    fraud_score: Optional[Decimal]
    fraud_reason: Optional[str]
    created_at: datetime
    updated_at: datetime


class TransactionListResponse(BaseModel):
    """Schema for paginated transaction list."""
    
    transactions: list[TransactionResponse]
    total: int
    page: int
    per_page: int
    has_next: bool
    has_prev: bool


# ============================================================================
# Receipt Upload Schemas
# ============================================================================

class ReceiptUploadResponse(BaseModel):
    """Schema for receipt upload response."""
    
    message: str
    task_id: str
    transaction_id: Optional[UUID] = None
    status: str = 'processing'


class ReceiptMatchRequest(BaseModel):
    """Schema for manual receipt matching."""
    
    transaction_id: UUID
    receipt_amount: Decimal = Field(..., gt=Decimal('0'))
    receipt_merchant: str
    receipt_date: datetime


# ============================================================================
# Error Schemas
# ============================================================================

class ErrorResponse(BaseModel):
    """Standard error response schema."""
    
    error: str
    message: str
    details: Optional[dict] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class FraudCheckResult(BaseModel):
    """Schema for fraud check results."""
    
    passed: bool
    score: Decimal = Field(default=Decimal('0.0000'))
    reasons: list[str] = Field(default_factory=list)
    blocked: bool = False

