"""
CorpSpend - The Autonomous Finance Platform
Application Factory Module

This module implements the Flask Application Factory pattern, which provides:
- Clean separation of configuration from application code
- Easy testing with different configurations
- Multiple instances of the application if needed
"""

import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

# Initialize extensions outside of create_app for import accessibility
db = SQLAlchemy()
migrate = Migrate()


def create_app(config_name: str = None) -> Flask:
    """
    Application Factory function that creates and configures the Flask application.
    
    Args:
        config_name: Configuration environment ('development', 'testing', 'production')
    
    Returns:
        Configured Flask application instance
    """
    app = Flask(__name__)
    
    # Load configuration based on environment
    config_name = config_name or os.getenv('FLASK_ENV', 'development')
    app.config.from_object(f'app.config.{config_name.capitalize()}Config')
    
    # Initialize extensions with app context
    db.init_app(app)
    migrate.init_app(app, db)
    
    # Register blueprints
    from app.routes import api_bp
    app.register_blueprint(api_bp, url_prefix='/api/v1')
    
    # Health check endpoint
    @app.route('/health')
    def health_check():
        return {'status': 'healthy', 'service': 'corpspend-api'}, 200
    
    # Create database tables (for development convenience)
    with app.app_context():
        db.create_all()
    
    return app

