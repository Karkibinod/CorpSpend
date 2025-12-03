"""
FinLedger Configuration Module

Environment-specific configuration classes following the Flask configuration pattern.
Sensitive values are loaded from environment variables for security.
"""

import os
from datetime import timedelta


class BaseConfig:
    """Base configuration with settings common to all environments."""
    
    # Flask core settings
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    
    # SQLAlchemy settings
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 10,
        'pool_recycle': 3600,
        'pool_pre_ping': True,  # Verify connections before use
        'isolation_level': 'READ COMMITTED',  # PostgreSQL default, works well with row locking
    }
    
    # File upload settings
    UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', '/tmp/finledger/receipts')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf'}
    
    # Celery settings
    CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0')
    CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
    
    # Fraud detection settings
    FRAUD_MAX_TRANSACTION_AMOUNT = 5000.00  # $5,000 limit
    MERCHANT_BLACKLIST = [
        'SUSPICIOUS_VENDOR_1',
        'BLACKLISTED_MERCHANT',
        'FRAUD_CORP',
        'SCAM_ENTERPRISES',
    ]


class DevelopmentConfig(BaseConfig):
    """Development environment configuration."""
    
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DATABASE_URL',
        'postgresql://finledger:finledger_dev@localhost:5432/finledger_dev'
    )
    SQLALCHEMY_ECHO = True  # Log SQL queries for debugging


class TestingConfig(BaseConfig):
    """Testing environment configuration."""
    
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'TEST_DATABASE_URL',
        'postgresql://finledger:finledger_test@localhost:5432/finledger_test'
    )
    WTF_CSRF_ENABLED = False


class ProductionConfig(BaseConfig):
    """Production environment configuration."""
    
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL')
    
    # Stricter engine options for production
    SQLALCHEMY_ENGINE_OPTIONS = {
        **BaseConfig.SQLALCHEMY_ENGINE_OPTIONS,
        'pool_size': 20,
        'max_overflow': 30,
    }

