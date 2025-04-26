# File: start_backends.py (Revised v2)
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
LOG_CONFIG_FILE = os.path.join(ROOT_DIR, "log_config.yaml")

# Service definitions: (dir_name, default_port, uvicorn_target, json_config_key)
SERVICES_CONFIG = [
    ("backend", 8000, "backend.main:app", "main_backend"),
    ("shell_service", 8001, "shell_service.main:app", "prefs_service"), # json_key 'prefs_service'
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

# --- Helper Functions (print_header, is_port_in_use, check_port remain the same) ---
def print_header(title: str):
    print(f"\n{BLUE}========== {title} =========={NC}")

def is_port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            # Try to bind to 0.0.0.0 to check all interfaces
            s.bind(("0.0.0.0", port))
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
                        print(f"{YELLOW}Automatic killing not implemented for Windows. Please kill the process manually.{NC}")
                        return False
                    else:
                        cmd = f"lsof -ti tcp:{port} | xargs kill -9"
                        subprocess.run(cmd, shell=True, check=False, capture_output=True) # Allow failure
                    time.sleep(0.5)
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
# --- End unchanged helpers ---


def load_environment_config(app_env: str) -> bool:
    """Loads config from JSON file and exports variables."""
    global environment_config
    print_header("LOADING ENVIRONMENT CONFIGURATION")
    if not os.path.exists(ENV_FILE):
        print(f"{RED}❌ {ENV_FILE} not found. Using default ports/URLs.{NC}")
        environment_config = {}
        os.environ['MAIN_BACKEND_URL'] = "http://localhost:8000"
        os.environ['PREFS_SERVICE_URL'] = "http://localhost:8001"
        # Set defaults for MFE URLs if needed by backend services
        os.environ['YAML_EDITOR_MFE_URL'] = ""
        os.environ['CONFIG_SELECTOR_MFE_URL'] = ""
        os.environ['JOB_MANAGEMENT_MFE_URL'] = ""
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
            os.environ['MAIN_BACKEND_URL'] = "http://localhost:8000"
            os.environ['PREFS_SERVICE_URL'] = "http://localhost:8001"
            os.environ['YAML_EDITOR_MFE_URL'] = ""
            os.environ['CONFIG_SELECTOR_MFE_URL'] = ""
            os.environ['JOB_MANAGEMENT_MFE_URL'] = ""
            return True

        print(f"{GREEN}Loading configuration for environment: {BLUE}{app_env}{NC}")
        environment_config = all_envs[app_env]

        # --- Updated URL Export Logic ---
        # Use .get('url') from the service object, provide default
        os.environ['MAIN_BACKEND_URL'] = environment_config.get('main_backend', {}).get('url', 'http://localhost:8000')
        os.environ['PREFS_SERVICE_URL'] = environment_config.get('prefs_service', {}).get('url', 'http://localhost:8001')

        # Export MFE URLs needed by shell_service (adjust keys as needed)
        os.environ['YAML_EDITOR_MFE_URL'] = environment_config.get('yaml-editor', {}).get('url', '')
        # Choose one config-selector or provide logic if needed
        os.environ['CONFIG_SELECTOR_MFE_URL'] = environment_config.get('config-selector-teams', {}).get('url', '')
        os.environ['JOB_MANAGEMENT_MFE_URL'] = environment_config.get('job-management', {}).get('url', '')
        # --- End Updated URL Export Logic ---

        print(f"{GREEN}✅ Environment configuration loaded and variables exported.{NC}")
        print(f"   {BLUE}MAIN_BACKEND_URL={NC}{os.environ['MAIN_BACKEND_URL']}")
        print(f"   {BLUE}PREFS_SERVICE_URL={NC}{os.environ['PREFS_SERVICE_URL']}")
        return True

    except json.JSONDecodeError:
        print(f"{RED}❌ Error decoding JSON from {ENV_FILE}.{NC}")
        return False
    except Exception as e:
        print(f"{RED}❌ Error processing {ENV_FILE}: {e}{NC}")
        return False

def get_port_for_service(json_key: str, default_port: int) -> int:
    """Gets port from the service's URL in environment config or returns default."""
    # json_key is 'main_backend' or 'prefs_service'
    try:
        # Get the service's config object
        service_config = environment_config.get(json_key, {})
        # Get the URL from within that object
        url = service_config.get('url')

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
                 else: # Fallback if scheme unknown and port missing
                      print(f"{YELLOW}⚠️ Could not extract port from URL '{url}' for {json_key} and scheme unknown. Using default: {default_port}{NC}")
                      return default_port
        else:
             # URL key not found within the service's object
             print(f"{YELLOW}URL not specified for '{json_key}' in environment. Using default: {default_port}{NC}")
             return default_port
    except Exception as e:
         print(f"{YELLOW}Error parsing URL/port for '{json_key}': {e}. Using default: {default_port}{NC}")
         return default_port
    

# --- start_service function remains the same ---
def start_service(service_name: str, port: int, uvicorn_target: str, json_key: str): # Added json_key
    """Starts a backend service using uvicorn."""
    log_file = os.path.join(ROOT_DIR, f"{service_name}_server.log")
    service_dir = os.path.join(ROOT_DIR, service_name)

    if not os.path.isdir(service_dir):
         print(f"{RED}❌ Service directory '{service_dir}' not found. Skipping startup.{NC}")
         return False

    log_cmd_arg = []
    if os.path.exists(LOG_CONFIG_FILE):
        log_cmd_arg = ["--log-config", LOG_CONFIG_FILE]
        print(f"{YELLOW}🚀 Starting {service_name} on port {port} (using {LOG_CONFIG_FILE}, logging to {log_file})...{NC}")
    else:
        print(f"{YELLOW}⚠️ Log configuration file not found: {LOG_CONFIG_FILE}{NC}")
        print(f"{YELLOW}   Starting {service_name} on port {port} without specific log configuration.{NC}")

    # --- Start Modification ---
    env = os.environ.copy()
    python_path = env.get('PYTHONPATH', '')
    env['PYTHONPATH'] = f"{ROOT_DIR}{os.pathsep}{python_path}"
    env['PORT'] = str(port) # Set PORT env var for the service
    env['APP_ENV'] = APP_ENV # Pass current environment

    # Extract and set data paths from the global environment_config
    service_env_config = environment_config.get(json_key, {}) # Use json_key ('main_backend', 'prefs_service')
    data_paths = service_env_config.get('data_paths', {})
    print(f"  Data paths config for {service_name} ({json_key}): {data_paths}")

    if service_name == "backend": # service_name is the directory name
        repo_root = data_paths.get('repositories_root')
        job_path = data_paths.get('jobs_path')
        if repo_root:
            env['C4H_BACKEND_REPO_ROOT'] = repo_root
            print(f"  Setting C4H_BACKEND_REPO_ROOT={repo_root}")
        else:
            print(f"  {YELLOW}C4H_BACKEND_REPO_ROOT not set (using default in service){NC}")
        if job_path:
            env['C4H_BACKEND_JOB_PATH'] = job_path
            print(f"  Setting C4H_BACKEND_JOB_PATH={job_path}")
        else:
            print(f"  {YELLOW}C4H_BACKEND_JOB_PATH not set (using default in service){NC}")

    elif service_name == "shell_service": # service_name is the directory name
        db_url = data_paths.get('database_url')
        if db_url:
            env['DATABASE_URL'] = db_url # This matches the existing env var used by shell_service
            print(f"  Setting DATABASE_URL={db_url}")
        else:
            print(f"  {YELLOW}DATABASE_URL for shell_service not set (using default in service){NC}")
    # --- End Modification ---

    cmd = [
        sys.executable, "-m", "uvicorn",
        uvicorn_target,
        "--host", "0.0.0.0",
        "--port", str(port),
        "--reload"
    ] + log_cmd_arg

    try:
        print(f"Running command: {' '.join(cmd)}")
        process = subprocess.Popen(
            cmd,
            stdout=open(log_file, 'w'),
            stderr=subprocess.STDOUT,
            cwd=ROOT_DIR,
            env=env, # Use the modified environment
            # Make the child process a group leader on Unix-like systems
            preexec_fn=os.setsid if sys.platform != "win32" else None
        )
        running_processes[service_name] = process
        time.sleep(2)

        if process.poll() is not None:
            print(f"{RED}❌ Failed to start {service_name} (PID {process.pid}). Check {log_file} for details.{NC}")
            return False
        else:
            print(f"{GREEN}✅ {service_name} started with PID {process.pid}{NC}")
            return True
    except Exception as e:
        print(f"{RED}❌ Exception starting {service_name}: {e}{NC}")
        return False

# --- cleanup function remains largely the same, ensures using os.killpg ---
def cleanup(signum=None, frame=None):
    """Gracefully terminates running processes."""
    print_header("SHUTTING DOWN BACKEND SERVICES")
    print(f"{YELLOW}Stopping all servers...{NC}")
    for name, process in list(running_processes.items()):
        if process.poll() is None:
            print(f"Stopping {name} (PID: {process.pid})...")
            try:
                 # Send SIGTERM to the process group on Unix, terminate on Windows
                if sys.platform != "win32":
                    os.killpg(os.getpgid(process.pid), signal.SIGTERM)
                else:
                    process.terminate()
                try:
                    process.wait(timeout=5)
                    print(f"{GREEN}Process {process.pid} terminated gracefully.{NC}")
                except subprocess.TimeoutExpired:
                    print(f"{YELLOW}Process {process.pid} did not terminate gracefully, sending SIGKILL...{NC}")
                    if sys.platform != "win32":
                         os.killpg(os.getpgid(process.pid), signal.SIGKILL)
                    else:
                         process.kill() # Fallback for Windows
                    process.wait()
                    print(f"{GREEN}Process {process.pid} killed.{NC}")
            except ProcessLookupError:
                 print(f"{YELLOW}Process {process.pid} not found (already terminated?).{NC}")
            except Exception as e:
                print(f"{RED}Error terminating process {process.pid}: {e}{NC}")
                try: # Final kill attempt
                    process.kill()
                    process.wait()
                except Exception: pass
        else:
            print(f"Process for {name} (PID: {process.pid}) already stopped.")
        del running_processes[name]

    print(f"{GREEN}✅ Backend shutdown sequence complete.{NC}")
    sys.exit(0)


# --- Main Execution ---
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Start C4H backend services.")
    parser.add_argument(
        "--env",
        default=os.environ.get("APP_ENV", "development"),
        help="Environment to load from environments.json (default: development or APP_ENV)",
    )
    parser.add_argument(
        "--services",
        nargs='+',
        help="Optional: Specify which services to start by name (e.g., --services backend shell_service)",
        default=None
    )
    args = parser.parse_args()
    APP_ENV = args.env

    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    print_header("STARTING C4H EDITOR BACKEND SERVICES")

    if not load_environment_config(APP_ENV):
        sys.exit(1)

    # Reminders
    if not os.environ.get("VIRTUAL_ENV"):
        print(f"{YELLOW}⚠️ Reminder: Make sure you have activated the correct Python virtual environment!{NC}")
        time.sleep(1)
    print(f"{YELLOW}ℹ️  Reminder: Ensure DB environment variable (DATABASE_URL) is set if needed by services.{NC}")
    time.sleep(1)

    # Determine which services to start
    services_to_start_info = []
    all_service_keys = [cfg[0] for cfg in SERVICES_CONFIG]
    target_service_keys = args.services if args.services else all_service_keys

    for key in target_service_keys:
        found = False
        for cfg in SERVICES_CONFIG:
            if cfg[0] == key: # Match against the directory name (first element)
                services_to_start_info.append(cfg)
                found = True
                break
        if not found:
             print(f"{YELLOW}⚠️ Specified service '{key}' not found in SERVICES_CONFIG. Skipping.{NC}")

    if not services_to_start_info:
         print(f"{RED}❌ No valid services selected to start. Exiting.{NC}")
         sys.exit(1)

    print(f"Services to start: {', '.join([info[0] for info in services_to_start_info])}")

    # Check ports
    print_header("CHECKING PORTS")
    ports_ok = True
    final_ports = {}
    # Iterate using tuple unpacking from services_to_start_info
    for service_name, default_port, _, json_key in services_to_start_info:
        # Use the specific json_key ('main_backend' or 'prefs_service') to get the port
        target_port = get_port_for_service(json_key, default_port)
        if not check_port(target_port, service_name):
            ports_ok = False
            break
        final_ports[service_name] = target_port # Store port by service dir name

    if not ports_ok:
        print(f"{RED}❌ Port conflict detected. Aborting startup.{NC}")
        sys.exit(1)

    # Start services
    print_header("STARTING SERVICES")
    start_failed = False
    # Iterate using tuple unpacking from services_to_start_info
    # Make sure services_to_start_info contains the json_key (4th element)
    for service_name, _, uvicorn_target, json_key in services_to_start_info: # Added json_key
         port = final_ports[service_name] # Get the final port determined earlier
         # Pass json_key to start_service
         if not start_service(service_name, port, uvicorn_target, json_key):
             start_failed = True
             print(f"{RED}❌ Failed to start {service_name}. Stopping already started services...{NC}")
             cleanup()

    # Keep script running until interrupted
    print_header("BACKEND SERVICES RUNNING")
    print(f"{GREEN}All selected backend services should now be running:{NC}")
    for service_name, process in running_processes.items():
         port = final_ports[service_name]
         log_file = os.path.join(ROOT_DIR, f"{service_name}_server.log")
         print(f"  - {BLUE}{service_name}:{NC} http://localhost:{port} (PID: {process.pid}, Logs: {BLUE}{log_file}{NC})")

    print(f"\n{YELLOW}Press Ctrl+C to stop all services{NC}")

    try:
        while True:
            time.sleep(1)
            for name, process in list(running_processes.items()):
                 if process.poll() is not None:
                    print(f"{RED}❌ Service '{name}' (PID: {process.pid}) terminated unexpectedly. Exit code: {process.returncode}{NC}")
                    del running_processes[name]
                    # Optionally cleanup() here if one dying means all should stop
    except KeyboardInterrupt:
        cleanup()
        