"""
FinLedger Celery Tasks

Asynchronous background tasks for heavy operations:
- Receipt OCR and matching
- Report generation
- Batch processing
"""

import os
import time
import random
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional
from uuid import UUID

from celery import shared_task
from celery.utils.log import get_task_logger

from worker.celery_config import celery_app

# Use Celery's task logger for proper log aggregation
logger = get_task_logger(__name__)


@celery_app.task(
    bind=True,
    name='worker.tasks.match_receipt',
    max_retries=3,
    default_retry_delay=60,  # Retry after 60 seconds
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_jitter=True,
)
def match_receipt(
    self,
    receipt_path: str,
    transaction_id: Optional[str] = None,
) -> dict:
    """
    Process a receipt image using OCR and match it to a transaction.
    
    This task simulates OCR processing (2 second delay) and attempts
    to find a matching transaction in the database.
    
    Matching Logic:
    1. If transaction_id is provided, verify the receipt against that transaction
    2. If not provided, attempt to find a matching transaction by:
       - Parsed amount from receipt
       - Parsed merchant name
       - Date within reasonable range
    
    Args:
        receipt_path: Path to the saved receipt image
        transaction_id: Optional UUID of transaction to verify
    
    Returns:
        Dict with matching results and OCR data
    """
    logger.info(f'Starting OCR processing for receipt: {receipt_path}')
    
    # Verify file exists
    if not os.path.exists(receipt_path):
        logger.error(f'Receipt file not found: {receipt_path}')
        return {
            'status': 'error',
            'message': f'Receipt file not found: {receipt_path}',
        }
    
    # ==========================================================================
    # SIMULATED OCR PROCESSING
    # ==========================================================================
    # In a production system, this would call an OCR service like:
    # - Tesseract OCR
    # - Google Cloud Vision API
    # - AWS Textract
    # - Azure Form Recognizer
    # ==========================================================================
    
    logger.info('Simulating OCR processing (2 second delay)...')
    time.sleep(2)  # Simulate OCR processing time
    
    # Simulate parsed OCR data
    # In production, this would be actual parsed receipt data
    ocr_result = {
        'merchant_name': 'OFFICE_SUPPLIES_INC',
        'amount': Decimal('149.99'),
        'date': datetime.utcnow().date().isoformat(),
        'items': [
            {'description': 'Printer Paper', 'amount': '49.99'},
            {'description': 'Ink Cartridges', 'amount': '79.99'},
            {'description': 'Stapler', 'amount': '20.01'},
        ],
        'tax': Decimal('12.00'),
        'total': Decimal('161.99'),
        'confidence': 0.92,
    }
    
    logger.info(f'OCR complete. Parsed data: {ocr_result}')
    
    # ==========================================================================
    # TRANSACTION MATCHING
    # ==========================================================================
    
    # Import here to avoid circular imports and ensure Flask context
    from app import db
    from app.models import Transaction, TransactionStatus
    from app.services.ledger import ledger_service
    
    matched_transaction = None
    match_confidence = 0.0
    
    if transaction_id:
        # Verify against specific transaction
        logger.info(f'Verifying receipt against transaction: {transaction_id}')
        
        try:
            transaction = db.session.get(Transaction, UUID(transaction_id))
            
            if transaction:
                # Calculate match confidence based on OCR data
                amount_match = abs(float(transaction.amount) - float(ocr_result['amount'])) < 1.0
                merchant_match = (
                    ocr_result['merchant_name'].upper() in transaction.merchant_name.upper() or
                    transaction.merchant_name.upper() in ocr_result['merchant_name'].upper()
                )
                
                if amount_match and merchant_match:
                    match_confidence = 0.95
                elif amount_match or merchant_match:
                    match_confidence = 0.70
                else:
                    match_confidence = 0.30
                
                matched_transaction = transaction
                
                # Mark transaction as verified if confidence is high
                if match_confidence >= 0.80:
                    ledger_service.verify_transaction_receipt(
                        transaction_id=UUID(transaction_id),
                        verified=True,
                    )
                    logger.info(f'Transaction {transaction_id} marked as verified')
                
        except Exception as e:
            logger.exception(f'Error verifying transaction: {e}')
    
    else:
        # Attempt to find matching transaction
        logger.info('Searching for matching transaction...')
        
        try:
            # Look for transactions in the last 7 days with similar amount
            recent_date = datetime.utcnow() - timedelta(days=7)
            
            transactions = Transaction.query.filter(
                Transaction.created_at >= recent_date,
                Transaction.status.in_([TransactionStatus.APPROVED, TransactionStatus.FLAGGED]),
                Transaction.receipt_verified == False,
            ).all()
            
            best_match = None
            best_confidence = 0.0
            
            for txn in transactions:
                # Calculate match score
                amount_diff = abs(float(txn.amount) - float(ocr_result['amount']))
                amount_score = max(0, 1 - (amount_diff / 100))  # 0-1 score based on amount difference
                
                merchant_score = 0.0
                if (ocr_result['merchant_name'].upper() in txn.merchant_name.upper() or
                    txn.merchant_name.upper() in ocr_result['merchant_name'].upper()):
                    merchant_score = 1.0
                
                confidence = (amount_score * 0.6) + (merchant_score * 0.4)
                
                if confidence > best_confidence:
                    best_confidence = confidence
                    best_match = txn
            
            if best_match and best_confidence >= 0.70:
                matched_transaction = best_match
                match_confidence = best_confidence
                
                # Update transaction with receipt info
                best_match.receipt_path = receipt_path
                
                if match_confidence >= 0.80:
                    ledger_service.verify_transaction_receipt(
                        transaction_id=best_match.id,
                        verified=True,
                    )
                    logger.info(f'Auto-matched and verified transaction: {best_match.id}')
                
        except Exception as e:
            logger.exception(f'Error searching for matching transaction: {e}')
    
    # Build result
    result = {
        'status': 'success',
        'receipt_path': receipt_path,
        'ocr_data': {
            'merchant': ocr_result['merchant_name'],
            'amount': str(ocr_result['amount']),
            'date': ocr_result['date'],
            'confidence': ocr_result['confidence'],
        },
        'match_found': matched_transaction is not None,
        'match_confidence': match_confidence,
        'matched_transaction_id': str(matched_transaction.id) if matched_transaction else None,
        'verified': match_confidence >= 0.80,
        'processed_at': datetime.utcnow().isoformat(),
    }
    
    logger.info(f'Receipt processing complete: {result}')
    
    return result


@celery_app.task(
    bind=True,
    name='worker.tasks.generate_report',
    max_retries=2,
)
def generate_report(
    self,
    report_type: str,
    start_date: str,
    end_date: str,
    card_ids: Optional[list[str]] = None,
) -> dict:
    """
    Generate a spending report for the specified period.
    
    Args:
        report_type: Type of report ('summary', 'detailed', 'by_merchant')
        start_date: ISO format start date
        end_date: ISO format end date
        card_ids: Optional list of card UUIDs to filter
    
    Returns:
        Dict containing report data
    """
    logger.info(f'Generating {report_type} report: {start_date} to {end_date}')
    
    from app import db
    from app.models import Transaction, Card, TransactionStatus
    from sqlalchemy import func
    
    start = datetime.fromisoformat(start_date)
    end = datetime.fromisoformat(end_date)
    
    # Base query
    query = Transaction.query.filter(
        Transaction.created_at >= start,
        Transaction.created_at <= end,
        Transaction.status.in_([
            TransactionStatus.APPROVED,
            TransactionStatus.VERIFIED,
        ])
    )
    
    if card_ids:
        query = query.filter(Transaction.card_id.in_([UUID(cid) for cid in card_ids]))
    
    # Generate report based on type
    if report_type == 'summary':
        total_amount = query.with_entities(func.sum(Transaction.amount)).scalar() or Decimal('0.00')
        transaction_count = query.count()
        
        report_data = {
            'type': 'summary',
            'period': {'start': start_date, 'end': end_date},
            'total_spending': str(total_amount),
            'transaction_count': transaction_count,
            'average_transaction': str(total_amount / transaction_count) if transaction_count > 0 else '0.00',
        }
    
    elif report_type == 'by_merchant':
        merchant_stats = query.with_entities(
            Transaction.merchant_name,
            func.sum(Transaction.amount).label('total'),
            func.count(Transaction.id).label('count'),
        ).group_by(Transaction.merchant_name).all()
        
        report_data = {
            'type': 'by_merchant',
            'period': {'start': start_date, 'end': end_date},
            'merchants': [
                {
                    'name': stat[0],
                    'total_spending': str(stat[1]),
                    'transaction_count': stat[2],
                }
                for stat in merchant_stats
            ],
        }
    
    else:  # detailed
        transactions = query.order_by(Transaction.created_at.desc()).all()
        
        report_data = {
            'type': 'detailed',
            'period': {'start': start_date, 'end': end_date},
            'transactions': [
                {
                    'id': str(t.id),
                    'card_id': str(t.card_id),
                    'amount': str(t.amount),
                    'merchant': t.merchant_name,
                    'status': t.status.value,
                    'date': t.created_at.isoformat(),
                }
                for t in transactions
            ],
        }
    
    report_data['generated_at'] = datetime.utcnow().isoformat()
    
    logger.info(f'Report generated successfully')
    
    return report_data


@celery_app.task(name='worker.tasks.health_check')
def health_check() -> dict:
    """
    Simple health check task to verify Celery is working.
    """
    return {
        'status': 'healthy',
        'service': 'finledger-worker',
        'timestamp': datetime.utcnow().isoformat(),
    }

