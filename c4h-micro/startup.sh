#!/bin/bash
# File: startup.sh
# Description: Builds and starts all C4H Editor microfrontends with Module Federation

# Store the root directory
ROOT_DIR=$(pwd)

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Microfrontend configuration
PACKAGES=("shared" "yaml-editor" "config-selector" "job-management" "shell")
BASE_PORTS=(0 3002 3003 3004 3000)
PORTS=(0 3002 3003 3004 3000) # Will be modified if any port is taken
PORT_INCREMENT=100
PORT_OFFSET=0

# Array to track running PIDs
PIDS=()

# Function to print section header
print_header() {
  echo -e "\n${BLUE}========== $1 ==========${NC}"
}

# Function to check if any port is in use
check_ports() {
  local any_port_taken=false
  
  # First check if any port is taken
  for i in "${!PACKAGES[@]}"; do
    port=${PORTS[$i]}
    if [ "$port" != "0" ] && lsof -ti:$port > /dev/null; then
      echo -e "${YELLOW}⚠️ Port $port is in use by ${PACKAGES[$i]}${NC}"
      any_port_taken=true
    fi
  done
  
  # If any port is taken, increment all ports by PORT_INCREMENT
  if [ "$any_port_taken" = true ]; then
    PORT_OFFSET=$((PORT_OFFSET + PORT_INCREMENT))
    echo -e "${YELLOW}Increasing all ports by $PORT_INCREMENT (offset now: $PORT_OFFSET)${NC}"
    
    # Update all ports
    for i in "${!PACKAGES[@]}"; do
      if [ "${BASE_PORTS[$i]}" != "0" ]; then
        PORTS[$i]=$((BASE_PORTS[$i] + PORT_OFFSET))
      fi
    done
    
    # Recursively check again
    check_ports
  else
    # All ports are available
    echo -e "${GREEN}✅ All required ports are free:${NC}"
    for i in "${!PACKAGES[@]}"; do
      if [ "${PORTS[$i]}" != "0" ]; then
        echo -e "  - ${PACKAGES[$i]}: ${PORTS[$i]}"
      fi
    done
  fi
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
    npm run start -- --port $port --strictPort &
  else
    echo -e "${YELLOW}🚀 Starting $package in preview mode on port $port...${NC}"
    npm run preview -- --port $port --strictPort &
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

# Function to update module federation remotes with new ports
update_remotes_config() {
  local yaml_port=${PORTS[1]}
  local config_port=${PORTS[2]}
  local job_port=${PORTS[3]}
  
  print_header "UPDATING MODULE FEDERATION CONFIG"
  echo -e "${YELLOW}Updating vite.config.ts for shell with new ports${NC}"
  
  local shell_config="$ROOT_DIR/packages/shell/vite.config.ts"
  
  # Create a backup
  cp "$shell_config" "${shell_config}.bak"
  
  # Update remotes in shell config
  sed -i.tmp "s|yamlEditor: 'http://localhost:[0-9]*/assets/remoteEntry.js'|yamlEditor: 'http://localhost:${yaml_port}/assets/remoteEntry.js'|g" "$shell_config"
  sed -i.tmp "s|configSelector: 'http://localhost:[0-9]*/assets/remoteEntry.js'|configSelector: 'http://localhost:${config_port}/assets/remoteEntry.js'|g" "$shell_config"
  sed -i.tmp "s|jobManagement: 'http://localhost:[0-9]*/assets/remoteEntry.js'|jobManagement: 'http://localhost:${job_port}/assets/remoteEntry.js'|g" "$shell_config"
  
  # Update remote in config-selector
  local config_selector_config="$ROOT_DIR/packages/config-selector/vite.config.ts"
  cp "$config_selector_config" "${config_selector_config}.bak"
  sed -i.tmp "s|yamlEditor: 'http://localhost:[0-9]*/assets/remoteEntry.js'|yamlEditor: 'http://localhost:${yaml_port}/assets/remoteEntry.js'|g" "$config_selector_config"
  
  # Clean up temp files
  rm "${shell_config}.tmp" "${config_selector_config}.tmp" 2>/dev/null
  
  echo -e "${GREEN}✅ Configuration files updated with new ports${NC}"
}

# Register cleanup handler
trap cleanup SIGINT SIGTERM

# Main execution starts here
print_header "STARTING C4H EDITOR WITH MICROFRONTENDS"

# Check all ports first
print_header "CHECKING PORTS"
check_ports

# Update configs if ports were changed
if [ "$PORT_OFFSET" -gt 0 ]; then
  update_remotes_config
fi

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
for i in "${!PACKAGES[@]}"; do
  if [ "${PACKAGES[$i]}" == "shell" ]; then
    start_service "shell" "${PORTS[$i]}"
    break
  fi
done

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

# Report port offset if used
if [ "$PORT_OFFSET" -gt 0 ]; then
  echo -e "\n${YELLOW}Note: All ports increased by $PORT_OFFSET from original configuration${NC}"
fi

echo -e "\n${YELLOW}Press Ctrl+C to stop all servers${NC}"

# Wait for all background processes
wait