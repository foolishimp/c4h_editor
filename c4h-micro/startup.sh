#!/bin/bash
# File: c4h-micro/fix-startup.sh
# A simplified fix script to properly start the C4H Editor microfrontends

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
for port in 3000 3001 3002 3003 3004; do
  if lsof -ti:$port > /dev/null; then
    echo "  - Killing process on port $port"
    lsof -ti:$port | xargs kill -9 2>/dev/null
  else
    echo "  - Port $port is free"
  fi
done

# 3. Build in correct order with verbosity for debugging
echo "🔨 Building shared package..."
npm run build:shared

echo "🔨 Building microfrontends..."
# Build them all in parallel for speed
echo "Building yaml-editor..."
npm run build:yaml-editor &
YAML_PID=$!

echo "Building config-selector..."
npm run build:config-selector &
CONFIG_PID=$!

echo "Building job-management..."
npm run build:job-management &
JOB_PID=$!

echo "Building config-editor..."
npm run build:config-editor &
EDITOR_PID=$!

# Wait for all builds to complete
wait $YAML_PID $CONFIG_PID $JOB_PID $EDITOR_PID
echo "All builds completed!"

# 4. Start all the servers in preview mode
echo "🚀 Starting frontend servers..."

# Start each service and verify it's running
start_and_verify() {
  local name=$1
  local port=$2
  
  echo "Starting $name on port $port..."
  npm run preview -w packages/$name &
  local PID=$!
  echo "${name}_PID=$PID"
  
  # Wait for the service to be ready
  echo "Waiting for $name to start..."
  local attempts=0
  while [ $attempts -lt 10 ]; do
    sleep 1
    attempts=$((attempts+1))
    
    if curl -s "http://localhost:$port/remoteEntry.js" -o /dev/null; then
      echo "✅ $name is running at http://localhost:$port/remoteEntry.js"
      return 0
    else
      echo "Attempt $attempts: $name not ready yet"
    fi
  done
  
  echo "❌ Failed to start $name after $attempts attempts"
  return 1
}

# Start services in the right order - first yaml-editor which is used by config-selector
start_and_verify "yaml-editor" 3002
YAML_EDITOR_PID=$!

start_and_verify "config-selector" 3003
CONFIG_SELECTOR_PID=$!

start_and_verify "job-management" 3004
JOB_MANAGEMENT_PID=$!

start_and_verify "config-editor" 3001
CONFIG_EDITOR_PID=$!

# Final verification
echo "🔍 Verifying all services are running..."
curl -s http://localhost:3001/remoteEntry.js -o /dev/null && \
curl -s http://localhost:3002/remoteEntry.js -o /dev/null && \
curl -s http://localhost:3003/remoteEntry.js -o /dev/null && \
curl -s http://localhost:3004/remoteEntry.js -o /dev/null
if [ $? -eq 0 ]; then
  echo "✅ All microfrontends are accessible! Starting shell application..."
else
  echo "⚠️ Not all microfrontends are accessible. Please check the logs."
  exit 1
fi

# 5. Start shell app
echo "🚀 Starting shell app..."
npm run start -w packages/shell

# Add trap to kill background processes on script exit
cleanup() {
  echo "Shutting down servers..."
  kill $YAML_EDITOR_PID $CONFIG_SELECTOR_PID $JOB_MANAGEMENT_PID $CONFIG_EDITOR_PID 2>/dev/null || true
  exit 0
}

trap cleanup SIGINT SIGTERM EXIT