#!/bin/bash
# File: c4h-micro/startup.sh
# This script rebuilds all packages with enhanced error handling

# This script assumes it's being run from the c4h-micro directory
# where the package.json with workspaces is located

# Store the root directory
ROOT_DIR=$(pwd)

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: This script must be run from the c4h-micro directory"
  echo "Current directory: $(pwd)"
  exit 1
fi

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check port availability
check_port() {
  local port=$1
  if lsof -ti:$port > /dev/null; then
    echo -e "${YELLOW}⚠️ Port $port is in use${NC}"
    read -p "Would you like to kill the process using port $port? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      lsof -ti:$port | xargs kill -9 2>/dev/null
      echo -e "${GREEN}✅ Process killed${NC}"
    else
      echo -e "${RED}❌ Cannot continue with port $port in use${NC}"
      exit 1
    fi
  else
    echo -e "${GREEN}✅ Port $port is free${NC}"
  fi
}

# 1. Clean previous builds
echo -e "${YELLOW}🧹 Cleaning previous builds...${NC}"
npm run clean || echo "Clean failed, continuing anyway..."

# 2. Check and free up ports
echo -e "${YELLOW}Checking ports...${NC}"
for port in 3000 3001 3002 3003 3004; do
  check_port $port
done

# 3. Build shared package first
echo -e "${YELLOW}🔨 Building shared package...${NC}"
npm run build:shared
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to build shared package. Exiting.${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Shared package built successfully${NC}"

# 4. Build YAML Editor (needed by config-selector)
echo -e "${YELLOW}🔨 Building YAML Editor...${NC}"
npm run build:yaml-editor
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to build YAML Editor. Exiting.${NC}"
  exit 1
fi
echo -e "${GREEN}✅ YAML Editor built successfully${NC}"

# 5. Build remaining microfrontends
echo -e "${YELLOW}🔨 Building Config Selector...${NC}"
npm run build:config-selector
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to build Config Selector. Exiting.${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Config Selector built successfully${NC}"

echo -e "${YELLOW}🔨 Building Job Management...${NC}"
npm run build:job-management
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to build Job Management. Exiting.${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Job Management built successfully${NC}"

echo -e "${YELLOW}🔨 Building Config Editor...${NC}"
npm run build:config-editor
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to build Config Editor. Exiting.${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Config Editor built successfully${NC}"

echo -e "${YELLOW}🔨 Building Shell...${NC}"
npm run build:shell
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to build Shell. Exiting.${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Shell built successfully${NC}"

# 6. Verify remoteEntry.js files
echo -e "${YELLOW}🔍 Verifying remoteEntry.js files...${NC}"
for app in config-editor yaml-editor config-selector job-management; do
  if [ ! -f "packages/$app/dist/assets/remoteEntry.js" ]; then
    echo -e "${RED}❌ remoteEntry.js file not found for $app. Check the build output.${NC}"
    exit 1
  else
    echo -e "${GREEN}✅ remoteEntry.js exists for $app${NC}"
  fi
done

echo -e "${GREEN}🎉 All packages have been successfully rebuilt!${NC}"

# 7. Start all servers
echo -e "${YELLOW}🚀 Starting all servers...${NC}"
echo -e "${YELLOW}This will start in preview mode to serve the built files${NC}"

# Start all servers in preview mode
echo -e "${YELLOW}Starting YAML Editor on port 3002...${NC}"
cd "$ROOT_DIR/packages/yaml-editor" && npm run preview &
YAML_PID=$!

echo -e "${YELLOW}Starting Config Selector on port 3003...${NC}"
cd "$ROOT_DIR/packages/config-selector" && npm run preview &
CONFIG_SELECTOR_PID=$!

echo -e "${YELLOW}Starting Job Management on port 3004...${NC}"
cd "$ROOT_DIR/packages/job-management" && npm run preview &
JOB_MGMT_PID=$!

echo -e "${YELLOW}Starting Config Editor on port 3001...${NC}"
cd "$ROOT_DIR/packages/config-editor" && npm run preview &
CONFIG_EDITOR_PID=$!

# Wait a bit for other servers to start up
echo -e "${YELLOW}Waiting for servers to start up...${NC}"
sleep 5

echo -e "${YELLOW}Starting Shell on port 3000...${NC}"
cd "$ROOT_DIR/packages/shell" && npm run preview &
SHELL_PID=$!

cd "$ROOT_DIR"  # Return to project root

# Register signal handler for cleanup
trap 'echo -e "${YELLOW}Shutting down all servers...${NC}"; kill $YAML_PID $CONFIG_SELECTOR_PID $JOB_MGMT_PID $CONFIG_EDITOR_PID $SHELL_PID 2>/dev/null' SIGINT SIGTERM

echo -e "${GREEN}
-----------------------------------------------
🚀 C4H Editor is now running:
  - Shell: http://localhost:3000
  - Config Editor: http://localhost:3001
  - YAML Editor: http://localhost:3002
  - Config Selector: http://localhost:3003
  - Job Management: http://localhost:3004
-----------------------------------------------
Press Ctrl+C to stop all servers
${NC}"

# Wait for all background processes
wait