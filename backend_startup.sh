#!/bin/bash
# File: backend_startup.sh
# Description: Starts the C4H Editor backend services (backend and shell_service).

# Store the root directory where the script is located (should be /Users/jim/src/apps/c4h_editor)
ROOT_DIR=$(pwd)
EXPECTED_ROOT="/Users/jim/src/apps/c4h_editor" # Adjust if your root is different
LOG_CONFIG_FILE="log_config.yaml" # Define log config file name

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Backend Service Configuration
# Format: "service_directory_name:port:log_file_name"
SERVICES=(
  "backend:8000:backend_server.log"
  "shell_service:8001:shell_service_server.log"
)

# Array to track running PIDs
PIDS=()

# Function to print section header
print_header() {
  echo -e "\n${BLUE}========== $1 ==========${NC}"
}

# Function to check port availability
check_port() {
  local port=$1
  local service_name=$2
  echo -e "Checking port ${BLUE}$port${NC} for service ${BLUE}$service_name${NC}..."
  if lsof -ti:$port > /dev/null; then
    echo -e "${YELLOW}⚠️ Port $port is in use${NC}"
    read -p "Kill process using port $port? (y/n) " -n 1 -r
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

# Function to start a backend service
start_service() {
  local service_config=$1
  IFS=':' read -r service_name port log_file <<< "$service_config" # Split config string

  # --- CRITICAL: Ensure we run uvicorn from the ROOT_DIR ---
  cd "$ROOT_DIR" || { echo -e "${RED}❌ Could not cd to ROOT_DIR ($ROOT_DIR)${NC}"; return 1; }

  local uvicorn_target="${service_name}.main:app"
  local host="0.0.0.0"
  # local log_level="debug" # <-- REMOVED: Using log config file now

  # Check if log config file exists
  if [ ! -f "$LOG_CONFIG_FILE" ]; then
      echo -e "${RED}❌ Log configuration file not found: $LOG_CONFIG_FILE${NC}"
      echo -e "${YELLOW}   Make sure it exists in the project root: $ROOT_DIR${NC}"
      return 1
  fi

  echo -e "${YELLOW}🚀 Starting $service_name on port $port (using $LOG_CONFIG_FILE, logging to $log_file)...${NC}"

  # --- UPDATED: Run uvicorn using --log-config ---
  # Run uvicorn in the background, redirecting output
  uvicorn "$uvicorn_target" --reload --host "$host" --port "$port" --log-config "$LOG_CONFIG_FILE" > "$log_file" 2>&1 &
  # Note: Reloading with log-config might have limitations, test carefully. Remove --reload if issues arise.

  local pid=$!
  PIDS+=($pid)

  # Check if process started (simple check)
  sleep 2 # Give it a moment to potentially fail
  if ! ps -p $pid > /dev/null; then
     echo -e "${RED}❌ Failed to start $service_name (PID $pid). Check $log_file for details.${NC}"
     return 1
  else
     echo -e "${GREEN}✅ $service_name started with PID $pid${NC}"
  fi
  return 0
}

# Function to clean up on exit
cleanup() {
  print_header "SHUTTING DOWN BACKEND SERVICES"
  echo -e "${YELLOW}Stopping all servers...${NC}"

  # Change back to root dir in case script exited elsewhere
  cd "$ROOT_DIR" || echo "Warning: Could not cd to $ROOT_DIR during cleanup."

  for pid in "${PIDS[@]}"; do
    if ps -p $pid > /dev/null; then
      echo -e "Killing process $pid"
      # Send SIGTERM first, then SIGKILL if needed (more graceful)
      kill $pid 2>/dev/null
      sleep 0.5
      if ps -p $pid > /dev/null; then
          kill -9 $pid 2>/dev/null
      fi
    fi
  done

  echo -e "${GREEN}✅ All backend servers stopped${NC}"
  exit 0
}

# Register cleanup handler
trap cleanup SIGINT SIGTERM

# ========================
# Main execution starts here
# ========================
print_header "STARTING C4H EDITOR BACKEND SERVICES"

# Check if running from the correct directory
if [ "$ROOT_DIR" != "$EXPECTED_ROOT" ]; then
    echo -e "${RED}❌ Please run this script from the project root directory: $EXPECTED_ROOT${NC}"
    exit 1
fi

# Reminder for virtual environment
if [ -z "$VIRTUAL_ENV" ]; then
    echo -e "${YELLOW}⚠️ Reminder: Make sure you have activated the correct Python virtual environment!${NC}"
    sleep 2
fi

# Reminder for DB environment variables
# Updated message for DATABASE_URL
echo -e "${YELLOW}ℹ️  Reminder: Ensure DB environment variable (DATABASE_URL) is set if needed (defaults to SQLite in shell_service/data).${NC}"
sleep 2

# Check all ports first
print_header "CHECKING PORTS"
for service_config in "${SERVICES[@]}"; do
  IFS=':' read -r service_name port _ <<< "$service_config"
  check_port "$port" "$service_name" || exit 1
done


# Start all services
print_header "STARTING SERVICES"
for service_config in "${SERVICES[@]}"; do
  start_service "$service_config" || exit 1 # Exit if any service fails to start
  sleep 1 # Stagger startup slightly
done


# Return to project root (redundant here but good practice)
cd "$ROOT_DIR"

# All servers are now running
print_header "BACKEND SERVICES RUNNING"
echo -e "${GREEN}All backend servers should now be running:${NC}"
for service_config in "${SERVICES[@]}"; do
  IFS=':' read -r service_name port log_file <<< "$service_config"
  echo -e "  - ${BLUE}$service_name:${NC} http://localhost:$port (Logs: ${BLUE}$log_file${NC})"
done

echo -e "\n${YELLOW}Press Ctrl+C to stop all servers${NC}"

# Wait for all background processes to prevent script exit
wait