#!/bin/bash
# File: c4h-micro/shell-job-startup.sh
# This script only builds and starts the shell and job-management packages

# Store the root directory
ROOT_DIR=$(pwd)

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
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

# 4. Build shell
echo -e "${YELLOW}🔨 Building Shell...${NC}"
cd "$ROOT_DIR/packages/shell" && npm run build
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to build Shell. Exiting.${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Shell built successfully${NC}"

cd "$ROOT_DIR" # Return to project root

# Display start message
echo -e "${CYAN}
-----------------------------------------------
IMPORTANT:
Starting both servers to test Module Federation.
The job-management server will use an express server 
with proper CORS headers for federation.
-----------------------------------------------
${NC}"

# 5. Start job-management server (using the improved express server)
echo -e "${YELLOW}Starting Job Management server on port 3004...${NC}"
cd "$ROOT_DIR/packages/job-management" && NODE_ENV=production node server.cjs &
JOB_MGMT_PID=$!

# Wait for job server to start up
sleep 2

# 6. Start shell server
echo -e "${YELLOW}Starting Shell on port 3000...${NC}"
cd "$ROOT_DIR/packages/shell" && npm run preview &
SHELL_PID=$!

cd "$ROOT_DIR"  # Return to project root

# Test if job-management server is responding correctly
echo -e "${YELLOW}Testing job-management server response...${NC}"
curl -s -I http://localhost:3004/remoteEntry.js | grep -i "content-type\|access-control" || echo "⚠️ Couldn't verify headers"

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