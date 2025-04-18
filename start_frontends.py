# File: start_frontends.py
import argparse
import json
import os
import signal
import socket
import subprocess
import sys
import time
import re
from typing import Dict, List, Optional, Tuple

# --- Configuration ---
ROOT_DIR = os.getcwd()
ENV_FILE = os.path.join(ROOT_DIR, "environments.json")
MFE_ROOT = os.path.join(ROOT_DIR, "c4h-micro/packages")

# Service definitions: (package_name, default_port, start_command_type, json_config_key_hint)
# json_config_key_hint helps find the right URL in environments.json
# start_command_type: 'preview' for MFEs, 'start' for shell
SERVICES_CONFIG: List[Tuple[str, int, str, str]] = [
    # MFEs first
    ("config-selector", 3003, "preview", "config-selector-teams"), # Assuming this uses port 3003
    ("job-management", 3004, "preview", "job-management"),
    ("yaml-editor", 3002, "preview", "yaml-editor"), # Add yaml-editor if needed
    # Shell last
    ("shell", 3000, "start", "shell"), # 'shell' key might not exist in JSON, relies on default port
]

# --- Colors ---
GREEN = '\033[0;32m'
YELLOW = '\033[1;33m'
RED = '\033[0;31m'
BLUE = '\033[0;34m'
NC = '\033[0m' # No Color

# --- Global State ---
running_processes: Dict[str, subprocess.Popen] = {}
environment_config: Dict = {}

# --- Helper Functions (Shared with backend script, could be refactored) ---
def print_header(title: str):
    """Prints a formatted header."""
    print(f"\n{BLUE}========== {title} =========={NC}")

def is_port_in_use(port: int) -> bool:
    """Checks if a TCP port is already in use."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(("127.0.0.1", port)) # Check specifically on localhost for Node servers
            return False
        except socket.error:
            return True

def check_port(port: int, service_name: str) -> bool:
    """Checks port and prompts user to kill if necessary."""
    print(f"Checking port {BLUE}{port}{NC} for service {BLUE}{service_name}{NC}...")
    if is_port_in_use(port):
        print(f"{YELLOW}⚠️ Port {port} is in use{NC}")
        try:
            choice = input(f"Kill process using port {port}? (y/n) ").strip().lower()
            if choice == 'y':
                print(f"Attempting to kill process on port {port}...")
                try:
                    if sys.platform == "win32":
                         print(f"{YELLOW}Automatic killing not implemented for Windows. Please kill the process manually.{NC}")
                         return False
                    else: # Linux/macOS
                        # Use pkill for Node processes listening on the port
                        cmd = f"lsof -ti tcp:{port} | xargs kill -9"
                        subprocess.run(cmd, shell=True, check=False, capture_output=True) # Allow failure
                    time.sleep(1) # Give kill command time
                    if not is_port_in_use(port):
                        print(f"{GREEN}✅ Process killed successfully.{NC}")
                        return True
                    else:
                        # Sometimes lsof is slow, try pkill as fallback on non-windows
                        if sys.platform != "win32":
                             print(f"{YELLOW}lsof kill might have failed, trying pkill...{NC}")
                             cmd_pkill = f"pkill -f 'port {port}'" # Try finding node process by port arg
                             subprocess.run(cmd_pkill, shell=True, check=False, capture_output=True)
                             time.sleep(1)
                             if not is_port_in_use(port):
                                print(f"{GREEN}✅ Process killed successfully (using pkill).{NC}")
                                return True

                        print(f"{RED}❌ Failed to kill process automatically.{NC}")
                        return False
                except Exception as e:
                    print(f"{RED}❌ Error killing process: {e}{NC}")
                    return False
            else:
                print(f"{RED}❌ Cannot continue with port {port} in use.{NC}")
                return False
        except EOFError:
            print(f"{RED}❌ Cannot continue with port {port} in use (no input for prompt).{NC}")
            return False
    else:
        print(f"{GREEN}✅ Port {port} is free{NC}")
        return True

def load_environment_config(app_env: str) -> bool:
    """Loads config from JSON file and exports VITE_ variables."""
    global environment_config
    print_header("LOADING ENVIRONMENT CONFIGURATION")
    if not os.path.exists(ENV_FILE):
        print(f"{RED}❌ {ENV_FILE} not found. Using default ports/URLs.{NC}")
        environment_config = {}
        # Set defaults required by services even if file missing
        os.environ['VITE_MAIN_BACKEND_URL'] = "http://localhost:8000"
        os.environ['VITE_PREFS_SERVICE_URL'] = "http://localhost:8001"
        return True # Continue with defaults

    try:
        with open(ENV_FILE, 'r') as f:
            all_envs = json.load(f)

        if app_env not in all_envs:
            available = ", ".join(all_envs.keys())
            print(f"{RED}❌ Environment '{app_env}' not found in {ENV_FILE}.{NC}")
            print(f"{YELLOW}   Available: {available}{NC}")
            print(f"{YELLOW}⚠️ Using default ports/URLs.{NC}")
            environment_config = {}
            os.environ['VITE_MAIN_BACKEND_URL'] = "http://localhost:8000"
            os.environ['VITE_PREFS_SERVICE_URL'] = "http://localhost:8001"
            return True # Continue with defaults

        print(f"{GREEN}Loading configuration for environment: {BLUE}{app_env}{NC}")
        environment_config = all_envs[app_env]

        # Export VITE_ variables (Backend URLs)
        # Use .get() to handle potentially missing keys gracefully
        os.environ['VITE_MAIN_BACKEND_URL'] = environment_config.get('main_backend', "http://localhost:8000") # Direct string access
        os.environ['VITE_PREFS_SERVICE_URL'] = environment_config.get('prefs_service', {}).get('url', "http://localhost:8001")

        # Export VITE_ variables (MFE URLs from environment)
        # Iterate through known MFE keys or use a mapping
        os.environ['VITE_YAML_EDITOR_MFE_URL'] = environment_config.get('yaml-editor', {}).get('url', '') # Add if needed
        os.environ['VITE_CONFIG_SELECTOR_WORKFLOWS_URL'] = environment_config.get('config-selector-workflows', {}).get('url', '')
        os.environ['VITE_CONFIG_SELECTOR_TEAMS_URL'] = environment_config.get('config-selector-teams', {}).get('url', '')
        os.environ['VITE_CONFIG_SELECTOR_RUNTIME_URL'] = environment_config.get('config-selector-runtime', {}).get('url', '')
        os.environ['VITE_JOB_MANAGEMENT_MFE_URL'] = environment_config.get('job-management', {}).get('url', '')


        print(f"{GREEN}✅ Environment configuration loaded and VITE_ variables exported.{NC}")
        print(f"   {BLUE}VITE_MAIN_BACKEND_URL={NC}{os.environ['VITE_MAIN_BACKEND_URL']}")
        print(f"   {BLUE}VITE_PREFS_SERVICE_URL={NC}{os.environ['VITE_PREFS_SERVICE_URL']}")
        print(f"   {BLUE}VITE_CONFIG_SELECTOR_TEAMS_URL={NC}{os.environ['VITE_CONFIG_SELECTOR_TEAMS_URL']}") # Example MFE URL
        print(f"   {BLUE}VITE_JOB_MANAGEMENT_MFE_URL={NC}{os.environ['VITE_JOB_MANAGEMENT_MFE_URL']}") # Example MFE URL

        return True

    except json.JSONDecodeError:
        print(f"{RED}❌ Error decoding JSON from {ENV_FILE}.{NC}")
        return False
    except Exception as e:
        print(f"{RED}❌ Error processing {ENV_FILE}: {e}{NC}")
        return False

# Import re at the top
import re

def get_port_for_frontend_service(service_name: str, default_port: int, json_key_hint: str) -> int:
    """Gets port for frontend service by parsing URL from config or returns default."""
    try:
        # Find the URL using the hint or the service name itself as a key
        url = environment_config.get(json_key_hint, {}).get('url')
        if not url:
             url = environment_config.get(service_name, {}).get('url') # Fallback to service name key

        if url:
            # Extract port using regex
            match = re.search(r':([0-9]+)', url) # Find :<numbers>
            if match:
                port = int(match.group(1))
                return port
            else:
                 # Handle default ports for http/https if no explicit port in URL
                 if url.startswith("https://"):
                     return 443
                 elif url.startswith("http://"):
                     return 80
                 else:
                     print(f"{YELLOW}⚠️ Could not extract port from URL '{url}' for {service_name} (hint: {json_key_hint}) and scheme unknown. Using default: {default_port}{NC}")
                     return default_port
        else:
            # Handle case where URL might be missing (e.g. shell might just use default)
            # print(f"{YELLOW}URL not found for {service_name} (hint: {json_key_hint}). Using default: {default_port}{NC}")
            return default_port

    except Exception as e:
        print(f"{YELLOW}Error parsing URL/port for {service_name}: {e}. Using default: {default_port}{NC}")
        return default_port
    

def start_frontend_service(service_name: str, port: int, command_type: str):
    """Starts a frontend service using npm."""
    log_file = os.path.join(ROOT_DIR, f"{service_name}_log.txt")
    service_dir = os.path.join(MFE_ROOT, service_name)

    if not os.path.isdir(service_dir):
        print(f"{RED}❌ Frontend package directory '{service_dir}' not found. Skipping.{NC}")
        return False

    # Ensure package.json scripts DO NOT contain hardcoded --port
    npm_command = "start" if command_type == "start" else "preview"

    # Command construction for npm run <script> -- --port <port> --strictPort
    # Note the extra '--' which tells npm to pass the following args to the script, not npm itself
    cmd = [
        "npm", "run", npm_command, "--",
        "--port", str(port),
        "--strictPort"
    ]

    try:
        print(f"{YELLOW}🚀 Starting {service_name} on port {port} (CMD: {' '.join(cmd)})...{NC}")
        # Run npm command from the service's directory
        process = subprocess.Popen(
            cmd,
            stdout=open(log_file, 'w'),
            stderr=subprocess.STDOUT,
            cwd=service_dir, # Run from the package directory
            # Use shell=True ONLY if necessary (e.g. complex commands not handled by list arg),
            # prefer shell=False for security and control. NPM usually works well without shell=True.
            # shell=True (on Windows might be needed sometimes)
            shell=(sys.platform == "win32") # Be cautious with shell=True
        )
        running_processes[service_name] = process
        time.sleep(3) # Frontend builds can take longer

        if process.poll() is not None:
            print(f"{RED}❌ Failed to start {service_name} (PID {process.pid}). Check {log_file} for details.{NC}")
            return False
        else:
            print(f"{GREEN}✅ {service_name} started with PID {process.pid}{NC}")
            return True
    except Exception as e:
        print(f"{RED}❌ Exception starting {service_name}: {e}{NC}")
        return False

def cleanup(signum=None, frame=None):
    """Gracefully terminates running frontend processes."""
    print_header("SHUTTING DOWN FRONTEND SERVICES")
    print(f"{YELLOW}Stopping all servers...{NC}")
    for name, process in list(running_processes.items()):
        if process.poll() is None:
            print(f"Stopping {name} (PID: {process.pid})...")
            try:
                # On Windows, terminate might not kill child processes (npm script).
                # On Unix, sending SIGTERM to the parent (npm) should often signal children.
                if sys.platform == "win32":
                     # Use taskkill to kill the process tree
                     subprocess.run(f"taskkill /PID {process.pid} /T /F", shell=True, check=False, capture_output=True)
                else:
                     os.killpg(os.getpgid(process.pid), signal.SIGTERM) # Send SIGTERM to process group

                try:
                    process.wait(timeout=5)
                    print(f"{GREEN}Process {process.pid} terminated gracefully.{NC}")
                except subprocess.TimeoutExpired:
                     print(f"{YELLOW}Process {process.pid} did not terminate gracefully, sending SIGKILL...{NC}")
                     if sys.platform == "win32":
                          subprocess.run(f"taskkill /PID {process.pid} /T /F", shell=True, check=False, capture_output=True)
                     else:
                          os.killpg(os.getpgid(process.pid), signal.SIGKILL) # Send SIGKILL to process group
                     process.wait() # Wait for kill
                     print(f"{GREEN}Process {process.pid} killed.{NC}")
            except Exception as e:
                print(f"{RED}Error terminating process {process.pid}: {e}{NC}")
                # Try final kill just in case
                try:
                     process.kill()
                     process.wait()
                except Exception as ke:
                     print(f"{RED}Error killing process {process.pid}: {ke}{NC}")
        else:
            print(f"Process for {name} (PID: {process.pid}) already stopped.")
        del running_processes[name]

    print(f"{GREEN}✅ Frontend shutdown sequence complete.{NC}")
    sys.exit(0)

# --- Main Execution ---
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Start C4H frontend services.")
    parser.add_argument(
        "--env",
        default=os.environ.get("APP_ENV", "development"),
        help="Environment to load from environments.json (default: development or APP_ENV)",
    )
    parser.add_argument(
        "--services",
        nargs='+',
        help="Optional: Specify which frontend services to start by name (e.g., --services shell config-selector)",
        default=None # Start all if not specified
    )
    args = parser.parse_args()
    APP_ENV = args.env

    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    print_header("STARTING C4H EDITOR FRONTEND SERVICES")

    if not load_environment_config(APP_ENV):
        sys.exit(1)

    # Determine which services to start
    services_to_start_info = []
    all_service_names = [cfg[0] for cfg in SERVICES_CONFIG]
    target_service_names = args.services if args.services else all_service_names

    for name in target_service_names:
        found = False
        for cfg in SERVICES_CONFIG:
            if cfg[0] == name:
                services_to_start_info.append(cfg)
                found = True
                break
        if not found:
             print(f"{YELLOW}⚠️ Specified service '{name}' not found in SERVICES_CONFIG. Skipping.{NC}")

    if not services_to_start_info:
         print(f"{RED}❌ No valid services selected to start. Exiting.{NC}")
         sys.exit(1)

    print(f"Services to start: {', '.join([info[0] for info in services_to_start_info])}")


    # Check ports
    print_header("CHECKING PORTS")
    ports_ok = True
    final_ports = {}
    for service_name, default_port, _, json_key_hint in services_to_start_info:
        target_port = get_port_for_frontend_service(service_name, default_port, json_key_hint)
        if not check_port(target_port, service_name):
            ports_ok = False
            break
        final_ports[service_name] = target_port

    if not ports_ok:
        print(f"{RED}❌ Port conflict detected. Aborting startup.{NC}")
        sys.exit(1)

    # Start services
    print_header("STARTING SERVICES")
    start_failed = False
    # Start MFEs first, then shell (services_to_start_info is already ordered this way)
    for service_name, _, command_type, _ in services_to_start_info:
        port = final_ports[service_name]
        if not start_frontend_service(service_name, port, command_type):
            start_failed = True
            print(f"{RED}❌ Failed to start {service_name}. Stopping already started services...{NC}")
            cleanup()

    print_header("FRONTEND SERVICES RUNNING")
    print(f"{GREEN}All selected frontend services should now be running:{NC}")
    for service_name, process in running_processes.items():
        port = final_ports[service_name]
        log_file = os.path.join(ROOT_DIR, f"{service_name}_log.txt")
        print(f"  - {BLUE}{service_name}:{NC} http://localhost:{port} (PID: {process.pid}, Logs: {BLUE}{log_file}{NC})")

    print(f"\n{YELLOW}Press Ctrl+C to stop all services{NC}")

    try:
        while True:
            time.sleep(1)
            for name, process in list(running_processes.items()):
                 if process.poll() is not None:
                    print(f"{RED}❌ Service '{name}' (PID: {process.pid}) terminated unexpectedly. Exit code: {process.returncode}{NC}")
                    del running_processes[name]
                    # Decide if you want to stop everything if one MFE dies
                    # cleanup()

    except KeyboardInterrupt:
        cleanup()