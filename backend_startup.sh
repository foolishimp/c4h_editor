#!/bin/bash
# File: start_backends.sh
# Description: Starts the C4H Editor backend services (main_backend and shell_service)
#              using environment-specific configuration from environments.json.
# Instructions: Run this script from the root of your project directory
#               (e.g., /Users/jim/src/apps/c4h_editor_aidev).
# Requirements: jq (JSON processor) must be installed.

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

# Backend Service Configuration
# Format: "service_dir_name:default_port:log_file_name:uvicorn_target"
# The default_port will be used if not found in environments.json for the current APP_ENV
SERVICES_CONFIG=(
  "backend:8000:backend_server.log:backend.main:app"           # Assuming main_backend is in 'backend' directory
  "shell_service:8001:shell_service_server.log:shell_service.main:app"
)

# --- Global Variables ---
PIDS=() # Array to track running PIDs
APP_ENV=${APP_ENV:-development} # Default to development if not set
ENV_CONFIG="{}" # Holds the loaded JSON config for the current APP_ENV

# Function to process environment configuration and export common URLs
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
    echo -e "${YELLOW}⚠️ Will use default ports defined in SERVICES_CONFIG.${NC}"
    ENV_CONFIG="{}" # Ensure it's an empty JSON object if file not found
    return 0 # Continue with defaults
  fi

  # Check if the specified environment exists in the file
  if ! jq -e --arg env "$APP_ENV" '.[$env]' "$env_file" > /dev/null; then
    echo -e "${RED}❌ Environment '$APP_ENV' not found in $ENV_FILE${NC}"
    echo -e "${YELLOW}   Available environments: $(jq -r 'keys | join(", ")' "$env_file")${NC}"
    echo -e "${YELLOW}⚠️ Will use default ports defined in SERVICES_CONFIG.${NC}"
    ENV_CONFIG="{}" # Ensure it's an empty JSON object if env not found
    return 0 # Continue with defaults
  fi

  echo -e "${GREEN}Loading configuration for environment: ${BLUE}$APP_ENV${NC}"
  ENV_CONFIG=$(jq -c --arg env "$APP_ENV" '.[$env]' "$env_file")

  # Export URLs needed by *either* backend service at runtime
  # Note: Services should read these from environment variables
  export MAIN_BACKEND_URL=$(echo "$ENV_CONFIG" | jq -r '.main_backend.url // "http://localhost:8000"')
  export PREFS_SERVICE_URL=$(echo "$ENV_CONFIG" | jq -r '.prefs_service.url // "http://localhost:8001"')

  # Export MFE URLs (needed by shell_service to return in its API)
  export YAML_EDITOR_MFE_URL=$(echo "$ENV_CONFIG" | jq -r '.yaml_editor.url // ""')
  export CONFIG_SELECTOR_MFE_URL=$(echo "$ENV_CONFIG" | jq -r '.config_selector.url // ""')
  export JOB_MANAGEMENT_MFE_URL=$(echo "$ENV_CONFIG" | jq -r '.job_management.url // ""')

  echo -e "${GREEN}✅ Environment configuration loaded and URLs exported.${NC}"
  echo -e "   ${BLUE}MAIN_BACKEND_URL=${NC}$MAIN_BACKEND_URL"
  echo -e "   ${BLUE}PREFS_SERVICE_URL=${NC}$PREFS_SERVICE_URL"
  # Add echo for MFE URLs if needed for debugging
}

# Function to get port for a service from config or default
get_port_for_service() {
    local service_key=$1 # e.g., "backend", "shell_service"
    local default_port=$2
    local port_from_config

    # Determine JSON key based on service name ('backend' maps to 'main_backend', 'shell_service' maps to 'prefs_service')
    local json_key=""
    if [[ "$service_key" == "backend" ]]; then
      json_key="main_backend"
    elif [[ "$service_key" == "shell_service" ]]; then
      json_key="prefs_service"
    else
      # Use a direct mapping if service_key matches a top-level key in json
      json_key=$(echo "$ENV_CONFIG" | jq -r --arg key "$service_key" 'if has($key) then $key else "" end')
      if [[ -z "$json_key" ]]; then # Fallback if no direct key match
         echo "$default_port"
         return
      fi
    fi

    # Query jq using the determined key for the port
    port_from_config=$(echo "$ENV_CONFIG" | jq -r --arg key "$json_key" '.[$key].port // empty')

    if [[ -z "$port_from_config" ]] || [[ "$port_from_config" == "null" ]]; then
        echo "$default_port"
    else
        echo "$port_from_config"
    fi
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
  # Use netstat or ss for potentially wider compatibility, fallback to lsof
  if command -v ss > /dev/null; then
      PORT_CHECK_CMD="ss -tuln"
  elif command -v netstat > /dev/null; then
      PORT_CHECK_CMD="netstat -tuln"
  elif command -v lsof > /dev/null; then
       PORT_CHECK_CMD="lsof -ti:$port_to_check" # lsof is less standard but often available
       if $PORT_CHECK_CMD > /dev/null; then # lsof directly checks specific port
          port_in_use=true
       else
          port_in_use=false
       fi
       # Skip the grep part if using lsof -ti directly
       handle_port_usage $port_to_check $port_in_use
       return $? # Return status from handler
  else
      echo -e "${YELLOW}⚠️ Cannot find ss, netstat, or lsof to check port $port_to_check. Skipping check.${NC}"
      return 0 # Skip check if no tool found
  fi

  # Use grep with the chosen command (ss or netstat)
  if $PORT_CHECK_CMD | grep -q ":$port_to_check "; then
       handle_port_usage $port_to_check true
       return $? # Return status from handler
  else
       echo -e "${GREEN}✅ Port $port_to_check is free${NC}"
       return 0
  fi
}

# Helper for port check logic
handle_port_usage() {
    local port_to_check=$1
    local is_in_use=$2 # Should be "true" or "false" string

    if [[ "$is_in_use" == "true" ]]; then
        echo -e "${YELLOW}⚠️ Port $port_to_check is in use${NC}"
        read -p "Kill process using port $port_to_check? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            # Attempt to kill based on port (requires lsof or similar)
            if command -v lsof > /dev/null; then
                lsof -ti:$port_to_check | xargs kill -9 2>/dev/null
                echo -e "${GREEN}✅ Attempted to kill process on port $port_to_check${NC}"
                # Verify again
                sleep 0.5
                if lsof -ti:$port_to_check > /dev/null; then
                   echo -e "${RED}❌ Failed to kill process on port $port_to_check.${NC}"
                   return 1
                fi
            else
                echo -e "${YELLOW}⚠️ 'lsof' command not found. Cannot automatically kill process. Please kill it manually.${NC}"
                return 1
            fi
        else
            echo -e "${RED}❌ Cannot continue with port $port_to_check in use${NC}"
            return 1
        fi
    else
         echo -e "${GREEN}✅ Port $port_to_check is free${NC}"
    fi
    return 0
}


# Function to start a backend service
start_service() {
  local service_name=$1
  local target_port=$2
  local log_file=$3
  local uvicorn_target=$4

  # --- CRITICAL: Ensure we run uvicorn from the ROOT_DIR ---
  cd "$ROOT_DIR" || { echo -e "${RED}❌ Could not cd to ROOT_DIR ($ROOT_DIR)${NC}"; return 1; }

  local host="0.0.0.0"

  # Check if the specific service directory exists
  if [ ! -d "$ROOT_DIR/$service_name" ]; then
    echo -e "${RED}❌ Service directory '$service_name' not found in $ROOT_DIR. Skipping startup.${NC}"
    # Consider this non-fatal if only one service is optional? For now, return error.
    return 1
  fi

  # Check if log config file exists
  local log_cmd_arg=""
  if [ -f "$LOG_CONFIG_FILE" ]; then
      log_cmd_arg="--log-config $LOG_CONFIG_FILE"
      echo -e "${YELLOW}🚀 Starting $service_name on port $target_port (using $LOG_CONFIG_FILE, logging to $log_file)...${NC}"
  else
      echo -e "${YELLOW}⚠️ Log configuration file not found: $LOG_CONFIG_FILE in $ROOT_DIR${NC}"
      echo -e "${YELLOW}   Starting $service_name on port $target_port without specific log configuration.${NC}"
  fi

  # Ensure Python app can find modules: Add ROOT_DIR to PYTHONPATH
  export PYTHONPATH="${PYTHONPATH}:$ROOT_DIR"

  # Run uvicorn in the background, passing the specific port
  # Assuming Python app uses --port argument or uvicorn default behavior
  # Remove --reload if causing issues with log config or multiple workers
  uvicorn "$uvicorn_target" --host "$host" --port "$target_port" $log_cmd_arg --reload > "$log_file" 2>&1 &

  local pid=$!
  PIDS+=($pid)

  # Check if process started
  sleep 2 # Give it a moment to potentially fail
  if ! ps -p $pid > /dev/null; then
     echo -e "${RED}❌ Failed to start $service_name (PID $pid). Check $log_file for details.${NC}"
     # Clean up other potentially started processes before exiting
     # cleanup # Calling cleanup here might exit the script too early if one fails
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

  cd "$ROOT_DIR" || echo "Warning: Could not cd to $ROOT_DIR during cleanup."

  # Use a copy of the PIDS array in case it gets modified
  local pids_to_kill=("${PIDS[@]}")
  echo "Attempting to stop PIDs: ${pids_to_kill[*]}" # Debugging

  for pid in "${pids_to_kill[@]}"; do
    # Check if PID is not empty and corresponds to a running process
    if [[ ! -z "$pid" ]] && ps -p "$pid" > /dev/null; then
      echo -e "Killing process $pid..."
      kill "$pid" 2>/dev/null
      # Wait briefly and check again
      sleep 0.5
      if ps -p "$pid" > /dev/null; then
          echo "Process $pid still running, sending SIGKILL..."
          kill -9 "$pid" 2>/dev/null
      fi
      echo "Process $pid stopped."
    elif [[ ! -z "$pid" ]]; then
       echo "Process $pid already stopped."
    fi
  done
  # Clear the global PIDS array after attempting to kill
  PIDS=()

  echo -e "${GREEN}✅ Backend shutdown sequence complete.${NC}"
  # Exit explicitly to ensure script terminates after cleanup
  exit 0
}

# Register cleanup handler
trap cleanup SIGINT SIGTERM

# ========================
# Main execution starts here
# ========================
print_header "STARTING C4H EDITOR BACKEND SERVICES"

# Load Environment Config and Export Variables
print_header "LOADING ENVIRONMENT CONFIGURATION"
if ! process_environment_config; then
  echo -e "${YELLOW}⚠️ Failed to load environment configuration. Using defaults defined in script.${NC}"
  # Script continues using defaults defined in SERVICES_CONFIG
fi

# Reminder for virtual environment
if [ -z "$VIRTUAL_ENV" ]; then
    echo -e "${YELLOW}⚠️ Reminder: Make sure you have activated the correct Python virtual environment!${NC}"
    sleep 1
fi

# Reminder for DB environment variables
echo -e "${YELLOW}ℹ️  Reminder: Ensure DB environment variable (DATABASE_URL) is set if needed by services.${NC}"
sleep 1

# Check all ports first
print_header "CHECKING PORTS"
ports_ok=true
for service_config in "${SERVICES_CONFIG[@]}"; do
  IFS=':' read -r service_name default_port _ _ <<< "$service_config"
  # Get port from config or default
  target_port=$(get_port_for_service "$service_name" "$default_port")
  if ! check_port "$target_port" "$service_name"; then
      ports_ok=false
      break # Exit loop early if a port check fails and user doesn't kill
  fi
done

if [ "$ports_ok" = false ]; then
    echo -e "${RED}❌ Port conflict detected. Aborting startup.${NC}"
    exit 1
fi


# Start all services
print_header "STARTING SERVICES"
start_failed=false
for service_config in "${SERVICES_CONFIG[@]}"; do
  IFS=':' read -r service_name default_port log_file uvicorn_target <<< "$service_config"
  # Get port from config or default
  target_port=$(get_port_for_service "$service_name" "$default_port")
  if ! start_service "$service_name" "$target_port" "$log_file" "$uvicorn_target"; then
      start_failed=true
      echo -e "${RED}❌ Failed to start $service_name. Stopping already started services...${NC}"
      cleanup # Trigger cleanup if a service fails to start
      exit 1 # Exit script after cleanup
  fi
  sleep 1 # Stagger startup slightly
done


# All servers are now running
print_header "BACKEND SERVICES RUNNING"
echo -e "${GREEN}All backend servers should now be running:${NC}"
for service_config in "${SERVICES_CONFIG[@]}"; do
  IFS=':' read -r service_name default_port log_file _ <<< "$service_config"
  # Get port from config or default for display
  target_port=$(get_port_for_service "$service_name" "$default_port")
  echo -e "  - ${BLUE}$service_name:${NC} http://localhost:$target_port (Logs: ${BLUE}$log_file${NC})"
done

echo -e "\n${YELLOW}Press Ctrl+C to stop all servers${NC}"

# Wait for all background processes to prevent script exit
wait