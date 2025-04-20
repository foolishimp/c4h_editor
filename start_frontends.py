# File: start_frontends.py (Revised v3)
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

# --- Configuration (Ensure SERVICES_CONFIG matches your needs) ---
ROOT_DIR = os.getcwd()
ENV_FILE = os.path.join(ROOT_DIR, "environments.json")
MFE_ROOT = os.path.join(ROOT_DIR, "c4h-micro/packages")

# Service definitions: (package_name, default_port, start_command_type, json_config_key_hint)
SERVICES_CONFIG: List[Tuple[str, int, str, str]] = [
    # MFEs first
    # Ensure json_config_key_hint maps to the CORRECT entry in environments.json for the port
    ("config-selector", 3003, "preview", "config-selector-teams"), # Maps to port 3102 in your JSON
    ("job-management", 3004, "preview", "job-management"),         # Maps to port 3104 in your JSON
    ("yaml-editor", 3002, "preview", "yaml-editor"),             # Maps to port 3002 (needs matching key in JSON)
    # Shell last
    ("shell", 3000, "start", "shell"),                         # Maps to port 3000 (needs matching key in JSON)
]

# --- Colors (Keep GREEN, YELLOW, RED, BLUE, NC) ---
GREEN = '\033[0;32m'
YELLOW = '\033[1;33m'
RED = '\033[0;31m'
BLUE = '\033[0;34m'
NC = '\033[0m'

# --- Global State ---
running_processes: Dict[str, subprocess.Popen] = {}
environment_config: Dict = {}
is_shutting_down = False # Flag to prevent cleanup recursion

# --- Helper Functions (print_header, is_port_in_use, check_port, load_environment_config - keep as before) ---
def print_header(title: str):
    print(f"\n{BLUE}========== {title} =========={NC}")

def is_port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(("127.0.0.1", port))
            return False
        except socket.error:
            return True

def check_port(port: int, service_name: str) -> bool:
    print(f"Checking port {BLUE}{port}{NC} for service {BLUE}{service_name}{NC}...")
    if is_port_in_use(port):
        print(f"{YELLOW}⚠️ Port {port} is in use{NC}")
        try:
            choice = input(f"Kill process using port {port}? (y/n) ").strip().lower()
            if choice == 'y':
                print(f"Attempting to kill process on port {port}...")
                try:
                    if sys.platform == "win32":
                         print(f"{YELLOW}Automatic killing not implemented for Windows...{NC}")
                         return False
                    else: # Linux/macOS
                        cmd = f"lsof -ti tcp:{port} | xargs kill -9"
                        subprocess.run(cmd, shell=True, check=False, capture_output=True)
                    time.sleep(1)
                    if not is_port_in_use(port):
                        print(f"{GREEN}✅ Process killed successfully.{NC}")
                        return True
                    else:
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
        os.environ['VITE_MAIN_BACKEND_URL'] = "http://localhost:8000"
        os.environ['VITE_PREFS_SERVICE_URL'] = "http://localhost:8001"
        os.environ['VITE_YAML_EDITOR_MFE_URL'] = ""
        os.environ['VITE_CONFIG_SELECTOR_WORKFLOWS_URL'] = ""
        os.environ['VITE_CONFIG_SELECTOR_TEAMS_URL'] = ""
        os.environ['VITE_CONFIG_SELECTOR_RUNTIME_URL'] = ""
        os.environ['VITE_JOB_MANAGEMENT_MFE_URL'] = ""
        return True

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
            os.environ['VITE_YAML_EDITOR_MFE_URL'] = ""
            os.environ['VITE_CONFIG_SELECTOR_WORKFLOWS_URL'] = ""
            os.environ['VITE_CONFIG_SELECTOR_TEAMS_URL'] = ""
            os.environ['VITE_CONFIG_SELECTOR_RUNTIME_URL'] = ""
            os.environ['VITE_JOB_MANAGEMENT_MFE_URL'] = ""
            return True

        print(f"{GREEN}Loading configuration for environment: {BLUE}{app_env}{NC}")
        environment_config = all_envs[app_env]

        # Export VITE_ variables
        os.environ['VITE_MAIN_BACKEND_URL'] = environment_config.get('main_backend', {}).get('url', 'http://localhost:8000')
        os.environ['VITE_PREFS_SERVICE_URL'] = environment_config.get('prefs_service', {}).get('url', 'http://localhost:8001')
        os.environ['VITE_YAML_EDITOR_MFE_URL'] = environment_config.get('yaml-editor', {}).get('url', '')
        os.environ['VITE_CONFIG_SELECTOR_WORKFLOWS_URL'] = environment_config.get('config-selector-workflows', {}).get('url', '')
        os.environ['VITE_CONFIG_SELECTOR_TEAMS_URL'] = environment_config.get('config-selector-teams', {}).get('url', '')
        os.environ['VITE_CONFIG_SELECTOR_RUNTIME_URL'] = environment_config.get('config-selector-runtime', {}).get('url', '')
        os.environ['VITE_JOB_MANAGEMENT_MFE_URL'] = environment_config.get('job-management', {}).get('url', '')


        print(f"{GREEN}✅ Environment configuration loaded and VITE_ variables exported.{NC}")
        print(f"   {BLUE}VITE_MAIN_BACKEND_URL={NC}{os.environ.get('VITE_MAIN_BACKEND_URL', 'Not Set')}")
        print(f"   {BLUE}VITE_PREFS_SERVICE_URL={NC}{os.environ.get('VITE_PREFS_SERVICE_URL', 'Not Set')}")
        print(f"   {BLUE}VITE_CONFIG_SELECTOR_TEAMS_URL={NC}{os.environ.get('VITE_CONFIG_SELECTOR_TEAMS_URL', 'Not Set')}")
        print(f"   {BLUE}VITE_JOB_MANAGEMENT_MFE_URL={NC}{os.environ.get('VITE_JOB_MANAGEMENT_MFE_URL', 'Not Set')}")

        return True

    except json.JSONDecodeError:
        print(f"{RED}❌ Error decoding JSON from {ENV_FILE}.{NC}")
        return False
    except Exception as e:
        print(f"{RED}❌ Error processing {ENV_FILE}: {e}{NC}")
        return False
# --- End unchanged helpers ---

# --- CORRECTED Port Finding Logic ---
def get_port_for_frontend_service(service_name: str, default_port: int, json_key_hint: str) -> int:
    """Gets port for frontend service by parsing URL from config or returns default."""
    port = default_port # Start with default
    url = None
    try:
        # Use the specific hint first (e.g., "config-selector-teams", "yaml-editor")
        url = environment_config.get(json_key_hint, {}).get('url')
        # If hint didn't work, try the service name itself as the key
        if not url:
             url = environment_config.get(service_name, {}).get('url')

        if url:
            match = re.search(r':([0-9]+)', url)
            if match:
                port = int(match.group(1))
                # print(f"Debug: Found port {port} for {service_name} from URL {url} using hint {json_key_hint}")
                return port
            else: # Handle default http/https ports if no explicit port
                 url_lower = url.lower()
                 if url_lower.startswith("https://"): return 443
                 if url_lower.startswith("http://"): return 80
                 print(f"{YELLOW}⚠️ Could not extract port from URL '{url}' for {service_name}. Using default: {default_port}{NC}")
        # else:
        #      print(f"{YELLOW}URL not found for {service_name} (hint: {json_key_hint}). Using default: {default_port}{NC}")

    except Exception as e:
        print(f"{YELLOW}Error parsing URL/port for {service_name}: {e}. Using default: {default_port}{NC}")

    # print(f"Debug: Returning default port {port} for {service_name}")
    return port # Return default if URL/port not found or parsing failed
# --- End CORRECTED Port Finding Logic ---

# --- start_frontend_service function remains the same ---
def start_frontend_service(service_name: str, port: int, command_type: str):
    """Starts a frontend service using npm."""
    log_file = os.path.join(ROOT_DIR, f"{service_name}_log.txt")
    service_dir = os.path.join(MFE_ROOT, service_name)

    if not os.path.isdir(service_dir):
        print(f"{RED}❌ Frontend package directory '{service_dir}' not found. Skipping.{NC}")
        return False

    npm_command = "start" if command_type == "start" else "preview"
    cmd = [
        "npm", "run", npm_command, "--",
        "--port", str(port),
        "--strictPort"
    ]

    try:
        print(f"{YELLOW}🚀 Starting {service_name} on port {port} (CMD: {' '.join(cmd)})...{NC}")
        process = subprocess.Popen(
            cmd,
            stdout=open(log_file, 'w'),
            stderr=subprocess.STDOUT,
            cwd=service_dir,
            # Create a new process group on Unix-like systems
            preexec_fn=os.setsid if sys.platform != "win32" else None,
            shell=(sys.platform == "win32") # Needed on Win often for npm
        )
        running_processes[service_name] = process
        time.sleep(3)

        if process.poll() is not None:
            print(f"{RED}❌ Failed to start {service_name} (PID {process.pid}). Check {log_file} for details.{NC}")
            return False
        else:
            print(f"{GREEN}✅ {service_name} started with PID {process.pid}{NC}")
            return True
    except Exception as e:
        print(f"{RED}❌ Exception starting {service_name}: {e}{NC}")
        return False
# --- End start_frontend_service ---


# --- REVISED Cleanup Logic ---
def cleanup(signum=None, frame=None):
    """Gracefully terminates running frontend processes."""
    global is_shutting_down
    # Prevent recursive calls or multiple signals running cleanup simultaneously
    if is_shutting_down:
        return
    is_shutting_down = True

    print_header("SHUTTING DOWN FRONTEND SERVICES")
    print(f"{YELLOW}Stopping all servers...{NC}")
    # Iterate over a copy of the keys/items to avoid modification issues
    processes_to_stop = list(running_processes.items())
    running_processes.clear() # Clear global dict immediately

    for name, process in processes_to_stop:
        if process.poll() is None: # Check if process is still running
            print(f"Stopping {name} (PID: {process.pid})...")
            try:
                # Send SIGTERM to the process group (more likely to kill npm children)
                if sys.platform != "win32":
                    os.killpg(os.getpgid(process.pid), signal.SIGTERM)
                else:
                    # On Windows, subprocess Popen with shell=True might make this tricky
                    # Using taskkill on the parent PID might be necessary if terminate fails
                    process.terminate() # Try standard terminate first

                # Wait for process to terminate
                process.wait(timeout=5) # Wait up to 5 seconds
                print(f"{GREEN}Process {process.pid} for {name} terminated.{NC}")

            except subprocess.TimeoutExpired:
                print(f"{YELLOW}Process {process.pid} for {name} did not terminate, sending SIGKILL...{NC}")
                try:
                    if sys.platform != "win32":
                        os.killpg(os.getpgid(process.pid), signal.SIGKILL)
                    else:
                        # Force kill on windows if terminate failed
                        subprocess.run(f"taskkill /PID {process.pid} /T /F", shell=True, check=False, capture_output=True)
                    process.wait(timeout=2) # Short wait after kill
                    print(f"{GREEN}Process {process.pid} for {name} killed.{NC}")
                except Exception as kill_err:
                    print(f"{RED}Error sending SIGKILL to {name} (PID: {process.pid}): {kill_err}{NC}")
            except ProcessLookupError:
                 print(f"{YELLOW}Process {process.pid} for {name} not found (already terminated?).{NC}")
            except Exception as e:
                print(f"{RED}Error terminating {name} (PID: {process.pid}): {e}{NC}")
        else:
            print(f"Process for {name} (PID: {process.pid}) was already stopped.")

    print(f"{GREEN}✅ Frontend shutdown sequence complete.{NC}")
    # Allow the script to exit naturally after cleanup
    sys.exit(0) # Ensure exit after cleanup

# --- Main Execution (remains mostly the same, uses corrected functions) ---
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Start C4H frontend services.")
    parser.add_argument( "--env", default=os.environ.get("APP_ENV", "development"), help="Environment")
    parser.add_argument( "--services", nargs='+', help="Services to start", default=None)
    args = parser.parse_args()
    APP_ENV = args.env

    # Register signal handlers BEFORE starting processes
    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    print_header("STARTING C4H EDITOR FRONTEND SERVICES")

    if not load_environment_config(APP_ENV):
        sys.exit(1)

    # Determine services to start
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
        if not found: print(f"{YELLOW}⚠️ Service '{name}' not found in config. Skipping.{NC}")
    if not services_to_start_info:
        print(f"{RED}❌ No valid services selected. Exiting.{NC}")
        sys.exit(1)
    print(f"Services to start: {', '.join([info[0] for info in services_to_start_info])}")


    # Check ports
    print_header("CHECKING PORTS")
    ports_ok = True
    final_ports = {}
    # Iterate using tuple unpacking from services_to_start_info
    for service_name, default_port, _, json_key_hint in services_to_start_info:
        # Use the helper function to get the final port
        target_port = get_port_for_frontend_service(service_name, default_port, json_key_hint)
        if not check_port(target_port, service_name):
            ports_ok = False
            break
        final_ports[service_name] = target_port # Store by service dir name

    if not ports_ok:
        print(f"{RED}❌ Port conflict detected. Aborting startup.{NC}")
        sys.exit(1)

    # Start services
    print_header("STARTING SERVICES")
    # Start MFEs first, then shell (services_to_start_info should maintain order from SERVICES_CONFIG)
    for service_name, _, command_type, _ in services_to_start_info:
        port = final_ports[service_name] # Get the final port determined earlier
        if not start_frontend_service(service_name, port, command_type):
            print(f"{RED}❌ Failed to start {service_name}. Stopping already started services...{NC}")
            # Don't exit immediately, let cleanup handle it
            cleanup() # Trigger cleanup explicitly

    # If we reach here and processes are running, keep script alive
    if not running_processes:
         print(f"{RED}❌ No services were started successfully.{NC}")
         sys.exit(1)

    print_header("FRONTEND SERVICES RUNNING")
    print(f"{GREEN}All selected frontend services should now be running:{NC}")
    for service_name, process in running_processes.items():
        port = final_ports[service_name]
        log_file = os.path.join(ROOT_DIR, f"{service_name}_log.txt")
        print(f"  - {BLUE}{service_name}:{NC} http://localhost:{port} (PID: {process.pid}, Logs: {BLUE}{log_file}{NC})")

    print(f"\n{YELLOW}Press Ctrl+C to stop all services{NC}")

    # Keep main script alive while checking processes
    try:
        while True:
            all_stopped = True
            for name, process in list(running_processes.items()):
                 if process.poll() is None:
                    all_stopped = False # At least one is still running
                 else:
                    # Process terminated unexpectedly
                    print(f"{RED}❌ Service '{name}' (PID: {process.pid}) terminated unexpectedly. Exit code: {process.returncode}{NC}")
                    # Remove it so we don't try to kill it later
                    del running_processes[name]
            # If all tracked processes have stopped (maybe due to errors), exit
            if all_stopped and not is_shutting_down:
                 print(f"{YELLOW}All started services have stopped. Exiting script.{NC}")
                 break # Exit the loop, will lead to script exit
            time.sleep(2) # Check every 2 seconds
    except KeyboardInterrupt:
        # This might not be strictly necessary if signal handler works, but good fallback
        if not is_shutting_down:
             cleanup()