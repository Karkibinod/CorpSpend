"""
FinLedger API Routes

RESTful API endpoints for the Corporate Spend Management Platform.
All endpoints use Pydantic for request validation and response serialization.
"""

import os
from decimal import Decimal
from uuid import UUID, uuid4
from datetime import datetime
import logging
import httpx

from flask import Blueprint, request, jsonify, current_app
from pydantic import ValidationError
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash

from app import db
from app.models import Card, Transaction, TransactionStatus, User
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

# Ollama configuration for Llama 3.2
OLLAMA_URL = os.getenv('OLLAMA_URL', 'http://host.docker.internal:11434')

def init_test_user():
    """Initialize test user in database if it doesn't exist."""
    test_email = os.getenv('TEST_USER_EMAIL', 'admin@corpspend.io').lower()
    test_password = os.getenv('TEST_USER_PASSWORD', 'admin123')
    test_name = os.getenv('TEST_USER_NAME', 'Admin User')
    
    # Check if test user exists
    existing_user = User.query.filter_by(email=test_email).first()
    if not existing_user:
        user = User(
            email=test_email,
            password_hash=generate_password_hash(test_password),
            name=test_name,
            role='admin'
        )
        db.session.add(user)
        try:
            db.session.commit()
            logger.info(f'Test user created: {test_email}')
        except Exception as e:
            db.session.rollback()
            logger.warning(f'Could not create test user: {e}')

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


# =============================================================================
# Authentication Endpoints
# =============================================================================

@api_bp.route('/auth/login', methods=['POST'])
def login():
    """
    Authenticate a user and return user data.
    
    Request Body:
        - email: User email
        - password: User password
    
    Returns:
        200: User data with session info
        401: Invalid credentials
    """
    # Initialize test user on first request
    init_test_user()
    
    data = request.get_json()
    email = data.get('email', '').lower().strip()
    password = data.get('password', '')
    
    # Find user in database
    user = User.query.filter_by(email=email).first()
    
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({
            'error': 'INVALID_CREDENTIALS',
            'message': 'Invalid email or password',
            'timestamp': datetime.utcnow().isoformat(),
        }), 401
    
    logger.info(f'User logged in: {email}')
    
    # Return user data (excluding password)
    return jsonify({
        'user': {
            'id': str(user.id),
            'email': user.email,
            'name': user.name,
            'role': user.role,
        },
        'message': 'Login successful',
    }), 200


@api_bp.route('/auth/signup', methods=['POST'])
def signup():
    """
    Register a new user.
    
    Request Body:
        - name: User's full name
        - email: User email
        - password: User password
    
    Returns:
        201: User created successfully
        400: Validation error
        409: Email already exists
    """
    data = request.get_json()
    name = data.get('name', '').strip()
    email = data.get('email', '').lower().strip()
    password = data.get('password', '')
    
    # Validation
    if not name:
        return jsonify({
            'error': 'VALIDATION_ERROR',
            'message': 'Name is required',
            'timestamp': datetime.utcnow().isoformat(),
        }), 400
    
    if not email or '@' not in email:
        return jsonify({
            'error': 'VALIDATION_ERROR',
            'message': 'Valid email is required',
            'timestamp': datetime.utcnow().isoformat(),
        }), 400
    
    if len(password) < 6:
        return jsonify({
            'error': 'VALIDATION_ERROR',
            'message': 'Password must be at least 6 characters',
            'timestamp': datetime.utcnow().isoformat(),
        }), 400
    
    # Check if email already exists in database
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({
            'error': 'EMAIL_EXISTS',
            'message': 'An account with this email already exists',
            'timestamp': datetime.utcnow().isoformat(),
        }), 409
    
    # Create new user in database with hashed password
    new_user = User(
        email=email,
        password_hash=generate_password_hash(password),
        name=name,
        role='user'
    )
    
    db.session.add(new_user)
    try:
        db.session.commit()
        logger.info(f'New user registered: {email}')
        
        return jsonify({
            'message': 'Account created successfully',
            'user': {
                'id': str(new_user.id),
                'email': new_user.email,
                'name': new_user.name,
                'role': new_user.role,
            },
        }), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f'Error creating user: {e}')
        return jsonify({
            'error': 'SERVER_ERROR',
            'message': 'Failed to create account. Please try again.',
            'timestamp': datetime.utcnow().isoformat(),
        }), 500


@api_bp.route('/auth/logout', methods=['POST'])
def logout():
    """
    Log out the current user.
    """
    return jsonify({
        'message': 'Logout successful',
    }), 200


# =============================================================================
# Chatbot Endpoint (Groq / Ollama / Smart Fallback)
# =============================================================================

# Groq API configuration
GROQ_API_KEY = os.getenv('GROQ_API_KEY', '')

# Smart fallback responses for common questions - conversational style
FALLBACK_RESPONSES = {
    'card': "Great question! 💳 Creating a card is super easy. Just head over to the Cards section in your sidebar, hit that 'Issue New Card' button, and fill in the cardholder's name along with their spending limit. The card goes live instantly!\n\nYou can track each card's balance and spending right from there. Need to set up a card with specific limits? I can walk you through that too!",
    
    'transaction': "So you want to know about transactions! 💸 Here's the deal - every transaction you create goes through our fraud detection automatically (pretty cool, right?). Just head to Transactions, create a new one with the card ID, amount, and merchant name.\n\nHeads up though - anything over $5,000 gets blocked automatically, and we also keep an eye out for any sketchy merchants. Want me to explain how the fraud detection works?",
    
    'fraud': "Ah, fraud protection - this is where the magic happens! 🛡️ We've got your back with automatic blocking for any transactions over $5,000. We also maintain a blacklist of suspicious merchants that gets checked in real-time.\n\nIf someone tries to make too many transactions too quickly (like more than 10 per minute), we flag that too. You can customize all these rules in Settings under Fraud Protection. Pretty neat, huh?",
    
    'receipt': "Receipt upload is honestly one of my favorite features! 📸 Just drag and drop your receipt image onto the Receipts page (we handle JPG, PNG, GIF, and even PDF). Our OCR tech then pulls out the merchant name, amount, and date automatically.\n\nThe best part? If we're 80% confident or more about a match, it links up with your transaction automatically. Lower confidence ones just get flagged for you to review. Easy peasy!",
    
    'dashboard': "Your Dashboard is basically your command center! 📊 You'll see your total spending across all cards right at the top, along with how many cards are active. There's a nice weekly trend chart showing your spending patterns.\n\nI personally love the recent transactions list at the bottom - super handy for quick checks. Any transactions that need your attention (like flagged ones) pop right up too!",
    
    'help': "Hey, I'm here to help with anything CorpSpend! 🙌 Whether you need to set up cards, understand a transaction status, figure out why something got flagged, or upload receipts - just ask!\n\nI can also help you configure fraud rules or navigate around the platform. What's on your mind?",
    
    'default': "Hey! 👋 I'm your CorpSpend assistant. I know this platform inside and out - from issuing cards and processing transactions to setting up fraud rules and handling receipts.\n\nJust tell me what you're trying to do, and I'll point you in the right direction. No question is too simple!"
}

def get_smart_fallback(message: str) -> str:
    """Get a smart fallback response based on keywords in the message."""
    message_lower = message.lower()
    
    # Greetings
    if any(word in message_lower for word in ['hi', 'hello', 'hey', 'good morning', 'good afternoon']):
        return "Hey there! 👋 Great to hear from you. I'm ready to help with anything CorpSpend related. What can I do for you today?"
    
    # Thank you responses
    if any(word in message_lower for word in ['thank', 'thanks', 'appreciate']):
        return "You're welcome! 😊 Always happy to help. Let me know if anything else comes up!"
    
    # Card related
    if any(word in message_lower for word in ['card', 'issue', 'create card', 'new card', 'spending limit', 'corporate card']):
        return FALLBACK_RESPONSES['card']
    
    # Transaction related
    elif any(word in message_lower for word in ['transaction', 'payment', 'charge', 'spend', 'purchase', 'buy']):
        return FALLBACK_RESPONSES['transaction']
    
    # Fraud/Security related
    elif any(word in message_lower for word in ['fraud', 'security', 'block', 'blacklist', 'detect', 'suspicious', 'flag', 'declined']):
        return FALLBACK_RESPONSES['fraud']
    
    # Receipt/OCR related
    elif any(word in message_lower for word in ['receipt', 'ocr', 'upload', 'scan', 'image', 'photo', 'picture']):
        return FALLBACK_RESPONSES['receipt']
    
    # Dashboard related
    elif any(word in message_lower for word in ['dashboard', 'overview', 'stats', 'metrics', 'summary', 'report']):
        return FALLBACK_RESPONSES['dashboard']
    
    # Settings related
    elif any(word in message_lower for word in ['setting', 'config', 'preference', 'customize']):
        return "Settings is where you can really make CorpSpend your own! ⚙️ Head over there from the sidebar and you'll find tabs for fraud protection rules, notification preferences, card policies, and even appearance options like dark/light mode.\n\nIs there a specific setting you're looking to change?"
    
    # Help/general questions
    elif any(word in message_lower for word in ['help', 'how', 'what', 'feature', 'can you', 'explain', 'tell me']):
        return FALLBACK_RESPONSES['help']
    
    else:
        return FALLBACK_RESPONSES['default']


def chat_with_groq(messages: list) -> str | None:
    """Try to get response from Groq API."""
    if not GROQ_API_KEY:
        return None
    
    try:
        from groq import Groq
        client = Groq(api_key=GROQ_API_KEY)
        
        chat_completion = client.chat.completions.create(
            messages=messages,
            model="llama-3.1-8b-instant",  # Fast and free
            temperature=0.7,
            max_tokens=1024,
        )
        
        return chat_completion.choices[0].message.content
    except Exception as e:
        logger.warning(f'Groq API error: {e}')
        return None


def chat_with_ollama(messages: list) -> str | None:
    """Try to get response from Ollama."""
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                f'{OLLAMA_URL}/api/chat',
                json={
                    'model': 'llama3.2',
                    'messages': messages,
                    'stream': False,
                },
            )
            
            if response.status_code == 200:
                result = response.json()
                return result.get('message', {}).get('content', '')
    except Exception as e:
        logger.warning(f'Ollama error: {e}')
    
    return None


@api_bp.route('/chat', methods=['POST'])
def chat():
    """
    Chat with AI assistant. Tries multiple backends:
    1. Groq API (if GROQ_API_KEY is set)
    2. Ollama (if running locally)
    3. Smart fallback responses
    
    Request Body:
        - message: User message
        - context: System context for the AI
        - history: Chat history (optional)
    
    Returns:
        200: AI response
    """
    data = request.get_json()
    user_message = data.get('message', '')
    system_context = data.get('context', '')
    history = data.get('history', [])
    
    if not user_message:
        return jsonify({
            'error': 'MISSING_MESSAGE',
            'message': 'Message is required',
            'timestamp': datetime.utcnow().isoformat(),
        }), 400
    
    # Build messages array
    messages = []
    
    if system_context:
        messages.append({
            'role': 'system',
            'content': system_context,
        })
    
    for msg in history:
        messages.append({
            'role': msg.get('role', 'user'),
            'content': msg.get('content', ''),
        })
    
    messages.append({
        'role': 'user',
        'content': user_message,
    })
    
    # Try Groq first (fastest, if API key available)
    response_text = chat_with_groq(messages)
    if response_text:
        return jsonify({
            'response': response_text,
            'model': 'groq/llama-3.1-8b',
        }), 200
    
    # Try Ollama next
    response_text = chat_with_ollama(messages)
    if response_text:
        return jsonify({
            'response': response_text,
            'model': 'ollama/llama3.2',
        }), 200
    
    # Fall back to smart responses
    fallback_response = get_smart_fallback(user_message)
    return jsonify({
        'response': fallback_response,
        'model': 'smart-fallback',
        'note': 'Using built-in responses. For AI-powered chat, set GROQ_API_KEY or run Ollama.',
    }), 200

