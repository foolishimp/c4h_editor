#!/bin/bash
# File: startup-fixed.sh
# A script to correctly start the C4H Editor frontend with an existing backend

# This script assumes it's being run from the c4h-micro directory
# where the package.json with workspaces is located

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: This script must be run from the c4h-micro directory"
  echo "Current directory: $(pwd)"
  exit 1
fi

# 1. Clean previous builds
echo "🧹 Cleaning previous builds..."
npm run clean || echo "Clean failed, continuing anyway..."

# 2. Build in correct order
echo "🔨 Building shared package..."
npm run build:shared

echo "🔨 Building microfrontends..."
npm run build:yaml-editor
npm run build:config-selector
npm run build:job-management
npm run build:config-editor

# 3. Check if the backend is running
echo "🔍 Checking if backend is already running..."
if curl -s http://localhost:8000/health > /dev/null; then
  echo "✅ Backend is already running"
else
  echo "⚠️ Backend doesn't seem to be running at http://localhost:8000"
  echo "   Please start the backend separately before continuing"
  echo "   You can start it with: cd ../backend && python -m uvicorn main:app --reload --port 8000"
  read -p "Press Enter to continue anyway or Ctrl+C to abort..." 
fi

# 4. Start frontend servers in preview mode
echo "🚀 Starting frontend servers..."

# Kill any processes running on our ports
echo "Freeing up ports..."
lsof -ti:3002 | xargs kill -9 2>/dev/null || true
lsof -ti:3003 | xargs kill -9 2>/dev/null || true
lsof -ti:3004 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Start all the servers
echo "Starting yarn-editor on port 3002..."
npm run preview -w packages/yaml-editor &
YAML_EDITOR_PID=$!

echo "Starting config-selector on port 3003..."
npm run preview -w packages/config-selector &
CONFIG_SELECTOR_PID=$!

echo "Starting job-management on port 3004..."
npm run preview -w packages/job-management &
JOB_MANAGEMENT_PID=$!

echo "Starting config-editor on port 3001..."
npm run preview -w packages/config-editor &
CONFIG_EDITOR_PID=$!

# 5. Wait for microfrontends to be ready and verify they're serving remoteEntry.js
echo "⏳ Waiting for microfrontends to start..."
sleep 5

# Check if the remoteEntry files are accessible
echo "🔍 Checking if microfrontends are serving remoteEntry.js files..."
curl -s http://localhost:3002/remoteEntry.js -o /dev/null && 
  echo "✅ yaml-editor: remoteEntry.js is available" || 
  echo "❌ yaml-editor: remoteEntry.js is NOT available"

curl -s http://localhost:3003/remoteEntry.js -o /dev/null && 
  echo "✅ config-selector: remoteEntry.js is available" || 
  echo "❌ config-selector: remoteEntry.js is NOT available" 

curl -s http://localhost:3004/remoteEntry.js -o /dev/null && 
  echo "✅ job-management: remoteEntry.js is available" || 
  echo "❌ job-management: remoteEntry.js is NOT available"

# 6. Start shell app
echo "🚀 Starting shell app..."
npm run start -w packages/shell

# Add trap to kill background processes on script exit
cleanup() {
  echo "Shutting down servers..."
  kill $YAML_EDITOR_PID $CONFIG_SELECTOR_PID $JOB_MANAGEMENT_PID $CONFIG_EDITOR_PID 2>/dev/null || true
  exit 0
}

trap cleanup SIGINT SIGTERM EXIT