#!/usr/bin/env python3
# File: start_frontends.py (ESM Microfrontend Architecture)
# --- MODIFIED: Added build step for 'shared' package ---
# --- MODIFIED: Updated port resolution logic for config-selector ---
import argparse
import json
import os
import signal
import socket
import subprocess
import sys
import time
import re
from typing import Dict, List, Tuple, Optional
from urllib.parse import urlparse

# --- Configuration ---
ROOT_DIR = os.getcwd()
ENV_FILE = os.path.join(ROOT_DIR, "environments.json")
MFE_ROOT = os.path.join(ROOT_DIR, "c4h-micro/packages") # Assuming script runs from project root

# Service definitions: (package_name, default_port)
# NOTE: config-selector default port 3003 is now primarily a fallback.
# The script will try to find the actual port from environments.json using
# workorder, teamconfig, or runtimeconfig keys.
SERVICES_CONFIG: List[Tuple[str, int]] = [
    ("shared", 0), # Port 0 means it doesn't need to be started as a server
    ("yaml-editor", 3005),
    ("config-selector", 3003), # Default fallback port
    ("job-management", 3004),
    ("test-app", 3006),
    ("shell", 3100), # Explicitly different from vite default
]

# Keys in environments.json that point to the config-selector MFE
CONFIG_SELECTOR_ENV_KEYS = ["workorder", "teamconfig", "runtimeconfig"]


# --- Colors ---
GREEN = '\033[0;32m'
YELLOW = '\033[1;33m'
RED = '\033[0;31m'
BLUE = '\033[0;34m'
NC = '\033[0m' # No Color

# --- Global State ---
running_processes: Dict[str, subprocess.Popen] = {}
environment_config: Dict = {}
is_shutting_down = False

def get_port_from_url(url: str) -> Optional[int]:
    """Extracts the port number from a URL string."""
    try:
        parsed_url = urlparse(url)
        return parsed_url.port
    except Exception:
        return None

def print_header(title: str):
    """Prints a formatted header."""
    print(f"\n{BLUE}========== {title} =========={NC}")

def is_port_in_use(port: int) -> bool:
    """Checks if a local port is already in use."""
    if port == 0:
        return False
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            # Try to bind to 127.0.0.1 to check if the port is busy on localhost
            s.bind(("127.0.0.1", port))
            return False
        except socket.error:
            # If binding fails, the port is likely in use
            return True

def check_port(port: int, service_name: str) -> bool:
    """Checks if a port is available and optionally tries to kill the process using it."""
    if port == 0:
        # Port 0 means the service doesn't run on a port (e.g., 'shared')
        return True

    print(f"Checking port {BLUE}{port}{NC} for service {BLUE}{service_name}{NC}...")
    if is_port_in_use(port):
        print(f"{YELLOW}⚠️ Port {port} is in use{NC}")
        try:
            # Prompt user only if input is available (not in CI/headless env)
            if sys.stdin.isatty():
                choice = input(f"Kill process using port {port}? (y/n) ").strip().lower()
            else:
                print(f"{YELLOW}Cannot prompt for input. Assuming 'n'.{NC}")
                choice = 'n'

            if choice == 'y':
                print(f"Attempting to kill process on port {port}...")
                try:
                    pid_found = False
                    if sys.platform == "win32":
                        # Windows: Find PID using netstat and kill using taskkill
                        find_cmd = f'netstat -ano | findstr ":{port}" | findstr "LISTENING"'
                        result = subprocess.run(find_cmd, shell=True, capture_output=True, text=True, check=False)
                        for line in result.stdout.splitlines():
                            parts = line.split()
                            if len(parts) >= 5:
                                pid = parts[-1]
                                try:
                                    int(pid) # Ensure pid is a number
                                    print(f"Attempting to kill process with PID {pid} using port {port}...")
                                    kill_cmd = f"taskkill /PID {pid} /T /F"
                                    kill_result = subprocess.run(kill_cmd, shell=True, check=False, capture_output=True)
                                    if kill_result.returncode == 0:
                                        print(f"{GREEN}Successfully sent kill signal to PID {pid}.{NC}")
                                        pid_found = True
                                    else:
                                        print(f"{YELLOW}Taskkill command for PID {pid} failed (maybe already closed): {kill_result.stderr.strip()}{NC}")
                                    # Wait briefly even if kill failed, port might become free
                                    time.sleep(1)
                                except ValueError:
                                    continue # Skip if PID is not an integer
                    else:
                        # Linux/macOS: Find PID using lsof and kill using kill -9
                        # Using pkill for potentially broader matching if lsof fails
                        kill_commands = [
                             f"lsof -ti tcp:{port} | xargs kill -9",
                             f"pkill -f ':{port}'" # Fallback attempt
                        ]
                        for cmd in kill_commands:
                             print(f"Running command: {cmd}")
                             kill_result = subprocess.run(cmd, shell=True, check=False, capture_output=True)
                             if kill_result.returncode == 0:
                                 print(f"{GREEN}Successfully sent kill signal via '{cmd.split()[0]}'.{NC}")
                                 pid_found = True
                                 break # Stop trying if one command succeeds
                             else:
                                 print(f"{YELLOW}Command '{cmd.split()[0]}' failed or found no process (this might be okay).{NC}")
                             time.sleep(0.5)

                    if pid_found:
                        print(f"{YELLOW}Waiting a moment after attempting kill...{NC}")
                        time.sleep(2) # Wait longer after attempting kill

                    if not is_port_in_use(port):
                        print(f"{GREEN}✅ Port {port} is now free.{NC}")
                        return True
                    else:
                        print(f"{RED}❌ Failed to free port {port}. It might be held by a privileged process or didn't terminate.{NC}")
                        return False

                except Exception as e:
                    print(f"{RED}❌ Error during process kill attempt: {e}{NC}")
                    return False
            else:
                print(f"{RED}❌ Port conflict not resolved.{NC}")
                return False
        except EOFError:
            # Handle cases where input cannot be read (e.g., running in a non-interactive environment)
            print(f"{RED}❌ Cannot prompt for input (EOFError). Port conflict not resolved.{NC}")
            return False
    else:
        print(f"{GREEN}✅ Port {port} is free{NC}")
        return True

def load_environment_config(app_env: str) -> bool:
    """Loads config from JSON file and exports necessary variables."""
    global environment_config
    print_header("LOADING ENVIRONMENT CONFIGURATION")
    if not os.path.exists(ENV_FILE):
        print(f"{YELLOW}⚠️ {ENV_FILE} not found. Using default configurations.{NC}")
        environment_config = {}
        # Set default prefs service URL directly if file not found
        os.environ['VITE_PREFS_SERVICE_URL'] = "http://localhost:8011"
        print(f"   - Default Prefs Service URL: {os.environ['VITE_PREFS_SERVICE_URL']}")
        return True

    try:
        with open(ENV_FILE, 'r') as f:
            all_envs = json.load(f)

        if app_env not in all_envs:
            print(f"{YELLOW}⚠️ Environment '{app_env}' not found in {ENV_FILE}. Using defaults.{NC}")
            environment_config = {}
            # Set default prefs service URL directly if env not found
            os.environ['VITE_PREFS_SERVICE_URL'] = "http://localhost:8011"
            print(f"   - Default Prefs Service URL: {os.environ['VITE_PREFS_SERVICE_URL']}")
            return True

        print(f"Loading configuration for environment: {BLUE}{app_env}{NC}")
        environment_config = all_envs[app_env]

        # Set environment variable needed by the shell MFE for its own configuration
        # It needs to know where the shell_service (prefs_service) is running
        prefs_url = environment_config.get('prefs_service', {}).get('url', 'http://localhost:8011')
        os.environ['VITE_PREFS_SERVICE_URL'] = prefs_url

        print(f"{GREEN}✅ Environment configuration loaded for frontend startup.{NC}")
        print(f"   - Prefs Service URL for Shell MFE: {os.environ['VITE_PREFS_SERVICE_URL']}")
        return True
    except json.JSONDecodeError as e:
        print(f"{RED}❌ Error parsing {ENV_FILE}: {e}. Please check the JSON syntax.{NC}")
        return False
    except Exception as e:
        print(f"{RED}❌ Error processing {ENV_FILE}: {e}{NC}")
        return False

def resolve_service_ports(target_service_names: List[str], app_env: str) -> List[Tuple[str, int]]:
    """Resolves the target port for each service based on environment config."""
    resolved_services = []
    print_header(f"RESOLVING PORTS FOR ENVIRONMENT: {app_env}")

    for service_name, default_port in SERVICES_CONFIG:
        if service_name not in target_service_names:
            continue

        resolved_port = default_port
        service_url = None
        url_source_key = service_name # Default key to check

        # --- Updated logic for config-selector ---
        if service_name == "config-selector":
            found_key = None
            # Look for any of the actual config type keys in environments.json
            # Use the URL/port from the first one found (they should all be the same for config-selector)
            for key in CONFIG_SELECTOR_ENV_KEYS:
                if key in environment_config:
                    service_url = environment_config[key].get('url')
                    found_key = key
                    if service_url: # Stop if we found a valid URL
                        print(f"{YELLOW}Note: Using URL from '{found_key}' ('{service_url}') for service '{service_name}'.{NC}")
                        break
            if not service_url:
                 print(f"{YELLOW}Could not find URL for keys {CONFIG_SELECTOR_ENV_KEYS} in {args.env} config for '{service_name}'.{NC}")
            url_source_key = found_key if found_key else service_name # Update source key for logging

        elif service_name in environment_config:
            # Standard lookup for other services
            service_url = environment_config[service_name].get('url')
        # --- End Updated logic ---

        if service_url:
            parsed_port = get_port_from_url(service_url)
            if parsed_port is not None:
                resolved_port = parsed_port
                print(f"{GREEN}✅ Resolved port {resolved_port} for {service_name} from URL ('{service_url}' via key '{url_source_key}').{NC}")
            elif service_name != "shared":
                 print(f"{YELLOW}⚠️ Could not parse port from URL '{service_url}' (via key '{url_source_key}') for {service_name}. Using default: {default_port}.{NC}")
        elif service_name != "shared":
             print(f"{YELLOW}⚠️ No URL found for {service_name} (checked key '{url_source_key}') in {args.env} config. Using default port: {default_port}.{NC}")

        resolved_services.append((service_name, resolved_port))

    if not resolved_services:
         print(f"{RED}❌ No valid services selected or found in config.{NC}")
         sys.exit(1)

    print(f"Services to handle: {', '.join([f'{name}({port})' if port != 0 else name for name, port in resolved_services])}")
    return resolved_services


def build_shared_package() -> bool:
    """Builds the shared package."""
    print_header("BUILDING SHARED PACKAGE")
    shared_dir = os.path.join(MFE_ROOT, "shared")
    if not os.path.isdir(shared_dir):
        print(f"{YELLOW}⚠️ Shared package directory not found at {shared_dir}. Skipping build.{NC}")
        return True # Not a critical failure if dir doesn't exist

    print(f"Running build in {shared_dir}...")
    # Assuming pnpm based on project structure, adjust if using npm/yarn
    build_cmd = ["pnpm", "run", "build"]
    try:
        # Run build command, capture output
        result = subprocess.run(build_cmd, cwd=shared_dir, check=True, capture_output=True, text=True, timeout=120) # Added timeout
        print(f"{GREEN}✅ 'shared' package built successfully.{NC}")
        # Optionally print stdout/stderr from build if needed for debugging
        # print("Build Output:\n", result.stdout)
        # print("Build Errors:\n", result.stderr)
        return True
    except subprocess.CalledProcessError as e:
        print(f"{RED}❌ Failed to build 'shared' package. Error:{NC}")
        print(e.stderr) # Print build errors
        return False # Critical failure
    except subprocess.TimeoutExpired:
        print(f"{RED}❌ Timed out waiting for 'shared' package build to complete.{NC}")
        return False # Critical failure
    except FileNotFoundError:
         print(f"{RED}❌ Build command ('pnpm run build') failed. Is 'pnpm' installed and in PATH?{NC}")
         return False # Critical failure
    except Exception as e:
         print(f"{RED}❌ An unexpected error occurred during shared build: {e}{NC}")
         return False


def start_service(service_name: str, port: int) -> bool:
    """Starts a frontend service using npx vite directly."""
    if port == 0:
        # Service doesn't need starting (e.g., 'shared')
        return True

    service_dir = os.path.join(MFE_ROOT, service_name)
    if not os.path.isdir(service_dir):
        print(f"{RED}❌ Service directory not found: {service_dir}{NC}")
        return False

    log_file_path = os.path.join(ROOT_DIR, f"{service_name}_vite_log.txt") # Renamed log file

    # Use npx to ensure vite is available without global install
    # '-y' flag avoids confirmation prompts for installing vite temporarily
    cmd = [
        "npx", "-y",
        "vite",
        "--port", str(port),
        "--strictPort" # Ensure vite fails if port is already used (redundant check)
    ]

    print(f"Running command: {' '.join(cmd)} in {service_dir}")

    try:
        print(f"{YELLOW}🚀 Starting {service_name} on port {port}... (Log: {log_file_path}){NC}")
        # Open log file in write mode, will overwrite previous logs
        with open(log_file_path, 'w') as log_file:
            process = subprocess.Popen(
                cmd,
                stdout=log_file,
                stderr=subprocess.STDOUT, # Redirect stderr to stdout (goes to log file)
                cwd=service_dir,
                # Create a process group on Unix-like systems for easier cleanup
                preexec_fn=os.setsid if sys.platform != "win32" else None,
                # Use shell=True ONLY on Windows for npx compatibility issues sometimes
                shell=(sys.platform == "win32"),
                # Pass current environment variables
                env=os.environ.copy()
            )
        running_processes[service_name] = process
        # Wait a few seconds for the server to potentially start or fail
        time.sleep(5) # Increased wait time

        # Check if the process exited immediately
        if process.poll() is not None:
            print(f"{RED}❌ Failed to start {service_name}. Process exited code {process.returncode}. Check {log_file_path}{NC}")
            return False
        else:
            # Try reading the log file to confirm the port
            try:
                 with open(log_file_path, 'r') as lf:
                      log_content = lf.read()
                 # Regex to find 'Local: http://...' or 'Network: http://...' lines
                 match = re.search(r'(?:Local|Network):\s+http://[^\s:]+:(\d+)/', log_content)
                 if match:
                      actual_port = int(match.group(1))
                      if actual_port == port:
                          print(f"{GREEN}✅ {service_name} started (PID {process.pid}) and listening on expected port {port}{NC}")
                      else:
                           # This shouldn't happen with --strictPort, but log if it does
                           print(f"{YELLOW}⚠️ {service_name} started (PID {process.pid}) but on UNEXPECTED port {actual_port} (expected {port}). Check {log_file_path}{NC}")
                 else:
                      print(f"{YELLOW}⚠️ {service_name} started (PID {process.pid}) but could not confirm listening port from log. Check {log_file_path}{NC}")

            except Exception as e:
                 # Non-critical error if log parsing fails
                 print(f"{YELLOW}Note: Could not read port from log file for {service_name}: {e}{NC}")
            return True # Assume started if process didn't exit immediately

    except FileNotFoundError:
         # Error if 'npx' command isn't found
         print(f"{RED}❌ Start command failed for {service_name}. Is 'npx' installed and in your PATH?{NC}")
         return False
    except Exception as e:
        # Catch any other exceptions during process start
        print(f"{RED}❌ Exception starting {service_name}: {e}{NC}")
        return False

def cleanup(signum=None, frame=None):
    """Gracefully terminates running subprocesses."""
    global is_shutting_down
    if is_shutting_down:
        return # Avoid running cleanup multiple times
    is_shutting_down = True

    print_header("SHUTTING DOWN FRONTEND SERVICES")
    # Create a copy of the items to avoid modifying the dict while iterating
    processes_to_stop = list(running_processes.items())
    # Clear the global dict immediately
    running_processes.clear()

    for name, process in processes_to_stop:
        if process.poll() is None: # Check if the process is still running
            print(f"Stopping {name} (PID {process.pid})...")
            try:
                # Terminate the process group on Unix-like systems, terminate single process on Windows
                if sys.platform != "win32":
                    os.killpg(os.getpgid(process.pid), signal.SIGTERM)
                else:
                    # On Windows, terminate the specific process started
                    process.terminate()

                # Wait for the process to terminate
                process.wait(timeout=5) # Wait up to 5 seconds
                print(f"{GREEN}✅ {name} stopped gracefully.{NC}")
            except subprocess.TimeoutExpired:
                # Force kill if graceful shutdown fails
                print(f"{YELLOW}⚠️ {name} did not stop gracefully, forcing kill...{NC}")
                try:
                    if sys.platform != "win32":
                        os.killpg(os.getpgid(process.pid), signal.SIGKILL)
                    else:
                        # Force kill on Windows using taskkill
                        subprocess.run(f"taskkill /PID {process.pid} /T /F", shell=True, check=False, capture_output=True)
                    # Wait briefly after force kill
                    process.wait(timeout=2)
                    print(f"{GREEN}✅ {name} force killed.{NC}")
                except Exception as e:
                    print(f"{RED}❌ Error force killing {name} (PID: {process.pid}): {e}{NC}")
            except Exception as e:
                # Catch other errors during termination
                print(f"{RED}❌ Error stopping {name} (PID: {process.pid}): {e}{NC}")
        else:
             # Process already stopped
             print(f"{YELLOW}✅ {name} (PID: {process.pid}) was already stopped.{NC}")

    print(f"{GREEN}✅ Frontend shutdown complete.{NC}")
    # Ensure script exits cleanly after cleanup
    sys.exit(0)

# --- Main Execution ---
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Start C4H Editor Microfrontends in Dev Mode")
    parser.add_argument(
        "--env",
        default=os.environ.get("APP_ENV", "development"), # Allow setting via env var
        help="Environment name (must match a key in environments.json, default: development or APP_ENV)"
    )
    parser.add_argument(
        "--services",
        nargs='+',
        help="Specific services (package names) to start (e.g., shell job-management)",
        default=None # Start all defined services if not specified
    )
    args = parser.parse_args()

    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, cleanup) # Ctrl+C
    signal.signal(signal.SIGTERM, cleanup) # Kill command

    print_header("STARTING C4H EDITOR MICROFRONTENDS (DEV MODE)")

    # Load environment configuration first
    if not load_environment_config(args.env):
        sys.exit(1)

    # Determine which services to start based on arguments or defaults
    target_service_names = args.services if args.services else [cfg[0] for cfg in SERVICES_CONFIG]

    # Resolve ports for the target services
    final_services_config = resolve_service_ports(target_service_names, args.env)

    # Check port availability before starting anything
    print_header("CHECKING PORTS")
    ports_ok = True
    final_ports = {} # Store resolved ports by service name
    for service_name, port in final_services_config:
        if not check_port(port, service_name):
            ports_ok = False
            # Don't break immediately, check all ports first
            # break
        final_ports[service_name] = port

    if not ports_ok:
        print(f"{RED}❌ Port checks failed. Aborting startup.{NC}")
        sys.exit(1)

    # Build the shared package (important dependency)
    if not build_shared_package():
        print(f"{RED}❌ Critical failure building shared package. Aborting.{NC}")
        sys.exit(1)

    # Start the selected services
    print_header("STARTING SERVICES (DEV MODE)")
    start_success_count = 0
    start_failed_count = 0
    for service_name, port in final_services_config:
        # Use the potentially updated port from final_ports
        actual_port = final_ports.get(service_name, port)
        if actual_port > 0: # Only start services with a valid port > 0
            if start_service(service_name, actual_port):
                 start_success_count += 1
            else:
                 start_failed_count += 1
                 print(f"{RED}❌ Critical failure starting {service_name}. Initiating cleanup...{NC}")
                 # Decide if one failure should stop everything (optional)
                 # cleanup()
                 # sys.exit(1)

    if start_failed_count > 0:
        print(f"{RED}❌ {start_failed_count} service(s) failed to start.{NC}")
        # Optionally cleanup if any service failed to start
        cleanup()
        sys.exit(1)
    elif start_success_count == 0:
         print(f"{YELLOW}⚠️ No services were targeted or successfully started.{NC}")
         sys.exit(0) # Exit cleanly if no services were meant to run

    # If we reach here, at least one service started successfully
    print_header("SERVICES RUNNING (DEV MODE)")
    for service_name, process in running_processes.items():
         # Get the port this service is actually running on
         port = final_ports.get(service_name, "N/A")
         log_file_path = os.path.join(ROOT_DIR, f"{service_name}_vite_log.txt")
         print(f"  - {BLUE}{service_name}{NC}: http://localhost:{port} (PID: {process.pid}, Logs: {BLUE}{log_file_path}{NC})")

    print(f"\n{YELLOW}Press Ctrl+C to stop all services.{NC}")

    # Keep the script running to monitor the child processes
    try:
        while True:
            # Check if any monitored process has terminated unexpectedly
            for name, process in list(running_processes.items()): # Iterate over a copy
                if process.poll() is not None: # Check if process ended
                    print(f"\n{RED}❌ Service '{name}' (PID {process.pid}) terminated unexpectedly. Exit code: {process.returncode}{NC}")
                    print(f"{YELLOW}   Check logs: {os.path.join(ROOT_DIR, f'{name}_vite_log.txt')}{NC}")
                    # Remove the terminated process from monitoring
                    del running_processes[name]
            # If no processes are left running, exit
            if not running_processes:
                print(f"{YELLOW}All monitored services have stopped. Exiting.{NC}")
                break
            # Sleep briefly to avoid busy-waiting
            time.sleep(2)
    except KeyboardInterrupt:
        # Handle Ctrl+C gracefully
        print("\nCtrl+C detected.")
        cleanup()
    finally:
        # Ensure cleanup runs even if the loop breaks for other reasons
        if not is_shutting_down:
             cleanup()