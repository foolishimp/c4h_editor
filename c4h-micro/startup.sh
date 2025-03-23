#!/bin/bash
# File: start-federation.sh
# This script builds and starts the shell and job-management packages with proper Module Federation setup

# Store the root directory
ROOT_DIR=$(pwd)

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

# Clean up any previous processes when exiting
cleanup() {
  echo -e "${YELLOW}Shutting down servers...${NC}"
  kill $JOB_MGMT_PID $SHELL_PID 2>/dev/null
  exit 0
}

# Register cleanup handler
trap cleanup SIGINT SIGTERM

# 1. Check ports
echo -e "${YELLOW}Checking ports...${NC}"
check_port 3000  # Shell
check_port 3004  # Job Management

# 2. Build shared package first (required dependency)
echo -e "${YELLOW}🔨 Building shared package...${NC}"
cd "$ROOT_DIR/packages/shared" && npm run build
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to build shared package. Exiting.${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Shared package built successfully${NC}"

# 3. Build job-management
echo -e "${YELLOW}🔨 Building Job Management...${NC}"
cd "$ROOT_DIR/packages/job-management" && npm run build
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to build Job Management. Exiting.${NC}"
  exit 1
fi

# Explicitly ensure remoteEntry.js is available in both locations
if [ -f "$ROOT_DIR/packages/job-management/dist/assets/remoteEntry.js" ]; then
  echo -e "${YELLOW}Copying remoteEntry.js to root level for job-management...${NC}"
  cp "$ROOT_DIR/packages/job-management/dist/assets/remoteEntry.js" "$ROOT_DIR/packages/job-management/dist/remoteEntry.js"
  echo -e "${GREEN}✅ remoteEntry.js copied successfully${NC}"
else
  echo -e "${RED}⚠️ Could not find remoteEntry.js in assets folder${NC}"
  # Try to find it elsewhere
  find "$ROOT_DIR/packages/job-management/dist" -name "remoteEntry.js" -exec echo "Found at: {}" \;
fi

echo -e "${GREEN}✅ Job Management built successfully${NC}"

# 4. Start job-management in preview mode
echo -e "${YELLOW}Starting Job Management preview on port 3004...${NC}"
cd "$ROOT_DIR/packages/job-management" && npm run preview &
JOB_MGMT_PID=$!

# Wait a bit for job server to start up
echo -e "${YELLOW}Waiting for Job Management server to initialize...${NC}"
sleep 3

# 5. Start shell in development mode
echo -e "${YELLOW}Starting Shell in development mode on port 3000...${NC}"
cd "$ROOT_DIR/packages/shell" && npm run start &
SHELL_PID=$!

cd "$ROOT_DIR"  # Return to project root

echo -e "${GREEN}
-----------------------------------------------
🚀 Servers are running:
  - Shell: http://localhost:3000
  - Job Management: http://localhost:3004
-----------------------------------------------
Press Ctrl+C to stop all servers
${NC}"

# Print reminder about Module Federation path
echo -e "${YELLOW}
💡 Module Federation Info:
  - Make sure shell's vite.config.ts points to: http://localhost:3004/assets/remoteEntry.js
  - If issues persist, verify both these files exist:
    - packages/job-management/dist/assets/remoteEntry.js
    - packages/job-management/dist/remoteEntry.js
${NC}"

# Wait for all background processes
wait