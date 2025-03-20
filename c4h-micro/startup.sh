#!/bin/bash
# File: c4h-micro/startup-enhanced.sh
# An enhanced script to correctly start the C4H Editor frontend with proper build and verification

# This script assumes it's being run from the c4h-micro directory
# where the package.json with workspaces is located

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: This script must be run from the c4h-micro directory"
  echo "Current directory: $(pwd)"
  exit 1
fi

# Print header
echo "🚀 C4H Editor Microfrontend Startup"
echo "===================================="
echo

# 1. Clean previous builds and kill processes
echo "🧹 Cleaning environment..."
npm run clean 2>/dev/null || echo "Clean command failed, continuing anyway..."

echo "📋 Freeing up ports..."
for port in 3000 3001 3002 3003 3004; do
  if lsof -ti:$port > /dev/null; then
    echo "  - Killing process on port $port"
    lsof -ti:$port | xargs kill -9 2>/dev/null
  else
    echo "  - Port $port is free"
  fi
done
echo

# 2. Install dependencies if needed
if [ ! -d "node_modules" ] || [ ! -d "packages/shared/node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
  echo
fi

# 3. Build in correct order with proper verification
echo "🔨 Building packages in sequential order..."

echo "📦 Building shared package..."
npm run build:shared
if [ $? -ne 0 ]; then
  echo "❌ Failed to build shared package. Exiting."
  exit 1
fi
echo "✅ Shared package built successfully"
echo

# Build each microfrontend with verification
for package in yaml-editor config-selector job-management config-editor; do
  echo "📦 Building $package..."
  npm run build:$package
  
  if [ $? -ne 0 ]; then
    echo "❌ Failed to build $package. Exiting."
    exit 1
  fi
  
  echo "✅ $package built successfully"
  echo
done

# 4. Start all servers in the correct order
echo "🚀 Starting servers..."

# Start with yaml-editor since it's used by other microfrontends
echo "🚀 Starting yaml-editor on port 3002..."
npm run preview -w packages/yaml-editor &
YAML_EDITOR_PID=$!
sleep 2

# Check if yaml-editor is running correctly
echo "🔍 Verifying yaml-editor is accessible..."
curl -s http://localhost:3002/remoteEntry.js -o /dev/null
if [ $? -eq 0 ]; then
  echo "✅ yaml-editor: remoteEntry.js is available"
else
  echo "❌ yaml-editor: remoteEntry.js is NOT available"
  echo "Troubleshooting: Attempting to restart yaml-editor..."
  kill $YAML_EDITOR_PID 2>/dev/null
  npm run preview -w packages/yaml-editor &
  YAML_EDITOR_PID=$!
  sleep 3
  curl -s http://localhost:3002/remoteEntry.js -o /dev/null
  if [ $? -eq 0 ]; then
    echo "✅ yaml-editor: Successfully restarted"
  else
    echo "❌ yaml-editor is still not available. Please check logs."
  fi
fi

# Start config-selector (depends on yaml-editor)
echo "🚀 Starting config-selector on port 3003..."
npm run preview -w packages/config-selector &
CONFIG_SELECTOR_PID=$!
sleep 2

echo "🔍 Verifying config-selector is accessible..."
curl -s http://localhost:3003/remoteEntry.js -o /dev/null
if [ $? -eq 0 ]; then
  echo "✅ config-selector: remoteEntry.js is available"
else
  echo "❌ config-selector: remoteEntry.js is NOT available"
  echo "Troubleshooting: Attempting to restart config-selector..."
  kill $CONFIG_SELECTOR_PID 2>/dev/null
  npm run preview -w packages/config-selector &
  CONFIG_SELECTOR_PID=$!
  sleep 3
  curl -s http://localhost:3003/remoteEntry.js -o /dev/null
  if [ $? -eq 0 ]; then
    echo "✅ config-selector: Successfully restarted"
  else
    echo "❌ config-selector is still not available. Please check logs."
  fi
fi

# Start job-management
echo "🚀 Starting job-management on port 3004..."
npm run preview -w packages/job-management &
JOB_MANAGEMENT_PID=$!
sleep 2

echo "🔍 Verifying job-management is accessible..."
curl -s http://localhost:3004/remoteEntry.js -o /dev/null
if [ $? -eq 0 ]; then
  echo "✅ job-management: remoteEntry.js is available"
else
  echo "❌ job-management: remoteEntry.js is NOT available"
  echo "Troubleshooting: Attempting to restart job-management..."
  kill $JOB_MANAGEMENT_PID 2>/dev/null
  npm run preview -w packages/job-management &
  JOB_MANAGEMENT_PID=$!
  sleep 3
  curl -s http://localhost:3004/remoteEntry.js -o /dev/null
  if [ $? -eq 0 ]; then
    echo "✅ job-management: Successfully restarted"
  else
    echo "❌ job-management is still not available. Please check logs."
  fi
fi

# Start config-editor
echo "🚀 Starting config-editor on port 3001..."
npm run preview -w packages/config-editor &
CONFIG_EDITOR_PID=$!
sleep 2

echo "🔍 Verifying config-editor is accessible..."
curl -s http://localhost:3001/remoteEntry.js -o /dev/null
if [ $? -eq 0 ]; then
  echo "✅ config-editor: remoteEntry.js is available"
else
  echo "❌ config-editor: remoteEntry.js is NOT available"
  echo "Troubleshooting: Attempting to restart config-editor..."
  kill $CONFIG_EDITOR_PID 2>/dev/null
  npm run preview -w packages/config-editor &
  CONFIG_EDITOR_PID=$!
  sleep 3
  curl -s http://localhost:3001/remoteEntry.js -o /dev/null
  if [ $? -eq 0 ]; then
    echo "✅ config-editor: Successfully restarted"
  else
    echo "❌ config-editor is still not available. Please check logs."
  fi
fi

# Final verification of all services
echo
echo "🔍 Performing final verification of all services..."
curl -s http://localhost:3001/remoteEntry.js -o /dev/null && \
curl -s http://localhost:3002/remoteEntry.js -o /dev/null && \
curl -s http://localhost:3003/remoteEntry.js -o /dev/null && \
curl -s http://localhost:3004/remoteEntry.js -o /dev/null
if [ $? -eq 0 ]; then
  echo "✅ All microfrontends are accessible"
else
  echo "⚠️  Not all microfrontends are accessible. The application may not work correctly."
fi

# 5. Start shell app
echo
echo "🚀 Starting shell app..."
echo "Starting development server on port 3000..."
npm run start -w packages/shell

# Add trap to kill background processes on script exit
cleanup() {
  echo
  echo "Shutting down servers..."
  kill $YAML_EDITOR_PID $CONFIG_SELECTOR_PID $JOB_MANAGEMENT_PID $CONFIG_EDITOR_PID 2>/dev/null || true
  exit 0
}

trap cleanup SIGINT SIGTERM EXIT