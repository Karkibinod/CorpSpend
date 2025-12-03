-- FinLedger Database Initialization Script
-- This script runs when PostgreSQL container starts for the first time

-- Enable UUID extension (required for UUID primary keys)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create advisory lock functions for additional locking patterns (optional)
-- These can be used for distributed locking scenarios beyond row-level locks

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE finledger TO finledger;

-- Create schema if needed
-- CREATE SCHEMA IF NOT EXISTS finledger;
-- ALTER USER finledger SET search_path = finledger, public;

-- Note: Tables are created by SQLAlchemy/Flask-Migrate
-- This script is for database-level configuration only

