#!/bin/bash
# File: c4h-micro/rebuild-all.sh
# This script rebuilds all packages after updating Vite configurations

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

# 4. Build YAML Editor (needed by config-selector)
echo "🔨 Building YAML Editor..."
npm run build:yaml-editor
if [ $? -ne 0 ]; then
  echo "❌ Failed to build YAML Editor. Exiting."
  exit 1
fi
echo "✅ YAML Editor built successfully"

# 5. Build remaining microfrontends
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

echo "🔨 Building Shell..."
npm run build:shell
if [ $? -ne 0 ]; then
  echo "❌ Failed to build Shell. Exiting."
  exit 1
fi
echo "✅ Shell built successfully"

echo "🎉 All packages have been successfully rebuilt!"
echo "Run ./startup.sh to start the application"

# 6. Start all servers
echo "🚀 Starting all servers..."
npm run start