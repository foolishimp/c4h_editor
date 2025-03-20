#!/bin/bash
# File: c4h-micro/startup.sh
# This script rebuilds and starts all packages with proper dependency order

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

# 3. Build shared package first
echo "🔨 Building shared package..."
npm run build:shared
if [ $? -ne 0 ]; then
  echo "❌ Failed to build shared package. Exiting."
  exit 1
fi
echo "✅ Shared package built successfully"

# 4. Build all microfrontends in proper order
echo "🔨 Building YAML Editor..."
npm run build:yaml-editor
if [ $? -ne 0 ]; then
  echo "❌ Failed to build YAML Editor. Exiting."
  exit 1
fi
echo "✅ YAML Editor built successfully"

echo "🔨 Building Config Selector..."
npm run build:config-selector
if [ $? -ne 0 ]; then
  echo "❌ Failed to build Config Selector. Exiting."
  exit 1
fi
echo "✅ Config Selector built successfully"

echo "🔨 Building Job Management..."
npm run build:job-management
if [ $? -ne 0 ]; then
  echo "❌ Failed to build Job Management. Exiting."
  exit 1
fi
echo "✅ Job Management built successfully"

echo "🔨 Building Config Editor..."
npm run build:config-editor
if [ $? -ne 0 ]; then
  echo "❌ Failed to build Config Editor. Exiting."
  exit 1
fi
echo "✅ Config Editor built successfully"

echo "🔨 Building Shell (last)..."
npm run build:shell
if [ $? -ne 0 ]; then
  echo "❌ Failed to build Shell. Exiting."
  exit 1
fi
echo "✅ Shell built successfully"

# 5. Run all in preview mode for consistent environment
echo "🚀 Starting all in preview mode..."
echo "Starting preview servers for microfrontends..."

# Start all preview servers - using absolute paths from project root
ROOT_DIR=$(pwd)

# Start YAML Editor
echo "Starting YAML Editor..."
cd "$ROOT_DIR/packages/yaml-editor" && npm run preview &
YAML_PID=$!
echo "Started YAML Editor preview server (PID: $YAML_PID)"

# Start Config Selector
echo "Starting Config Selector..."
cd "$ROOT_DIR/packages/config-selector" && npm run preview &
CONFIG_SELECTOR_PID=$!
echo "Started Config Selector preview server (PID: $CONFIG_SELECTOR_PID)"

# Start Job Management
echo "Starting Job Management..."
cd "$ROOT_DIR/packages/job-management" && npm run preview &
JOB_MANAGEMENT_PID=$!
echo "Started Job Management preview server (PID: $JOB_MANAGEMENT_PID)"

# Start Config Editor
echo "Starting Config Editor..."
cd "$ROOT_DIR/packages/config-editor" && npm run preview &
CONFIG_EDITOR_PID=$!
echo "Started Config Editor preview server (PID: $CONFIG_EDITOR_PID)"

# Wait for all microfrontends to be available before starting shell
echo "Waiting for all microfrontends to be available..."
sleep 5

# Start shell in foreground
echo "Starting Shell preview server..."
cd "$ROOT_DIR/packages/shell" && npm run preview

# This will only execute when shell is terminated
echo "Shell terminated. Cleaning up microfrontend processes..."
kill $YAML_PID $CONFIG_SELECTOR_PID $JOB_MANAGEMENT_PID $CONFIG_EDITOR_PID
echo "All processes terminated."