"""
FinLedger API Routes

RESTful API endpoints for the Corporate Spend Management Platform.
All endpoints use Pydantic for request validation and response serialization.
"""

import os
from decimal import Decimal
from uuid import UUID
from datetime import datetime
import logging

from flask import Blueprint, request, jsonify, current_app
from pydantic import ValidationError
from werkzeug.utils import secure_filename

from app import db
from app.models import Card, Transaction, TransactionStatus
from app.schemas import (
    CardCreateRequest, CardResponse, CardUpdateRequest,
    TransactionCreateRequest, TransactionResponse, TransactionListResponse,
    ReceiptUploadResponse, ErrorResponse,
)
from app.services.ledger import (
    LedgerService, ledger_service,
    CardNotFoundError, CardFrozenError, InsufficientFundsError, FraudDetectedError
)

logger = logging.getLogger(__name__)

# Create blueprint for API routes
api_bp = Blueprint('api', __name__)


# =============================================================================
# Error Handlers
# =============================================================================

@api_bp.errorhandler(ValidationError)
def handle_validation_error(error: ValidationError):
    """Handle Pydantic validation errors."""
    return jsonify({
        'error': 'VALIDATION_ERROR',
        'message': 'Request validation failed',
        'details': error.errors(),
        'timestamp': datetime.utcnow().isoformat(),
    }), 400


@api_bp.errorhandler(CardNotFoundError)
def handle_card_not_found(error: CardNotFoundError):
    """Handle card not found errors."""
    return jsonify({
        'error': 'CARD_NOT_FOUND',
        'message': str(error),
        'timestamp': datetime.utcnow().isoformat(),
    }), 404


@api_bp.errorhandler(CardFrozenError)
def handle_card_frozen(error: CardFrozenError):
    """Handle frozen card errors."""
    return jsonify({
        'error': 'CARD_FROZEN',
        'message': str(error),
        'timestamp': datetime.utcnow().isoformat(),
    }), 403


@api_bp.errorhandler(InsufficientFundsError)
def handle_insufficient_funds(error: InsufficientFundsError):
    """Handle insufficient funds errors."""
    return jsonify({
        'error': 'INSUFFICIENT_FUNDS',
        'message': str(error),
        'timestamp': datetime.utcnow().isoformat(),
    }), 402  # 402 Payment Required


@api_bp.errorhandler(FraudDetectedError)
def handle_fraud_detected(error: FraudDetectedError):
    """Handle fraud detection blocks."""
    return jsonify({
        'error': 'FRAUD_DETECTED',
        'message': 'Transaction blocked by fraud detection',
        'details': {
            'score': str(error.result.score),
            'reasons': error.result.reasons,
        },
        'timestamp': datetime.utcnow().isoformat(),
    }), 403


# =============================================================================
# Card Endpoints
# =============================================================================

@api_bp.route('/cards', methods=['POST'])
def create_card():
    """
    Create a new corporate card.
    
    Request Body:
        - card_number: 16-digit card number
        - cardholder_name: Name of the cardholder
        - spending_limit: Maximum spending limit in USD
    
    Returns:
        201: Created card details
        400: Validation error
    """
    try:
        data = CardCreateRequest.model_validate(request.get_json())
    except ValidationError as e:
        return handle_validation_error(e)
    
    card = ledger_service.create_card(
        card_number=data.card_number,
        cardholder_name=data.cardholder_name,
        spending_limit=data.spending_limit,
    )
    
    # Manually construct response to include available_balance
    response = CardResponse(
        id=card.id,
        card_number=card.card_number,
        cardholder_name=card.cardholder_name,
        spending_limit=card.spending_limit,
        current_balance=card.current_balance,
        available_balance=card.available_balance,
        status=card.status.value,
        created_at=card.created_at,
        updated_at=card.updated_at,
    )
    
    return jsonify(response.model_dump(mode='json')), 201


@api_bp.route('/cards/<uuid:card_id>', methods=['GET'])
def get_card(card_id: UUID):
    """
    Get card details by ID.
    
    Path Parameters:
        - card_id: UUID of the card
    
    Returns:
        200: Card details
        404: Card not found
    """
    card = db.session.get(Card, card_id)
    
    if card is None:
        raise CardNotFoundError(f'Card {card_id} not found')
    
    response = CardResponse(
        id=card.id,
        card_number=card.card_number,
        cardholder_name=card.cardholder_name,
        spending_limit=card.spending_limit,
        current_balance=card.current_balance,
        available_balance=card.available_balance,
        status=card.status.value,
        created_at=card.created_at,
        updated_at=card.updated_at,
    )
    
    return jsonify(response.model_dump(mode='json')), 200


@api_bp.route('/cards/<uuid:card_id>/balance', methods=['GET'])
def get_card_balance(card_id: UUID):
    """
    Get card balance information.
    
    This is a lightweight endpoint for quick balance checks.
    """
    balance_info = ledger_service.get_card_balance(card_id)
    return jsonify(balance_info), 200


@api_bp.route('/cards', methods=['GET'])
def list_cards():
    """
    List all cards with pagination.
    
    Query Parameters:
        - page: Page number (default: 1)
        - per_page: Items per page (default: 20, max: 100)
        - status: Filter by card status
    """
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)
    status_filter = request.args.get('status')
    
    query = Card.query
    
    if status_filter:
        query = query.filter(Card.status == status_filter)
    
    pagination = query.order_by(Card.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    cards = [
        CardResponse(
            id=card.id,
            card_number=card.card_number,
            cardholder_name=card.cardholder_name,
            spending_limit=card.spending_limit,
            current_balance=card.current_balance,
            available_balance=card.available_balance,
            status=card.status.value,
            created_at=card.created_at,
            updated_at=card.updated_at,
        ).model_dump(mode='json')
        for card in pagination.items
    ]
    
    return jsonify({
        'cards': cards,
        'total': pagination.total,
        'page': pagination.page,
        'per_page': pagination.per_page,
        'has_next': pagination.has_next,
        'has_prev': pagination.has_prev,
    }), 200


# =============================================================================
# Transaction Endpoints
# =============================================================================

@api_bp.route('/transactions', methods=['POST'])
def create_transaction():
    """
    Create and process a new transaction.
    
    This endpoint:
    1. Validates the request using Pydantic
    2. Runs fraud detection checks
    3. Acquires row-level lock on the card
    4. Validates available balance
    5. Updates card balance and creates transaction
    
    Request Body:
        - card_id: UUID of the card to charge
        - amount: Transaction amount in USD
        - merchant_name: Name of the merchant
        - merchant_category: Optional MCC category
        - description: Optional transaction description
    
    Returns:
        201: Transaction created successfully
        400: Validation error
        402: Insufficient funds
        403: Card frozen or fraud detected
        404: Card not found
    """
    try:
        data = TransactionCreateRequest.model_validate(request.get_json())
    except ValidationError as e:
        return handle_validation_error(e)
    
    logger.info(f'Processing transaction request: {data.model_dump()}')
    
    result = ledger_service.process_transaction(
        card_id=data.card_id,
        amount=data.amount,
        merchant_name=data.merchant_name,
        merchant_category=data.merchant_category,
        description=data.description,
    )
    
    if not result.success:
        return jsonify({
            'error': 'TRANSACTION_FAILED',
            'message': result.error,
            'timestamp': datetime.utcnow().isoformat(),
        }), 500
    
    response = TransactionResponse.model_validate(result.transaction)
    
    return jsonify(response.model_dump(mode='json')), 201


@api_bp.route('/transactions/<uuid:transaction_id>', methods=['GET'])
def get_transaction(transaction_id: UUID):
    """
    Get transaction details by ID.
    """
    transaction = db.session.get(Transaction, transaction_id)
    
    if transaction is None:
        return jsonify({
            'error': 'TRANSACTION_NOT_FOUND',
            'message': f'Transaction {transaction_id} not found',
            'timestamp': datetime.utcnow().isoformat(),
        }), 404
    
    response = TransactionResponse.model_validate(transaction)
    
    return jsonify(response.model_dump(mode='json')), 200


@api_bp.route('/transactions', methods=['GET'])
def list_transactions():
    """
    List transactions with pagination and filtering.
    
    Query Parameters:
        - page: Page number (default: 1)
        - per_page: Items per page (default: 20, max: 100)
        - card_id: Filter by card UUID
        - status: Filter by transaction status
        - start_date: Filter by start date (ISO format)
        - end_date: Filter by end date (ISO format)
    """
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)
    card_id = request.args.get('card_id')
    status_filter = request.args.get('status')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    query = Transaction.query
    
    if card_id:
        query = query.filter(Transaction.card_id == card_id)
    
    if status_filter:
        query = query.filter(Transaction.status == status_filter)
    
    if start_date:
        query = query.filter(Transaction.created_at >= datetime.fromisoformat(start_date))
    
    if end_date:
        query = query.filter(Transaction.created_at <= datetime.fromisoformat(end_date))
    
    pagination = query.order_by(Transaction.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    transactions = [
        TransactionResponse.model_validate(t).model_dump(mode='json')
        for t in pagination.items
    ]
    
    return jsonify({
        'transactions': transactions,
        'total': pagination.total,
        'page': pagination.page,
        'per_page': pagination.per_page,
        'has_next': pagination.has_next,
        'has_prev': pagination.has_prev,
    }), 200


@api_bp.route('/cards/<uuid:card_id>/transactions', methods=['GET'])
def list_card_transactions(card_id: UUID):
    """
    List all transactions for a specific card.
    """
    card = db.session.get(Card, card_id)
    
    if card is None:
        raise CardNotFoundError(f'Card {card_id} not found')
    
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)
    
    pagination = card.transactions.order_by(Transaction.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    transactions = [
        TransactionResponse.model_validate(t).model_dump(mode='json')
        for t in pagination.items
    ]
    
    return jsonify({
        'transactions': transactions,
        'total': pagination.total,
        'page': pagination.page,
        'per_page': pagination.per_page,
        'has_next': pagination.has_next,
        'has_prev': pagination.has_prev,
    }), 200


# =============================================================================
# Receipt Upload Endpoint
# =============================================================================

def allowed_file(filename: str) -> bool:
    """Check if the file extension is allowed."""
    allowed = current_app.config.get('ALLOWED_EXTENSIONS', {'png', 'jpg', 'jpeg', 'gif', 'pdf'})
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed


@api_bp.route('/upload-receipt', methods=['POST'])
def upload_receipt():
    """
    Upload a receipt image for OCR processing.
    
    This endpoint:
    1. Accepts an image file upload
    2. Saves the file locally
    3. Optionally links to an existing transaction
    4. Triggers an async Celery task for OCR processing
    
    Form Data:
        - file: Receipt image file (required)
        - transaction_id: UUID of transaction to link (optional)
    
    Returns:
        202: Accepted - OCR task queued
        400: Invalid file or missing file
    """
    # Check if file is present
    if 'file' not in request.files:
        return jsonify({
            'error': 'NO_FILE',
            'message': 'No file provided in request',
            'timestamp': datetime.utcnow().isoformat(),
        }), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({
            'error': 'NO_FILE',
            'message': 'No file selected',
            'timestamp': datetime.utcnow().isoformat(),
        }), 400
    
    if not allowed_file(file.filename):
        return jsonify({
            'error': 'INVALID_FILE_TYPE',
            'message': f'File type not allowed. Allowed types: {current_app.config.get("ALLOWED_EXTENSIONS")}',
            'timestamp': datetime.utcnow().isoformat(),
        }), 400
    
    # Get optional transaction_id
    transaction_id = request.form.get('transaction_id')
    
    # Secure the filename and save
    filename = secure_filename(file.filename)
    timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
    unique_filename = f'{timestamp}_{filename}'
    
    upload_folder = current_app.config.get('UPLOAD_FOLDER', '/tmp/finledger/receipts')
    os.makedirs(upload_folder, exist_ok=True)
    
    file_path = os.path.join(upload_folder, unique_filename)
    file.save(file_path)
    
    logger.info(f'Receipt saved: {file_path}')
    
    # If transaction_id provided, update the transaction
    if transaction_id:
        try:
            ledger_service.update_transaction_receipt(
                transaction_id=UUID(transaction_id),
                receipt_path=file_path,
            )
        except Exception as e:
            logger.warning(f'Failed to link receipt to transaction: {e}')
    
    # Trigger async Celery task
    try:
        from worker.tasks import match_receipt
        task = match_receipt.delay(
            receipt_path=file_path,
            transaction_id=transaction_id,
        )
        task_id = task.id
        logger.info(f'OCR task queued: {task_id}')
    except Exception as e:
        # Celery not available (e.g., in development without Redis)
        logger.warning(f'Failed to queue OCR task: {e}')
        task_id = 'celery-unavailable'
    
    response = ReceiptUploadResponse(
        message='Receipt uploaded successfully. OCR processing queued.',
        task_id=task_id,
        transaction_id=UUID(transaction_id) if transaction_id else None,
        status='processing',
    )
    
    return jsonify(response.model_dump(mode='json')), 202


@api_bp.route('/receipts/status/<task_id>', methods=['GET'])
def get_receipt_status(task_id: str):
    """
    Get the status of a receipt OCR task.
    """
    try:
        from worker.celery_config import celery_app
        result = celery_app.AsyncResult(task_id)
        
        return jsonify({
            'task_id': task_id,
            'status': result.status,
            'result': result.result if result.ready() else None,
        }), 200
    except Exception as e:
        return jsonify({
            'task_id': task_id,
            'status': 'unknown',
            'error': str(e),
        }), 200

