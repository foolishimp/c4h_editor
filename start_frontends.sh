#!/bin/bash
# File: start_frontends.sh (Revised for macOS compatibility & URL Port Extraction)
# ... (Keep Colors, MFE_ROOT, SERVICES definitions) ...

# Default ports (using parallel arrays for better macOS compatibility)
DEFAULT_SERVICE_NAMES=("shell" "config-selector" "job-management" "yaml-editor")
DEFAULT_PORT_VALUES=(3000 3003 3004 3002)

# PID tracking (using simple array for compatibility)
SERVICE_PIDS=()
SERVICE_NAMES_TRACKED=() # Keep track of which service corresponds to PID

# ... (Keep APP_ENV, ENV_CONFIG, print_header, process_environment_config, check_port, handle_port_usage definitions) ...

# Function to get default port using parallel arrays
get_default_port() {
    local service_name=$1
    local port=""
    for i in "${!DEFAULT_SERVICE_NAMES[@]}"; do
        if [[ "${DEFAULT_SERVICE_NAMES[$i]}" == "$service_name" ]]; then
            port=${DEFAULT_PORT_VALUES[$i]}
            break
        fi
    done
    echo "$port"
}

# Function to get port for a frontend service (Revised for URL Extraction & macOS)
get_port_for_frontend_service() {
    local service_name=$1
    local default_port=$(get_default_port "$service_name") # Use helper function
    local url_from_config
    local port_from_url

    # --- Map service names to the keys used in environments.json ---
    local json_key=$service_name
    if [[ "$service_name" == "config-selector" ]]; then
        # Choose ONE key or implement logic if multiple config selectors exist
        json_key="config-selector-teams" # Or -workflows, -runtime depending on which one runs on 3003
    elif [[ "$service_name" == "job-management" ]]; then
        json_key="job-management"
    elif [[ "$service_name" == "yaml-editor" ]]; then
        # Add mapping if yaml-editor URL is in the JSON
        : # Placeholder - Add mapping if needed
    elif [[ "$service_name" == "shell" ]]; then
        # Shell usually doesn't have a URL in this config, handle differently if needed
         : # Placeholder - Add mapping if needed
    fi
    # --- End Mapping ---


    url_from_config=$(echo "$ENV_CONFIG" | jq -r --arg key "$json_key" '.[$key].url // empty')

    if [[ -n "$url_from_config" ]] && [[ "$url_from_config" != "null" ]]; then
        # Extract port from URL using sed (more portable than grep -P)
        # Removes protocol://host: up to the colon
        local host_port_part=$(echo "$url_from_config" | sed -E 's#^.*://[^/]+:##')
        # Extracts numbers before the first / or end of string
        port_from_url=$(echo "$host_port_part" | sed -E 's#^([0-9]+)[^0-9]*.*$#\1#')

        if [[ "$port_from_url" =~ ^[0-9]+$ ]]; then # Check if it's a number
             echo "$port_from_url"
             return 0 # Success
        fi
        echo -e "${YELLOW}⚠️ Could not extract valid port from URL '$url_from_config' for $service_name ($json_key). Using default: $default_port.${NC}" >&2
    else
         echo -e "${YELLOW}⚠️ URL not found for $service_name (key: $json_key) in $ENV_FILE. Using default: $default_port.${NC}" >&2
    fi

    # Fallback to default
    if [[ -z "$default_port" ]]; then
         echo -e "${RED}❌ No default port defined for $service_name!${NC}" >&2
         return 1 # Indicate failure
    fi
    echo "$default_port"
    return 0
}


# --- Service Start Function ---
start_service() {
  local service=$1
  local port=$2
  local log_file="$ROOT_DIR/${service}_log.txt" # Log in root directory

  echo -e "${YELLOW}🚀 Starting $service on port $port...${NC}"

  local service_dir="$ROOT_DIR/$MFE_ROOT/$service"
  if [ ! -d "$service_dir" ]; then
    echo -e "${RED}❌ Could not find directory for $service at $service_dir${NC}"
    return 1;
  fi
  cd "$service_dir" || return 1;

  # Start shell with 'npm run start', others with 'npm run preview'
  # MAKE SURE the corresponding package.json scripts DON'T have hardcoded --port flags
  if [ "$service" == "shell" ]; then
    echo "Running: npm run start -- --port $port --strictPort"
    # Make sure shell's package.json "start" script doesn't hardcode a port
    npm run start -- --port $port --strictPort > "$log_file" 2>&1 &
  else
    echo "Running: npm run preview -- --port $port --strictPort"
    # Make sure MFE's package.json "preview" script doesn't hardcode a port
    npm run preview -- --port $port --strictPort > "$log_file" 2>&1 &
  fi

  local pid=$!
  # --- PID Tracking Update (simple array) ---
  SERVICE_PIDS+=($pid)
  SERVICE_NAMES_TRACKED+=($service)
  # --- End PID Tracking Update ---


  # Check if process started
  sleep 2
  if ! ps -p $pid > /dev/null; then
    echo -e "${RED}❌ Failed to start $service. Check ${log_file} for details.${NC}"
    return 1
  else
    echo -e "${GREEN}✅ $service started with PID $pid (Logs: $log_file)${NC}"
  fi

  # Return to project root
  cd "$ROOT_DIR" || return 1
  return 0
}

# Function to clean up on exit (using simple PID array)
cleanup() {
  print_header "SHUTTING DOWN FRONTEND SERVICES"
  echo -e "${YELLOW}Stopping all servers...${NC}"

  cd "$ROOT_DIR" || echo "Warning: Could not cd to $ROOT_DIR during cleanup."

  echo "Attempting to stop PIDs: ${SERVICE_PIDS[*]}" # Debugging

  for pid in "${SERVICE_PIDS[@]}"; do # Iterate over simple array
    if [[ ! -z "$pid" ]] && ps -p "$pid" > /dev/null; then
      echo -e "Killing process $pid..."
      kill "$pid" 2>/dev/null
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
  SERVICE_PIDS=() # Clear PIDs
  SERVICE_NAMES_TRACKED=() # Clear names

  echo -e "${GREEN}✅ Frontend shutdown sequence complete.${NC}"
  exit 0
}

# Register cleanup handler
trap cleanup SIGINT SIGTERM

# ========================
# Main Execution
# ========================
print_header "STARTING C4H EDITOR FRONTEND SERVICES"

# Check if MFE directory exists
if [ ! -d "$ROOT_DIR/$MFE_ROOT" ]; then
  echo -e "${RED}❌ MFE directory not found: $ROOT_DIR/$MFE_ROOT${NC}"
  echo -e "${RED}   Please run this script from the project root.${NC}"
  exit 1
fi

# Process environment configuration
print_header "LOADING ENVIRONMENT CONFIGURATION"
if ! process_environment_config; then
    echo -e "${RED}❌ Failed to load environment configuration. Aborting.${NC}"
    exit 1
fi

# --- Check Ports and Start Services ---
print_header "CHECKING PORTS & STARTING SERVICES"
declare -A FINAL_PORTS # Associative array CAN be used here locally if needed, OR use parallel arrays again

start_failed=false
ports_ok=true
ports_to_use=() # Simple array to store ports in order
services_to_start=() # Simple array to store services in order

for service in "${SERVICES[@]}"; do
  target_port=$(get_port_for_frontend_service "$service")
  if [[ $? -ne 0 ]] || [[ -z "$target_port" ]]; then # Check exit code and empty port
      echo -e "${RED}❌ Could not determine port for service '$service'. Check config/defaults.${NC}"
      ports_ok=false
      break
  fi

  # Check port availability
  if ! check_port "$target_port" "$service"; then
      ports_ok=false
      break
  fi
  ports_to_use+=("$target_port") # Store the port
  services_to_start+=("$service") # Store the service
done

if [ "$ports_ok" = false ]; then
    echo -e "${RED}❌ Port conflict detected or configuration error. Aborting startup.${NC}"
    exit 1
fi

# Start services using the determined ports
for i in "${!services_to_start[@]}"; do
  service=${services_to_start[$i]}
  port=${ports_to_use[$i]}
  if ! start_service "$service" "$port"; then
      start_failed=true
      echo -e "${RED}❌ Failed to start $service. Stopping already started services...${NC}"
      cleanup # Trigger cleanup if a service fails to start
      exit 1 # Exit script after cleanup
  fi
  sleep 1 # Stagger slightly
done

# --- Final Status ---
print_header "FRONTEND SERVICES RUNNING"
echo -e "${GREEN}All frontend services should now be running:${NC}"
for i in "${!SERVICE_PIDS[@]}"; do # Use tracked PIDs
    service=${SERVICE_NAMES_TRACKED[$i]}
    port_index=-1
    # Find the port used for this service
    for j in "${!services_to_start[@]}"; do
      if [[ "${services_to_start[$j]}" == "$service" ]]; then
        port_index=$j
        break
      fi
    done
    port=${ports_to_use[$port_index]:-"UNKNOWN"} # Get port or mark unknown
    log_file="$ROOT_DIR/${service}_log.txt"
    echo -e "  - ${BLUE}$service:${NC} http://localhost:$port (Logs: ${BLUE}$log_file${NC})"
done


echo -e "\n${YELLOW}Press Ctrl+C to stop all services${NC}"
wait # Wait for background processes