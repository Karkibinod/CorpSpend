"""
FinLedger Fraud Detection Engine

Synchronous fraud detection middleware that runs BEFORE any database
operations occur. This is the first line of defense against fraudulent
transactions.

Design Philosophy:
- Fast synchronous checks (no I/O blocking)
- Fail-fast approach: reject obviously bad transactions early
- Extensible rule-based architecture
"""

from dataclasses import dataclass, field
from decimal import Decimal
from typing import Callable, Optional
import logging

from flask import current_app

logger = logging.getLogger(__name__)


@dataclass
class FraudCheckResult:
    """
    Result of a fraud check operation.
    
    Attributes:
        passed: True if transaction passed all fraud checks
        score: Risk score from 0.0000 (safe) to 1.0000 (definite fraud)
        reasons: List of reasons if transaction was flagged
        blocked: True if transaction should be completely blocked
    """
    passed: bool = True
    score: Decimal = field(default_factory=lambda: Decimal('0.0000'))
    reasons: list[str] = field(default_factory=list)
    blocked: bool = False
    
    def add_risk(self, risk_points: Decimal, reason: str) -> None:
        """Add risk points and reason to the check result."""
        self.score = min(Decimal('1.0000'), self.score + risk_points)
        self.reasons.append(reason)
        if self.score >= Decimal('0.7000'):
            self.passed = False


class FraudRule:
    """
    Base class for fraud detection rules.
    
    Each rule evaluates a specific fraud pattern and contributes
    to the overall risk score.
    """
    
    def __init__(self, name: str, weight: Decimal = Decimal('0.5000')):
        self.name = name
        self.weight = weight
    
    def evaluate(
        self, 
        amount: Decimal, 
        merchant_name: str, 
        card_id: str,
        **kwargs
    ) -> tuple[bool, Optional[str]]:
        """
        Evaluate the rule against transaction data.
        
        Returns:
            Tuple of (rule_violated: bool, reason: Optional[str])
        """
        raise NotImplementedError


class AmountThresholdRule(FraudRule):
    """
    Rule: Reject transactions exceeding the maximum allowed amount.
    
    Rationale: Large transactions require additional verification
    through a different approval workflow.
    """
    
    def __init__(self, max_amount: Decimal = Decimal('5000.00')):
        super().__init__('AMOUNT_THRESHOLD', weight=Decimal('1.0000'))
        self.max_amount = max_amount
    
    def evaluate(
        self, 
        amount: Decimal, 
        merchant_name: str, 
        card_id: str,
        **kwargs
    ) -> tuple[bool, Optional[str]]:
        if amount > self.max_amount:
            return True, f'Transaction amount ${amount} exceeds maximum allowed ${self.max_amount}'
        return False, None


class MerchantBlacklistRule(FraudRule):
    """
    Rule: Reject transactions to blacklisted merchants.
    
    Rationale: Known fraudulent or prohibited vendors should be
    blocked at the transaction level.
    """
    
    def __init__(self, blacklist: list[str] = None):
        super().__init__('MERCHANT_BLACKLIST', weight=Decimal('1.0000'))
        self.blacklist = set(m.upper() for m in (blacklist or []))
    
    def evaluate(
        self, 
        amount: Decimal, 
        merchant_name: str, 
        card_id: str,
        **kwargs
    ) -> tuple[bool, Optional[str]]:
        normalized_merchant = merchant_name.upper().strip()
        
        # Check exact match
        if normalized_merchant in self.blacklist:
            return True, f'Merchant "{merchant_name}" is on the blacklist'
        
        # Check partial match (merchant name contains blacklisted term)
        for blacklisted in self.blacklist:
            if blacklisted in normalized_merchant:
                return True, f'Merchant "{merchant_name}" matches blacklist pattern "{blacklisted}"'
        
        return False, None


class VelocityRule(FraudRule):
    """
    Rule: Flag rapid successive transactions (potential card testing).
    
    Note: This is a simplified in-memory check. Production systems
    should use Redis for distributed velocity tracking.
    """
    
    def __init__(self, max_transactions_per_minute: int = 5):
        super().__init__('VELOCITY_CHECK', weight=Decimal('0.3000'))
        self.max_tpm = max_transactions_per_minute
        # In production, use Redis for distributed tracking
        self._recent_transactions: dict[str, list[float]] = {}
    
    def evaluate(
        self, 
        amount: Decimal, 
        merchant_name: str, 
        card_id: str,
        **kwargs
    ) -> tuple[bool, Optional[str]]:
        # Simplified check - production would use Redis ZSET with TTL
        # This is just for demonstration
        import time
        current_time = time.time()
        
        if card_id not in self._recent_transactions:
            self._recent_transactions[card_id] = []
        
        # Clean old entries (older than 60 seconds)
        self._recent_transactions[card_id] = [
            t for t in self._recent_transactions[card_id]
            if current_time - t < 60
        ]
        
        # Check velocity
        if len(self._recent_transactions[card_id]) >= self.max_tpm:
            return True, f'Too many transactions in short period ({len(self._recent_transactions[card_id])} in last minute)'
        
        # Record this transaction
        self._recent_transactions[card_id].append(current_time)
        
        return False, None


class FraudEngine:
    """
    Main Fraud Detection Engine.
    
    Orchestrates multiple fraud detection rules and provides a unified
    interface for transaction validation.
    
    Usage:
        engine = FraudEngine()
        result = engine.check_transaction(amount, merchant, card_id)
        if not result.passed:
            # Reject transaction
    """
    
    def __init__(self):
        """Initialize the fraud engine with default rules."""
        self.rules: list[FraudRule] = []
        self._setup_default_rules()
    
    def _setup_default_rules(self) -> None:
        """Configure default fraud detection rules from app config."""
        try:
            max_amount = Decimal(str(
                current_app.config.get('FRAUD_MAX_TRANSACTION_AMOUNT', 5000.00)
            ))
            blacklist = current_app.config.get('MERCHANT_BLACKLIST', [])
        except RuntimeError:
            # Outside Flask app context (e.g., testing)
            max_amount = Decimal('5000.00')
            blacklist = [
                'SUSPICIOUS_VENDOR_1',
                'BLACKLISTED_MERCHANT',
                'FRAUD_CORP',
                'SCAM_ENTERPRISES',
            ]
        
        self.rules = [
            AmountThresholdRule(max_amount=max_amount),
            MerchantBlacklistRule(blacklist=blacklist),
            VelocityRule(max_transactions_per_minute=10),
        ]
    
    def add_rule(self, rule: FraudRule) -> None:
        """Add a custom fraud detection rule."""
        self.rules.append(rule)
        logger.info(f'Added fraud rule: {rule.name}')
    
    def check_transaction(
        self,
        amount: Decimal,
        merchant_name: str,
        card_id: str,
        **kwargs
    ) -> FraudCheckResult:
        """
        Run all fraud checks against a transaction.
        
        This method is called SYNCHRONOUSLY before any database
        operations to fail fast on obviously fraudulent transactions.
        
        Args:
            amount: Transaction amount in USD
            merchant_name: Name of the merchant
            card_id: UUID of the card being charged
            **kwargs: Additional context for custom rules
        
        Returns:
            FraudCheckResult with pass/fail status and reasons
        """
        result = FraudCheckResult()
        
        logger.info(
            f'Running fraud checks: amount=${amount}, '
            f'merchant={merchant_name}, card={card_id}'
        )
        
        for rule in self.rules:
            try:
                violated, reason = rule.evaluate(
                    amount=amount,
                    merchant_name=merchant_name,
                    card_id=card_id,
                    **kwargs
                )
                
                if violated:
                    result.add_risk(rule.weight, reason)
                    logger.warning(f'Fraud rule {rule.name} violated: {reason}')
                    
                    # Critical rules (weight = 1.0) block immediately
                    if rule.weight >= Decimal('1.0000'):
                        result.blocked = True
                        result.passed = False
                        logger.error(
                            f'Transaction BLOCKED by rule {rule.name}: {reason}'
                        )
                        break  # No need to check further
                        
            except Exception as e:
                logger.exception(f'Error in fraud rule {rule.name}: {e}')
                # Don't block on rule errors, but log for investigation
                continue
        
        logger.info(
            f'Fraud check complete: passed={result.passed}, '
            f'score={result.score}, blocked={result.blocked}'
        )
        
        return result


# Singleton instance for easy access
_fraud_engine: Optional[FraudEngine] = None


def get_fraud_engine() -> FraudEngine:
    """Get or create the singleton FraudEngine instance."""
    global _fraud_engine
    if _fraud_engine is None:
        _fraud_engine = FraudEngine()
    return _fraud_engine

