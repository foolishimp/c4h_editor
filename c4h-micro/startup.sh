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

# 2. Kill any processes running on our ports
echo "Freeing up ports..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:3002 | xargs kill -9 2>/dev/null || true
lsof -ti:3003 | xargs kill -9 2>/dev/null || true
lsof -ti:3004 | xargs kill -9 2>/dev/null || true

# 3. Build in correct order with verbosity for debugging
echo "🔨 Building shared package..."
npm run build:shared

echo "🔨 Building microfrontends..."
echo "Building yaml-editor..."
npm run build:yaml-editor
echo "Building config-selector..."
npm run build:config-selector
echo "Building job-management..."
npm run build:job-management
echo "Building config-editor..."
npm run build:config-editor

# 4. Start all the servers in preview mode
echo "🚀 Starting frontend servers..."

echo "Starting yaml-editor on port 3002..."
npm run preview -w packages/yaml-editor &
YAML_EDITOR_PID=$!
sleep 2

echo "Starting config-selector on port 3003..."
npm run preview -w packages/config-selector &
CONFIG_SELECTOR_PID=$!
sleep 2

echo "Starting job-management on port 3004..."
npm run preview -w packages/job-management &
JOB_MANAGEMENT_PID=$!
sleep 2

echo "Starting config-editor on port 3001..."
npm run preview -w packages/config-editor &
CONFIG_EDITOR_PID=$!
sleep 2

# 5. Wait for microfrontends to be ready and verify they're serving remoteEntry.js
echo "⏳ Waiting for microfrontends to start..."
sleep 5

# 6. Check if the remoteEntry files are accessible
echo "🔍 Checking if microfrontends are serving remoteEntry.js files..."

echo "Testing yaml-editor remoteEntry.js..."
curl -s http://localhost:3002/remoteEntry.js -o /dev/null
if [ $? -eq 0 ]; then
  echo "✅ yaml-editor: remoteEntry.js is available"
else
  echo "❌ yaml-editor: remoteEntry.js is NOT available"
fi

echo "Testing config-selector remoteEntry.js..."
curl -s http://localhost:3003/remoteEntry.js -o /dev/null
if [ $? -eq 0 ]; then
  echo "✅ config-selector: remoteEntry.js is available"
else
  echo "❌ config-selector: remoteEntry.js is NOT available"
fi

echo "Testing job-management remoteEntry.js..."
curl -s http://localhost:3004/remoteEntry.js -o /dev/null
if [ $? -eq 0 ]; then
  echo "✅ job-management: remoteEntry.js is available"
else
  echo "❌ job-management: remoteEntry.js is NOT available"
fi

echo "Testing config-editor remoteEntry.js..."
curl -s http://localhost:3001/remoteEntry.js -o /dev/null
if [ $? -eq 0 ]; then
  echo "✅ config-editor: remoteEntry.js is available"
else
  echo "❌ config-editor: remoteEntry.js is NOT available"
fi

# 7. Start shell app
echo "🚀 Starting shell app..."
npm run start -w packages/shell

# Add trap to kill background processes on script exit
cleanup() {
  echo "Shutting down servers..."
  kill $YAML_EDITOR_PID $CONFIG_SELECTOR_PID $JOB_MANAGEMENT_PID $CONFIG_EDITOR_PID 2>/dev/null || true
  exit 0
}

trap cleanup SIGINT SIGTERM EXIT