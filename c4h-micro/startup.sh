#!/bin/bash
# File: start-microfrontends.sh
# Description: Builds and starts all C4H Editor microfrontends with Module Federation

# Store the root directory
ROOT_DIR=$(pwd)

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Microfrontend configuration using parallel arrays (compatible with older bash)
PACKAGES=("shared" "config-editor" "yaml-editor" "config-selector" "job-management" "shell")
PORTS=("0" "3001" "3002" "3003" "3004" "3000")

# Array to track running PIDs
PIDS=()

# Function to print section header
print_header() {
  echo -e "\n${BLUE}========== $1 ==========${NC}"
}

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
      return 1
    fi
  else
    echo -e "${GREEN}✅ Port $port is free${NC}"
  fi
  return 0
}

# Function to build a package
build_package() {
  local package=$1
  local dir="$ROOT_DIR/packages/$package"
  
  if [ ! -d "$dir" ]; then
    echo -e "${RED}❌ Package directory not found: $dir${NC}"
    return 1
  fi
  
  cd "$dir"
  echo -e "${YELLOW}🔨 Building $package...${NC}"
  
  npm run build
  if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to build $package. Exiting.${NC}"
    return 1
  fi
  
  echo -e "${GREEN}✅ $package built successfully${NC}"
  return 0
}

# Function to start a service
start_service() {
  local package=$1
  local port=${2:-0}
  local dir="$ROOT_DIR/packages/$package"
  
  cd "$dir"
  
  if [ "$package" == "shell" ]; then
    echo -e "${YELLOW}🚀 Starting $package in development mode on port $port...${NC}"
    # Override the port in package.json by directly using vite command
    ../../node_modules/.bin/vite --port $port --strictPort &
  else
    echo -e "${YELLOW}🚀 Starting $package in preview mode on port $port...${NC}"
    # Override the port in package.json
    ../../node_modules/.bin/vite preview --port $port --strictPort &
  fi
  
  local pid=$!
  PIDS+=($pid)
  echo -e "${GREEN}✅ $package started with PID $pid${NC}"
  return 0
}

# Function to clean up on exit
cleanup() {
  print_header "SHUTTING DOWN"
  echo -e "${YELLOW}Stopping all servers...${NC}"
  
  for pid in "${PIDS[@]}"; do
    if ps -p $pid > /dev/null; then
      echo -e "Killing process $pid"
      kill $pid 2>/dev/null
    fi
  done
  
  echo -e "${GREEN}✅ All servers stopped${NC}"
  exit 0
}

# Register cleanup handler
trap cleanup SIGINT SIGTERM

# Main execution starts here
print_header "STARTING C4H EDITOR WITH MICROFRONTENDS"

# Check all ports first
print_header "CHECKING PORTS"
for i in "${!PACKAGES[@]}"; do
  package=${PACKAGES[$i]}
  port=${PORTS[$i]}
  if [ "$port" != "0" ]; then
    check_port $port || exit 1
  fi
done

# Build shared package first (dependency for all)
print_header "BUILDING PACKAGES"
build_package "shared" || exit 1

# Build all microfrontends before starting any servers
for i in "${!PACKAGES[@]}"; do
  package=${PACKAGES[$i]}
  if [ "$package" != "shared" ]; then
    build_package "$package" || exit 1
  fi
done

# Start all services in reverse order (remote microfrontends first, shell last)
print_header "STARTING SERVICES"

# Start microfrontends first (all except shell and shared)
for i in "${!PACKAGES[@]}"; do
  package=${PACKAGES[$i]}
  port=${PORTS[$i]}
  if [ "$package" != "shell" ] && [ "$package" != "shared" ]; then
    start_service "$package" "$port"
    # Give some time for service to initialize
    sleep 2
  fi
done

# Start shell last
shell_index=0
for i in "${!PACKAGES[@]}"; do
  if [ "${PACKAGES[$i]}" == "shell" ]; then
    shell_index=$i
    break
  fi
done
start_service "shell" "${PORTS[$shell_index]}"

# Return to project root
cd "$ROOT_DIR"

# All servers are now running
print_header "SERVERS RUNNING"
echo -e "${GREEN}All servers are now running:${NC}"
for i in "${!PACKAGES[@]}"; do
  package=${PACKAGES[$i]}
  port=${PORTS[$i]}
  if [ "$port" != "0" ]; then
    echo -e "  - ${BLUE}$package:${NC} http://localhost:$port"
  fi
done
echo -e "\n${YELLOW}Press Ctrl+C to stop all servers${NC}"

# Print debugging info
print_header "MODULE FEDERATION INFO"
echo -e "${YELLOW}💡 Remotes Configuration:${NC}"
echo -e "  - Make sure shell's vite.config.ts has these remotes:"
for i in "${!PACKAGES[@]}"; do
  package=${PACKAGES[$i]}
  port=${PORTS[$i]}
  if [ "$package" != "shell" ] && [ "$package" != "shared" ] && [ "$port" != "0" ]; then
    echo -e "    ${BLUE}$package:${NC} http://localhost:$port/assets/remoteEntry.js"
  fi
done

# Wait for all background processes
wait