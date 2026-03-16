#!/bin/bash

echo "🚀 Starting MongoDB Docker container for Erogram v2..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install docker-compose first."
    exit 1
fi

# Change to project directory
cd "$(dirname "$0")/.."

# Start the container
echo "📦 Starting MongoDB..."
docker-compose up -d

# Wait for MongoDB to be ready
echo "⏳ Waiting for MongoDB to be ready..."
sleep 5

# Check if container is running
if docker ps | grep -q erogram-mongodb; then
    echo "✅ MongoDB is running!"
    echo ""
    echo "Connection details:"
    echo "  Host: localhost:27017"
    echo "  Database: erogram"
    echo "  Username: admin"
    echo "  Password: M4nS1kka"
    echo ""
    echo "Connection string:"
    echo "mongodb://admin:M4nS1kka@127.0.0.1:27017/erogram?authSource=admin"
    echo ""
    echo "To view logs: docker logs erogram-mongodb"
    echo "To stop: docker-compose down"
    echo "To access shell: docker exec -it erogram-mongodb mongosh -u admin -p M4nS1kka --authenticationDatabase admin"
else
    echo "❌ Failed to start MongoDB. Check logs with: docker logs erogram-mongodb"
    exit 1
fi

