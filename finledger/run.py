"""
FinLedger Application Entry Point

This module provides the WSGI entry point for production servers (Gunicorn)
and a development server for local testing.
"""

import os
from app import create_app

# Create the Flask application using the factory pattern
app = create_app(os.getenv('FLASK_ENV', 'development'))

if __name__ == '__main__':
    # Development server only - use Gunicorn in production
    app.run(
        host='0.0.0.0',
        port=int(os.getenv('PORT', 5000)),
        debug=app.config.get('DEBUG', False),
    )

