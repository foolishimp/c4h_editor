#!/bin/bash
# File: start_shell_service.sh
# Description: Starts the C4H Editor Shell Preferences backend service.
# Instructions: Run this script from the root of your project directory
#               (e.g., /Users/jim/src/apps/c4h_editor_aidev).

# Store the root directory where the script is executed
ROOT_DIR=$(pwd)
LOG_CONFIG_FILE="log_config.yaml" # Define log config file name (expects it in ROOT_DIR)
ENV_FILE="environments.json"      # Environment configuration file

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Shell Service Configuration - Basic defaults
# (These may be overridden by environments.json)
SERVICE_NAME="shell_service"
PORT=8001 # Default port for shell_service
LOG_FILE="${SERVICE_NAME}_server.log" # Log file name
UVICORN_TARGET="${SERVICE_NAME}.main:app" # Target for uvicorn

# PID tracking (only one service now)
PID=""

# Environment selection
APP_ENV=${APP_ENV:-development}  # Default to development if not set

# Function to process environment configuration
process_environment_config() {
  local env_file="$ROOT_DIR/$ENV_FILE"
  
  # Check if jq is installed
  if ! command -v jq &> /dev/null; then
    echo -e "${RED}❌ jq is not installed but is required for parsing JSON config.${NC}"
    echo -e "${RED}   Please install jq using your package manager (e.g., brew install jq).${NC}"
    return 1
  fi
  
  # Check if environments.json exists
  if [ ! -f "$env_file" ]; then
    echo -e "${RED}❌ Environment configuration file not found: $env_file${NC}"
    echo -e "${RED}   Cannot load environment-specific configuration.${NC}"
    return 1
  fi
  
  # Check if the specified environment exists in the file
  if ! jq -e --arg env "$APP_ENV" '.[$env]' "$env_file" > /dev/null; then
    echo -e "${RED}❌ Environment '$APP_ENV' not found in $ENV_FILE${NC}"
    echo -e "${YELLOW}   Available environments: $(jq -r 'keys | join(", ")' "$env_file")${NC}"
    return 1
  fi
  
  echo -e "${GREEN}Loading configuration for environment: ${BLUE}$APP_ENV${NC}"
  
  # Extract and export configuration values
  # For the shell service, we primarily need the main_backend URL
  MAIN_BACKEND_URL=$(jq -r --arg env "$APP_ENV" '.[$env].main_backend // "http://localhost:8000"' "$env_file")
  
  # Optional: Look for a shell_service port if specified (using default if not found)
  PORT_FROM_CONFIG=$(jq -r --arg env "$APP_ENV" '.[$env].shell_service.port // empty' "$env_file")
  if [ ! -z "$PORT_FROM_CONFIG" ]; then
    PORT=$PORT_FROM_CONFIG
  fi
  
  # Export variables for the service to use
  export MAIN_BACKEND_URL
  export PORT
  
  echo -e "${GREEN}✅ Environment configuration loaded${NC}"
}

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

# Process environment configuration
print_header "LOADING ENVIRONMENT CONFIGURATION"
if ! process_environment_config; then
  echo -e "${YELLOW}⚠️ Continuing with default configuration values${NC}"
else
  echo -e "${BLUE}PORT=${NC}$PORT ${BLUE}MAIN_BACKEND_URL=${NC}$MAIN_BACKEND_URL"
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
]]]]]