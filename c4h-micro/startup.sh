#!/bin/bash
# File: c4h-micro/shell-job-startup.sh
# This script builds and starts only the shell and job-management packages

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
echo -e "${GREEN}✅ Job Management built successfully${NC}"

# Ensure remoteEntry.js is at root level
if [ -f "$ROOT_DIR/packages/job-management/dist/assets/remoteEntry.js" ]; then
  cp "$ROOT_DIR/packages/job-management/dist/assets/remoteEntry.js" "$ROOT_DIR/packages/job-management/dist/remoteEntry.js"
  echo -e "${GREEN}✅ Copied remoteEntry.js to root level for job-management${NC}"
fi

# 4. Build shell
echo -e "${YELLOW}🔨 Building Shell...${NC}"
cd "$ROOT_DIR/packages/shell" && npm run build
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to build Shell. Exiting.${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Shell built successfully${NC}"

cd "$ROOT_DIR" # Return to project root

# 5. Start job-management server
echo -e "${YELLOW}Starting Job Management server on port 3004...${NC}"
cd "$ROOT_DIR/packages/job-management" && NODE_ENV=production node server.cjs &
JOB_MGMT_PID=$!

# Wait a bit for job server to start up
sleep 3

# 6. Start shell server
echo -e "${YELLOW}Starting Shell on port 3000...${NC}"
cd "$ROOT_DIR/packages/shell" && npm run preview &
SHELL_PID=$!

cd "$ROOT_DIR"  # Return to project root

# Register signal handler for cleanup
trap 'echo -e "${YELLOW}Shutting down servers...${NC}"; kill $JOB_MGMT_PID $SHELL_PID 2>/dev/null' SIGINT SIGTERM

echo -e "${GREEN}
-----------------------------------------------
🚀 Servers are running:
  - Shell: http://localhost:3000
  - Job Management: http://localhost:3004
-----------------------------------------------
Press Ctrl+C to stop all servers
${NC}"

# Wait for all background processes
wait