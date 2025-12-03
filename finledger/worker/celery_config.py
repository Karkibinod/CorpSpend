"""
FinLedger Celery Configuration

Celery 5+ configuration for async task processing.
Uses Redis as both broker and result backend.
"""

import os
from celery import Celery
from kombu import Queue


# Redis connection settings from environment
REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = os.getenv('REDIS_PORT', '6379')
REDIS_DB = os.getenv('REDIS_DB', '0')

BROKER_URL = os.getenv('CELERY_BROKER_URL', f'redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}')
RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', f'redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}')


def make_celery(app_name: str = 'finledger') -> Celery:
    """
    Create and configure a Celery application instance.
    
    Args:
        app_name: Name of the Celery application
    
    Returns:
        Configured Celery instance
    """
    celery = Celery(
        app_name,
        broker=BROKER_URL,
        backend=RESULT_BACKEND,
        include=['worker.tasks'],  # Auto-discover tasks
    )
    
    # Celery configuration
    celery.conf.update(
        # Task execution settings
        task_serializer='json',
        accept_content=['json'],
        result_serializer='json',
        timezone='UTC',
        enable_utc=True,
        
        # Task behavior
        task_track_started=True,
        task_time_limit=300,  # 5 minutes max per task
        task_soft_time_limit=240,  # Soft limit for graceful shutdown
        
        # Worker settings
        worker_prefetch_multiplier=1,  # Fair task distribution
        worker_concurrency=4,  # Number of worker processes
        
        # Result backend settings
        result_expires=3600,  # Results expire after 1 hour
        result_extended=True,  # Store additional task metadata
        
        # Task routing (optional queue separation)
        task_queues=(
            Queue('default', routing_key='default'),
            Queue('ocr', routing_key='ocr'),  # Dedicated queue for OCR tasks
            Queue('reports', routing_key='reports'),  # Queue for reporting tasks
        ),
        task_default_queue='default',
        task_default_exchange='finledger',
        task_default_routing_key='default',
        
        # Task routing rules
        task_routes={
            'worker.tasks.match_receipt': {'queue': 'ocr'},
            'worker.tasks.generate_report': {'queue': 'reports'},
        },
        
        # Retry settings
        task_acks_late=True,  # Acknowledge after completion
        task_reject_on_worker_lost=True,  # Re-queue on worker death
        
        # Security
        broker_connection_retry_on_startup=True,
    )
    
    return celery


# Create the Celery application instance
celery_app = make_celery()


class CeleryContextTask(celery_app.Task):
    """
    Abstract base task that provides Flask app context.
    
    This ensures that Celery tasks have access to Flask extensions
    like SQLAlchemy when they need to interact with the database.
    """
    abstract = True
    _flask_app = None
    
    @property
    def flask_app(self):
        """Lazy-load Flask app to avoid circular imports."""
        if self._flask_app is None:
            from app import create_app
            self._flask_app = create_app()
        return self._flask_app
    
    def __call__(self, *args, **kwargs):
        """Execute task within Flask app context."""
        with self.flask_app.app_context():
            return super().__call__(*args, **kwargs)


# Set our context task as the default
celery_app.Task = CeleryContextTask

