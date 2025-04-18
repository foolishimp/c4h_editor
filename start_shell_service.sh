#!/bin/bash
# File: start_shell_service.sh
# Description: Starts the C4H Editor Shell Preferences backend service.
# Instructions: Run this script from the root of your project directory
#               (e.g., /Users/jim/src/apps/c4h_editor_aidev).

# Store the root directory where the script is executed
ROOT_DIR=$(pwd)
LOG_CONFIG_FILE="log_config.yaml" # Define log config file name (expects it in ROOT_DIR)

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Shell Service Configuration
SERVICE_NAME="shell_service"
PORT=8001 # Default port for shell_service
LOG_FILE="${SERVICE_NAME}_server.log" # Log file name
UVICORN_TARGET="${SERVICE_NAME}.main:app" # Target for uvicorn

# PID tracking (only one service now)
PID=""

# Function to print section header
print_header() {
  echo -e "\n${BLUE}========== $1 ==========${NC}"
}

# Function to check port availability
check_port() {
  local port_to_check=$1
  local service_display_name=$2
  echo -e "Checking port ${BLUE}$port_to_check${NC} for service ${BLUE}$service_display_name${NC}..."
  if lsof -ti:$port_to_check > /dev/null; then
    echo -e "${YELLOW}⚠️ Port $port_to_check is in use${NC}"
    read -p "Kill process using port $port_to_check? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      lsof -ti:$port_to_check | xargs kill -9 2>/dev/null
      echo -e "${GREEN}✅ Process killed${NC}"
    else
      echo -e "${RED}❌ Cannot continue with port $port_to_check in use${NC}"
      return 1
    fi
  else
    echo -e "${GREEN}✅ Port $port_to_check is free${NC}"
  fi
  return 0
}

# Function to start the shell service
start_shell_service() {
  # --- CRITICAL: Ensure we run uvicorn from the ROOT_DIR ---
  # This allows Python to correctly find the 'shell_service' package
  cd "$ROOT_DIR" || { echo -e "${RED}❌ Could not cd to ROOT_DIR ($ROOT_DIR)${NC}"; return 1; }

  local host="0.0.0.0"

  # Check if log config file exists in the current directory (ROOT_DIR)
  if [ ! -f "$LOG_CONFIG_FILE" ]; then
      echo -e "${YELLOW}⚠️ Log configuration file not found: $LOG_CONFIG_FILE in $ROOT_DIR${NC}"
      echo -e "${YELLOW}   Starting without specific log configuration (using uvicorn defaults).${NC}"
      echo -e "${YELLOW}🚀 Starting $SERVICE_NAME on port $PORT (logging to $LOG_FILE)...${NC}"
      # Start without --log-config
      uvicorn "$UVICORN_TARGET" --reload --host "$host" --port "$PORT" > "$LOG_FILE" 2>&1 &
  else
      echo -e "${YELLOW}🚀 Starting $SERVICE_NAME on port $PORT (using $LOG_CONFIG_FILE, logging to $LOG_FILE)...${NC}"
      # Start with --log-config
      uvicorn "$UVICORN_TARGET" --reload --host "$host" --port "$PORT" --log-config "$LOG_CONFIG_FILE" > "$LOG_FILE" 2>&1 &
      # Note: Reloading with log-config might have limitations. Remove --reload if issues arise.
  fi

  PID=$! # Store the PID

  # Check if process started (simple check)
  sleep 2 # Give it a moment to potentially fail
  if ! ps -p $PID > /dev/null; then
     echo -e "${RED}❌ Failed to start $SERVICE_NAME (PID $PID). Check $LOG_FILE for details.${NC}"
     return 1
  else
     echo -e "${GREEN}✅ $SERVICE_NAME started with PID $PID${NC}"
  fi
  return 0
}

# Function to clean up on exit
cleanup() {
  print_header "SHUTTING DOWN SHELL SERVICE"
  echo -e "${YELLOW}Stopping server...${NC}"

  # Change back to root dir in case script exited elsewhere
  cd "$ROOT_DIR" || echo "Warning: Could not cd to $ROOT_DIR during cleanup."

  if [ ! -z "$PID" ] && ps -p $PID > /dev/null; then
    echo -e "Killing process $PID"
    # Send SIGTERM first, then SIGKILL if needed (more graceful)
    kill $PID 2>/dev/null
    sleep 0.5
    if ps -p $PID > /dev/null; then
        kill -9 $PID 2>/dev/null
    fi
  fi

  echo -e "${GREEN}✅ Shell service stopped${NC}"
  exit 0
}

# Register cleanup handler
trap cleanup SIGINT SIGTERM

# ========================
# Main execution starts here
# ========================
print_header "STARTING C4H EDITOR SHELL SERVICE"

# Check if the shell_service directory exists relative to the current directory
if [ ! -d "$ROOT_DIR/$SERVICE_NAME" ]; then
    echo -e "${RED}❌ Directory '$SERVICE_NAME' not found in the current directory ($ROOT_DIR).${NC}"
    echo -e "${RED}   Please run this script from the project root (e.g., c4h_editor_aidev).${NC}"
    exit 1
fi

# Reminder for virtual environment
if [ -z "$VIRTUAL_ENV" ]; then
    echo -e "${YELLOW}⚠️ Reminder: Make sure you have activated the correct Python virtual environment!${NC}"
    sleep 1
fi

# Reminder for DB environment variables
echo -e "${YELLOW}ℹ️  Reminder: Ensure DB environment variable (DATABASE_URL) is set if needed (defaults to SQLite in shell_service/data).${NC}"
sleep 1

# Check port
print_header "CHECKING PORT"
check_port "$PORT" "$SERVICE_NAME" || exit 1

# Start the service
print_header "STARTING SERVICE"
start_shell_service || exit 1 # Exit if service fails to start

# Return to project root (good practice)
cd "$ROOT_DIR"

# Service is now running
print_header "SHELL SERVICE RUNNING"
echo -e "${GREEN}The shell service should now be running:${NC}"
echo -e "  - ${BLUE}$SERVICE_NAME:${NC} http://localhost:$PORT (Logs: ${BLUE}$LOG_FILE${NC})"

echo -e "\n${YELLOW}Press Ctrl+C to stop the server${NC}"

# Wait for the background process to prevent script exit
wait $PID