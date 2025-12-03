#!/usr/bin/env bash
# =============================================================================
# CorpSpend Build Script for Render Deployment
# =============================================================================

set -o errexit  # Exit on error

echo "📦 Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "🗄️ Running database migrations..."
# flask db upgrade || echo "No migrations to run"

echo "✅ Build complete!"

