#!/bin/bash
set -e

echo "🚀 Starting build process..."

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Build React app
echo "🔨 Building React app..."
if npm run build; then
    echo "✅ React app built successfully"
else
    echo "⚠️  React build failed, continuing with Flask only"
fi

# Install Python dependencies
echo "🐍 Installing Python dependencies..."
pip install -r requirements.txt

# Start Flask app
echo "🌐 Starting Flask app..."
python app.py 