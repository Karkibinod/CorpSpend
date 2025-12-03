"""
FinLedger Ledger Service

Core transaction processing service with strict ACID compliance and
concurrency control using PostgreSQL row-level locking.

=============================================================================
CRITICAL CONCURRENCY CONTROL - WHY WE USE SELECT FOR UPDATE
=============================================================================

Problem Scenario (Race Condition without locking):
--------------------------------------------------
Consider a card with $1000 spending limit and $900 current balance ($100 available).

Without locking, two simultaneous $100 transactions could both succeed:

    Thread A                          Thread B
    --------                          --------
    1. Read balance = $900            1. Read balance = $900
    2. Check: 900 + 100 <= 1000 ✓     2. Check: 900 + 100 <= 1000 ✓  
    3. Update: balance = $1000        3. Update: balance = $1000
    
Result: Both transactions succeed, but only $100 was charged instead of $200!
The card is now overdrawn conceptually.

Solution with SELECT FOR UPDATE:
--------------------------------
    Thread A                          Thread B
    --------                          --------
    1. SELECT FOR UPDATE (acquires    1. SELECT FOR UPDATE 
       exclusive row lock)                (BLOCKS - waiting for lock)
    2. Read balance = $900            
    3. Check: 900 + 100 <= 1000 ✓     
    4. Update: balance = $1000        
    5. COMMIT (releases lock)         
                                      2. Read balance = $1000 (fresh!)
                                      3. Check: 1000 + 100 <= 1000 ✗
                                      4. REJECT - insufficient funds

This ensures serialized access to the card balance, preventing race conditions.

PostgreSQL guarantees:
- Only one transaction can hold the FOR UPDATE lock at a time
- Other transactions will wait (block) until the lock is released
- The waiting transaction sees the committed changes when it acquires the lock
=============================================================================
"""

from dataclasses import dataclass
from decimal import Decimal
from typing import Optional
from uuid import UUID
import logging

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from app import db
from app.models import Card, Transaction, TransactionStatus, CardStatus
from app.services.fraud import FraudEngine, FraudCheckResult, get_fraud_engine

logger = logging.getLogger(__name__)


class InsufficientFundsError(Exception):
    """Raised when a card doesn't have sufficient available balance."""
    pass


class CardNotFoundError(Exception):
    """Raised when the requested card doesn't exist."""
    pass


class CardFrozenError(Exception):
    """Raised when attempting to use a frozen or cancelled card."""
    pass


class FraudDetectedError(Exception):
    """Raised when the fraud engine blocks a transaction."""
    
    def __init__(self, result: FraudCheckResult):
        self.result = result
        super().__init__(f'Transaction blocked by fraud engine: {result.reasons}')


@dataclass
class TransactionResult:
    """Result of a transaction processing attempt."""
    success: bool
    transaction: Optional[Transaction] = None
    error: Optional[str] = None
    fraud_result: Optional[FraudCheckResult] = None


class LedgerService:
    """
    Core Ledger Service for transaction processing.
    
    This service is responsible for:
    1. Fraud detection (pre-database check)
    2. Row-level locking for concurrency control
    3. Balance validation and update
    4. Transaction creation with full ACID guarantees
    """
    
    def __init__(self, fraud_engine: FraudEngine = None):
        """
        Initialize the ledger service.
        
        Args:
            fraud_engine: Optional custom fraud engine. Uses default if not provided.
        """
        self.fraud_engine = fraud_engine
    
    def _get_fraud_engine(self) -> FraudEngine:
        """Lazy load the fraud engine."""
        if self.fraud_engine is None:
            self.fraud_engine = get_fraud_engine()
        return self.fraud_engine
    
    def process_transaction(
        self,
        card_id: UUID,
        amount: Decimal,
        merchant_name: str,
        merchant_category: Optional[str] = None,
        description: Optional[str] = None,
    ) -> TransactionResult:
        """
        Process a financial transaction with full ACID compliance.
        
        This method implements a three-phase transaction processing:
        
        Phase 1: Fraud Detection (Synchronous, Pre-Lock)
            - Run fraud rules BEFORE acquiring database lock
            - Fail fast on obviously fraudulent transactions
            - Reduces lock contention by rejecting bad requests early
        
        Phase 2: Row-Level Locking (SELECT FOR UPDATE)
            - Acquire exclusive lock on the card row
            - Prevents concurrent modifications
            - Other transactions wait until lock is released
        
        Phase 3: Balance Validation & Update (Atomic)
            - Check available balance against transaction amount
            - Update card balance
            - Create transaction record
            - All within single database transaction
        
        Args:
            card_id: UUID of the card to charge
            amount: Transaction amount (must be positive Decimal)
            merchant_name: Name of the merchant
            merchant_category: Optional MCC category
            description: Optional transaction description
        
        Returns:
            TransactionResult with success status and transaction/error details
        
        Raises:
            CardNotFoundError: If card doesn't exist
            CardFrozenError: If card is not active
            FraudDetectedError: If fraud engine blocks the transaction
            InsufficientFundsError: If card doesn't have enough balance
        """
        logger.info(
            f'Processing transaction: card={card_id}, '
            f'amount=${amount}, merchant={merchant_name}'
        )
        
        # =====================================================================
        # PHASE 1: FRAUD DETECTION (Pre-Lock)
        # =====================================================================
        # Run fraud checks BEFORE acquiring the database lock.
        # This is critical for performance - we don't want to hold expensive
        # row locks while running fraud rules. Fail fast on bad transactions.
        # =====================================================================
        
        fraud_result = self._get_fraud_engine().check_transaction(
            amount=amount,
            merchant_name=merchant_name,
            card_id=str(card_id),
        )
        
        if fraud_result.blocked:
            logger.warning(f'Transaction blocked by fraud engine: {fraud_result.reasons}')
            raise FraudDetectedError(fraud_result)
        
        try:
            # =================================================================
            # PHASE 2 & 3: ROW-LEVEL LOCKING + ATOMIC UPDATE
            # =================================================================
            # We use SQLAlchemy's with_for_update() which translates to
            # PostgreSQL's SELECT ... FOR UPDATE clause.
            #
            # This acquires an exclusive row-level lock on the card record,
            # preventing any other transaction from reading or modifying it
            # until we commit or rollback.
            #
            # The lock is held for the duration of the database transaction,
            # NOT the Python context. db.session.commit() releases the lock.
            # =================================================================
            
            # Build the query with FOR UPDATE lock
            # NOWAIT option would fail immediately if lock unavailable;
            # we use blocking mode to queue requests
            stmt = (
                select(Card)
                .where(Card.id == card_id)
                .with_for_update()  # <-- THIS IS THE CRITICAL LOCK
            )
            
            # Execute query - this will BLOCK if another transaction
            # holds the lock on this card row
            card = db.session.execute(stmt).scalar_one_or_none()
            
            if card is None:
                raise CardNotFoundError(f'Card {card_id} not found')
            
            # Validate card status
            if card.status != CardStatus.ACTIVE:
                raise CardFrozenError(
                    f'Card {card_id} is {card.status.value}, cannot process transaction'
                )
            
            # =================================================================
            # BALANCE CHECK (With Lock Held)
            # =================================================================
            # At this point, we have exclusive access to the card row.
            # No other transaction can read a stale balance value.
            # This prevents the race condition described in the module docstring.
            # =================================================================
            
            available = card.spending_limit - card.current_balance
            
            if amount > available:
                # Create declined transaction record for audit
                transaction = Transaction(
                    card_id=card_id,
                    amount=amount,
                    merchant_name=merchant_name,
                    merchant_category=merchant_category,
                    description=description,
                    status=TransactionStatus.DECLINED,
                    fraud_score=fraud_result.score,
                    fraud_reason='Insufficient funds' if not fraud_result.reasons else '; '.join(fraud_result.reasons),
                )
                db.session.add(transaction)
                db.session.commit()
                
                raise InsufficientFundsError(
                    f'Insufficient funds: requested ${amount}, available ${available}'
                )
            
            # =================================================================
            # ATOMIC BALANCE UPDATE + TRANSACTION CREATION
            # =================================================================
            # Both the balance update and transaction creation happen in
            # the same database transaction. If either fails, both rollback.
            # =================================================================
            
            # Update card balance (still holding the lock)
            card.current_balance = card.current_balance + amount
            
            # Determine final transaction status
            if not fraud_result.passed:
                # Transaction is allowed but flagged for review
                status = TransactionStatus.FLAGGED
            else:
                status = TransactionStatus.APPROVED
            
            # Create the transaction record
            transaction = Transaction(
                card_id=card_id,
                amount=amount,
                merchant_name=merchant_name,
                merchant_category=merchant_category,
                description=description,
                status=status,
                fraud_score=fraud_result.score,
                fraud_reason='; '.join(fraud_result.reasons) if fraud_result.reasons else None,
            )
            
            db.session.add(transaction)
            
            # COMMIT - This releases the row-level lock
            # Any waiting transactions can now proceed
            db.session.commit()
            
            logger.info(
                f'Transaction {transaction.id} processed successfully: '
                f'amount=${amount}, new_balance=${card.current_balance}'
            )
            
            return TransactionResult(
                success=True,
                transaction=transaction,
                fraud_result=fraud_result,
            )
            
        except (CardNotFoundError, CardFrozenError, InsufficientFundsError):
            # Re-raise domain exceptions
            db.session.rollback()
            raise
            
        except SQLAlchemyError as e:
            # Database errors - rollback and convert to application error
            db.session.rollback()
            logger.exception(f'Database error processing transaction: {e}')
            return TransactionResult(
                success=False,
                error=f'Database error: {str(e)}',
                fraud_result=fraud_result,
            )
            
        except Exception as e:
            # Unexpected errors - rollback and log
            db.session.rollback()
            logger.exception(f'Unexpected error processing transaction: {e}')
            return TransactionResult(
                success=False,
                error=f'Internal error: {str(e)}',
                fraud_result=fraud_result,
            )
    
    def get_card_balance(self, card_id: UUID) -> dict:
        """
        Get the current balance information for a card.
        
        Note: This is a non-locking read, suitable for display purposes.
        For transactional operations, always use process_transaction().
        """
        card = db.session.get(Card, card_id)
        
        if card is None:
            raise CardNotFoundError(f'Card {card_id} not found')
        
        return {
            'card_id': str(card.id),
            'spending_limit': str(card.spending_limit),
            'current_balance': str(card.current_balance),
            'available_balance': str(card.available_balance),
            'status': card.status.value,
        }
    
    def create_card(
        self,
        card_number: str,
        cardholder_name: str,
        spending_limit: Decimal,
    ) -> Card:
        """
        Create a new corporate card.
        
        Args:
            card_number: 16-digit card number
            cardholder_name: Name of the cardholder
            spending_limit: Maximum spending limit
        
        Returns:
            Created Card object
        """
        card = Card(
            card_number=card_number,
            cardholder_name=cardholder_name,
            spending_limit=spending_limit,
            current_balance=Decimal('0.00'),
            status=CardStatus.ACTIVE,
        )
        
        db.session.add(card)
        db.session.commit()
        
        logger.info(f'Created new card: {card.id} for {cardholder_name}')
        
        return card
    
    def update_transaction_receipt(
        self,
        transaction_id: UUID,
        receipt_path: str,
    ) -> Transaction:
        """
        Update a transaction with receipt information.
        
        This is typically called after a receipt is uploaded and
        before the async OCR task is triggered.
        """
        transaction = db.session.get(Transaction, transaction_id)
        
        if transaction is None:
            raise ValueError(f'Transaction {transaction_id} not found')
        
        transaction.receipt_path = receipt_path
        db.session.commit()
        
        return transaction
    
    def verify_transaction_receipt(
        self,
        transaction_id: UUID,
        verified: bool = True,
    ) -> Transaction:
        """
        Mark a transaction as receipt-verified.
        
        Called by the async OCR task after successful receipt matching.
        """
        from datetime import datetime
        
        transaction = db.session.get(Transaction, transaction_id)
        
        if transaction is None:
            raise ValueError(f'Transaction {transaction_id} not found')
        
        transaction.receipt_verified = verified
        transaction.receipt_verified_at = datetime.utcnow() if verified else None
        
        if verified and transaction.status == TransactionStatus.APPROVED:
            transaction.status = TransactionStatus.VERIFIED
        
        db.session.commit()
        
        logger.info(f'Transaction {transaction_id} receipt verified: {verified}')
        
        return transaction


# Create a default ledger service instance
ledger_service = LedgerService()

