#!/bin/bash
# File: startup.sh
# Description: Starts the C4H Editor frontend services (MFEs and shell)
# Instructions: Run this script from the root of your project directory
#               (e.g., /Users/jim/src/apps/c4h_editor_aidev).

# Store the root directory where the script is executed
ROOT_DIR=$(pwd)
ENV_FILE="environments.json"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Service Configuration
MFE_ROOT="c4h-micro/packages"
SERVICES=("shell" "config-selector" "job-management")

# Default ports if not specified in environments.json
SHELL_PORT=3000
CONFIG_SELECTOR_PORT=3003
JOB_MANAGEMENT_PORT=3004

# PID tracking
declare -A SERVICE_PIDS

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
  
  # Export the main backend URL for all services
  export VITE_MAIN_BACKEND_URL=$(jq -r --arg env "$APP_ENV" '.[$env].main_backend // "http://localhost:8000"' "$env_file")
  
  # Export shell service URL
  export VITE_SHELL_SERVICE_URL=$(jq -r --arg env "$APP_ENV" '.[$env].shell_service.url // "http://localhost:8001"' "$env_file")
  
  # Export MFE URLs from environments.json
  export VITE_CONFIG_SELECTOR_WORKFLOWS_URL=$(jq -r --arg env "$APP_ENV" '.[$env]["config-selector-workflows"].url // "http://localhost:3003/assets/remoteEntry.js"' "$env_file")
  export VITE_CONFIG_SELECTOR_TEAMS_URL=$(jq -r --arg env "$APP_ENV" '.[$env]["config-selector-teams"].url // "http://localhost:3003/assets/remoteEntry.js"' "$env_file")
  export VITE_CONFIG_SELECTOR_RUNTIME_URL=$(jq -r --arg env "$APP_ENV" '.[$env]["config-selector-runtime"].url // "http://localhost:3003/assets/remoteEntry.js"' "$env_file")
  export VITE_JOB_MANAGEMENT_URL=$(jq -r --arg env "$APP_ENV" '.[$env]["job-management"].url // "http://localhost:3004/assets/remoteEntry.js"' "$env_file")
  
  # Set service ports if specified in config
  SHELL_PORT_CONFIG=$(jq -r --arg env "$APP_ENV" '.[$env].shell.port // empty' "$env_file")
  CONFIG_SELECTOR_PORT_CONFIG=$(jq -r --arg env "$APP_ENV" '.[$env]["config-selector"].port // empty' "$env_file")
  JOB_MANAGEMENT_PORT_CONFIG=$(jq -r --arg env "$APP_ENV" '.[$env]["job-management"].port // empty' "$env_file")
  
  # Use config ports if available
  if [ ! -z "$SHELL_PORT_CONFIG" ]; then SHELL_PORT=$SHELL_PORT_CONFIG; fi
  if [ ! -z "$CONFIG_SELECTOR_PORT_CONFIG" ]; then CONFIG_SELECTOR_PORT=$CONFIG_SELECTOR_PORT_CONFIG; fi
  if [ ! -z "$JOB_MANAGEMENT_PORT_CONFIG" ]; then JOB_MANAGEMENT_PORT=$JOB_MANAGEMENT_PORT_CONFIG; fi
  
  echo -e "${GREEN}✅ Environment configuration loaded${NC}"
  
  # Print the loaded configuration
  echo -e "${BLUE}Environment:${NC} $APP_ENV"
  echo -e "${BLUE}Main Backend URL:${NC} $VITE_MAIN_BACKEND_URL"
  echo -e "${BLUE}Shell Service URL:${NC} $VITE_SHELL_SERVICE_URL"
  echo -e "${BLUE}Config Selector URL:${NC} $VITE_CONFIG_SELECTOR_WORKFLOWS_URL"
  echo -e "${BLUE}Job Management URL:${NC} $VITE_JOB_MANAGEMENT_URL"
  echo -e "${BLUE}Ports:${NC} Shell=$SHELL_PORT, Config=$CONFIG_SELECTOR_PORT, JobMgmt=$JOB_MANAGEMENT_PORT"
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

# Function to start a service
start_service() {
  local service=$1
  local port=$2
  
  echo -e "${YELLOW}🚀 Starting $service on port $port...${NC}"
  
  # Change to service directory
  cd "$ROOT_DIR/$MFE_ROOT/$service" || { 
    echo -e "${RED}❌ Could not find $service in $MFE_ROOT${NC}"; 
    return 1; 
  }
  
  # Start service with vite preview
  npm run preview -- --port $port > "$ROOT_DIR/${service}_log.txt" 2>&1 &
  
  SERVICE_PIDS[$service]=$!
  
  # Check if process started
  sleep 2
  if ! ps -p ${SERVICE_PIDS[$service]} > /dev/null; then
    echo -e "${RED}❌ Failed to start $service. Check ${service}_log.txt for details.${NC}"
    return 1
  else
    echo -e "${GREEN}✅ $service started with PID ${SERVICE_PIDS[$service]}${NC}"
  fi
  
  # Return to project root
  cd "$ROOT_DIR"
  return 0
}

# Function to clean up on exit
cleanup() {
  print_header "SHUTTING DOWN SERVICES"
  
  for service in "${!SERVICE_PIDS[@]}"; do
    if ps -p ${SERVICE_PIDS[$service]} > /dev/null; then
      echo -e "Killing $service (PID: ${SERVICE_PIDS[$service]})"
      kill ${SERVICE_PIDS[$service]} 2>/dev/null
      sleep 0.5
      if ps -p ${SERVICE_PIDS[$service]} > /dev/null; then
        kill -9 ${SERVICE_PIDS[$service]} 2>/dev/null
      fi
    fi
  done
  
  echo -e "${GREEN}✅ All services stopped${NC}"
  exit 0
}

# Register cleanup handler
trap cleanup SIGINT SIGTERM

# Main execution
print_header "STARTING C4H EDITOR FRONTEND SERVICES"

# Check if MFE directory exists
if [ ! -d "$ROOT_DIR/$MFE_ROOT" ]; then
  echo -e "${RED}❌ MFE directory not found: $MFE_ROOT${NC}"
  echo -e "${RED}   Please run this script from the project root.${NC}"
  exit 1
fi

# Process environment configuration
print_header "LOADING ENVIRONMENT CONFIGURATION"
process_environment_config

# Check ports and start services
print_header "CHECKING PORTS"
check_port $SHELL_PORT "shell" || exit 1
check_port $CONFIG_SELECTOR_PORT "config-selector" || exit 1
check_port $JOB_MANAGEMENT_PORT "job-management" || exit 1

# Start services
print_header "STARTING SERVICES"
start_service "config-selector" $CONFIG_SELECTOR_PORT
start_service "job-management" $JOB_MANAGEMENT_PORT
start_service "shell" $SHELL_PORT

# All services started successfully
print_header "FRONTEND SERVICES RUNNING"
echo -e "${GREEN}The following services are now running:${NC}"
echo -e "  - ${BLUE}Shell:${NC} http://localhost:$SHELL_PORT"
echo -e "  - ${BLUE}Config Selector:${NC} http://localhost:$CONFIG_SELECTOR_PORT"
echo -e "  - ${BLUE}Job Management:${NC} http://localhost:$JOB_MANAGEMENT_PORT"

echo -e "\n${YELLOW}Environment URLs (exported to MFEs):${NC}"
echo -e "  - ${BLUE}Main Backend:${NC} $VITE_MAIN_BACKEND_URL"
echo -e "  - ${BLUE}Shell Service:${NC} $VITE_SHELL_SERVICE_URL"

echo -e "\n${YELLOW}Log files:${NC}"
echo -e "  - ${BLUE}Shell:${NC} ${ROOT_DIR}/shell_log.txt"
echo -e "  - ${BLUE}Config Selector:${NC} ${ROOT_DIR}/config-selector_log.txt"
echo -e "  - ${BLUE}Job Management:${NC} ${ROOT_DIR}/job-management_log.txt"

echo -e "\n${YELLOW}Press Ctrl+C to stop all services${NC}"
wait
]]]]]