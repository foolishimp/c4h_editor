#!/usr/bin/env python3
# File: start_frontends.py (ESM Microfrontend Architecture)
# --- MODIFIED TO USE 'npm run dev' CONSISTENTLY ---
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
MFE_ROOT = os.path.join(ROOT_DIR, "c4h-micro/packages")

# Service definitions: (package_name, default_port, needs_build_first)
# default_port is now used as a fallback ONLY if port cannot be determined from environments.json
SERVICES_CONFIG: List[Tuple[str, int, bool]] = [
    ("shared", 0, True),
    ("yaml-editor", 3002, True),
    ("config-selector", 3003, True), # This package might serve multiple logical apps on the same port
    ("job-management", 3004, True),
    ("test-app", 3005, True),
    ("shell", 3000, True),
]

# --- Colors ---
GREEN = '\033[0;32m'
YELLOW = '\033[1;33m'
RED = '\033[0;31m'
BLUE = '\033[0;34m'
NC = '\033[0m'

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
    print(f"\n{BLUE}========== {title} =========={NC}")

def is_port_in_use(port: int) -> bool:
    if port == 0:
        return False
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            # Try to bind to the port
            s.bind(("127.0.0.1", port))
            # If bind succeeds, port is free
            return False
        except socket.error:
            # If bind fails, port is likely in use
            return True

def check_port(port: int, service_name: str) -> bool:
    """Checks if a port is available and optionally tries to kill the process using it."""
    if port == 0: # Port 0 means the service doesn't need a port (e.g., shared library)
        return True

    print(f"Checking port {BLUE}{port}{NC} for service {BLUE}{service_name}{NC}...")
    if is_port_in_use(port):
        print(f"{YELLOW}⚠️ Port {port} is in use{NC}")
        try:
            choice = input(f"Kill process using port {port}? (y/n) ").strip().lower()
            if choice == 'y':
                try:
                    if sys.platform == "win32":
                        # Command to find and kill process by port on Windows
                        find_cmd = f"netstat -ano | findstr :{port}"
                        result = subprocess.run(find_cmd, shell=True, capture_output=True, text=True)
                        pid_found = False
                        for line in result.stdout.splitlines():
                            if f':{port}' in line and 'LISTENING' in line:
                                parts = line.split()
                                pid = parts[-1]
                                print(f"Attempting to kill process with PID {pid} using port {port}...")
                                kill_cmd = f"taskkill /PID {pid} /T /F"
                                subprocess.run(kill_cmd, shell=True, check=False, capture_output=True)
                                pid_found = True
                        if not pid_found:
                             print(f"{YELLOW}Could not find specific PID listening on port {port}. Maybe it's already closing?{NC}")

                    else: # Linux/macOS
                        cmd = f"lsof -ti tcp:{port} | xargs kill -9"
                        subprocess.run(cmd, shell=True, check=False, capture_output=True)

                    print(f"{YELLOW}Waiting a moment after attempting kill...{NC}")
                    time.sleep(2) # Increased wait time
                    if not is_port_in_use(port):
                         print(f"{GREEN}✅ Port {port} is now free.{NC}")
                         return True
                    else:
                         print(f"{RED}❌ Failed to free port {port}. It might be held by a privileged process or did not terminate.{NC}")
                         return False

                except Exception as e:
                    print(f"{RED}❌ Error during process kill attempt: {e}{NC}")
                    return False
            else:
                 print(f"{RED}❌ Port conflict not resolved.{NC}")
                 return False # User chose not to kill
        except EOFError: # Handle case where input stream is closed (e.g., running non-interactively)
             print(f"{RED}❌ Cannot prompt for input (EOFError). Port conflict not resolved.{NC}")
             return False
    else:
        print(f"{GREEN}✅ Port {port} is free{NC}")
        return True


def fix_typescript_config(package_dir: str) -> bool:
    """Modifies tsconfig.json to disable strict unused checks."""
    tsconfig_path = os.path.join(package_dir, "tsconfig.json")
    if not os.path.exists(tsconfig_path):
        print(f"{YELLOW}No tsconfig.json found in {package_dir}, skipping fix.{NC}")
        return True # Return True as there's nothing to fix

    print(f"{YELLOW}Adjusting TypeScript configuration in {tsconfig_path}...{NC}")
    try:
        with open(tsconfig_path, 'r', encoding='utf-8') as f:
            # Use regex to remove trailing commas before attempting JSON load
            content = f.read()
            # Remove trailing commas from objects and arrays
            content = re.sub(r',\s*([}\]])', r'\1', content)
            config = json.loads(content) # Load the cleaned content

        # Ensure compilerOptions exists
        if 'compilerOptions' not in config:
            config['compilerOptions'] = {}

        # Disable noUnusedLocals and noUnusedParameters
        config['compilerOptions']['noUnusedLocals'] = False
        config['compilerOptions']['noUnusedParameters'] = False

        with open(tsconfig_path, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2) # Write back with indentation

        print(f"{GREEN}✅ Successfully adjusted tsconfig.json for {os.path.basename(package_dir)}.{NC}")
        return True
    except json.JSONDecodeError as e:
        print(f"{RED}❌ Error decoding JSON in {tsconfig_path}: {e}{NC}")
        print(f"{YELLOW}   Please check the file for syntax errors (e.g., trailing commas, missing quotes).{NC}")
        return False
    except Exception as e:
        print(f"{RED}❌ Error modifying tsconfig.json in {package_dir}: {e}{NC}")
        return False


def load_environment_config(app_env: str) -> bool:
    global environment_config
    print_header("LOADING ENVIRONMENT CONFIGURATION")

    if not os.path.exists(ENV_FILE):
        print(f"{YELLOW}⚠️ {ENV_FILE} not found. Using default configurations.{NC}")
        environment_config = {}
        # Set default environment variables if file is missing
        os.environ['VITE_IMPORT_MAP_URL'] = "http://localhost:3000/import-map.json" # Default shell import map
        os.environ['VITE_PREFS_SERVICE_URL'] = "http://localhost:8010" # Default prefs service
        return True

    try:
        with open(ENV_FILE, 'r') as f:
            all_envs = json.load(f)

        if app_env not in all_envs:
            print(f"{YELLOW}⚠️ Environment '{app_env}' not found in {ENV_FILE}. Using defaults.{NC}")
            environment_config = {}
            # Set default environment variables if env key is missing
            os.environ['VITE_IMPORT_MAP_URL'] = "http://localhost:3000/import-map.json"
            os.environ['VITE_PREFS_SERVICE_URL'] = "http://localhost:8010"
            return True

        print(f"Loading configuration for environment: {BLUE}{app_env}{NC}")
        environment_config = all_envs[app_env]

        # Set environment variables needed by the shell/MFEs
        # Use .get() with defaults for safety
        os.environ['VITE_IMPORT_MAP_URL'] = environment_config.get('shell', {}).get('url', "http://localhost:3000") + "/import-map.json" # Assuming import map is relative to shell URL
        os.environ['VITE_PREFS_SERVICE_URL'] = environment_config.get('prefs_service', {}).get('url', 'http://localhost:8010')

        print(f"{GREEN}✅ Environment configuration loaded{NC}")
        print(f"   - Prefs Service URL: {os.environ['VITE_PREFS_SERVICE_URL']}")
        # print(f"   - Import Map URL: {os.environ['VITE_IMPORT_MAP_URL']}") # Debugging
        return True
    except json.JSONDecodeError as e:
        print(f"{RED}❌ Error parsing {ENV_FILE}: {e}. Please check the JSON syntax.{NC}")
        return False
    except Exception as e:
        print(f"{RED}❌ Error processing {ENV_FILE}: {e}{NC}")
        return False


def build_package(service_name: str) -> bool:
    service_dir = os.path.join(MFE_ROOT, service_name)

    if not os.path.isdir(service_dir):
        print(f"{RED}❌ Package directory '{service_dir}' not found.{NC}")
        return False

    # Fix TypeScript config before building
    if not fix_typescript_config(service_dir):
         # If fixing failed, maybe still try to build but warn
         print(f"{YELLOW}⚠️ Could not modify tsconfig for {service_name}, build might fail due to strict checks.{NC}")
         # Decide if you want to proceed or fail here. Let's proceed for now.

    log_file = os.path.join(ROOT_DIR, f"{service_name}_build_log.txt")
    print(f"{YELLOW}🔧 Building {service_name}... (Log: {log_file}){NC}")

    # Determine the correct build command
    if service_name == "shared":
        # For 'shared', we typically just need to compile TypeScript
        cmd = ["npx", "tsc", "--project", "tsconfig.json"]
    else:
        # For other MFEs, run the standard build script from package.json
        cmd = ["npm", "run", "build"]

    try:
        # Run the build command
        process = subprocess.Popen(
            cmd,
            stdout=open(log_file, 'w'),
            stderr=subprocess.STDOUT,
            cwd=service_dir,
            shell=(sys.platform == "win32"),
            env=os.environ # Pass environment variables
        )
        process.wait() # Wait for the build process to complete

        if process.returncode != 0:
            print(f"{RED}❌ Failed to build {service_name}. Check {log_file}{NC}")
            # Allow shared build issues to pass with a warning
            if service_name == "shared":
                 print(f"{YELLOW}Warning: Shared package build failed/had issues but continuing... Check log.{NC}")
                 # Attempt to create the output directory if it doesn't exist, might help subsequent steps
                 dist_dir = os.path.join(service_dir, "dist", "build")
                 try:
                      os.makedirs(dist_dir, exist_ok=True)
                      print(f"{YELLOW}Ensured shared output directory exists: {dist_dir}{NC}")
                 except OSError as e:
                      print(f"{YELLOW}Could not create shared output directory {dist_dir}: {e}{NC}")
                 return True # Continue despite shared build failure
            return False # Fail for other packages
        else:
            print(f"{GREEN}✅ {service_name} built successfully{NC}")
            return True
    except FileNotFoundError:
         print(f"{RED}❌ Build command failed for {service_name}. Is 'npm' or 'npx' installed and in your PATH?{NC}")
         return False
    except Exception as e:
        print(f"{RED}❌ Exception building {service_name}: {e}{NC}")
        return False


def start_service(service_name: str, port: int) -> bool:
    """Starts a frontend service using npm run dev."""
    if port == 0: # Services like 'shared' don't need to be started
        return True

    service_dir = os.path.join(MFE_ROOT, service_name)
    if not os.path.isdir(service_dir):
        print(f"{RED}❌ Service directory not found: {service_dir}{NC}")
        return False

    log_file = os.path.join(ROOT_DIR, f"{service_name}_log.txt")

    # --- MODIFICATION: Always use 'dev' command ---
    npm_command = "dev"
    # --- End Modification ---

    # Construct the command to start the service
    cmd = [
        "npm", "run", npm_command, "--", # '--' ensures subsequent args are passed to the script
        "--port", str(port),
        "--strictPort" # Fail if port is already in use (should have been checked)
    ]

    try:
        print(f"{YELLOW}🚀 Starting {service_name} with '{npm_command}' on port {port}... (Log: {log_file}){NC}")
        process = subprocess.Popen(
            cmd,
            stdout=open(log_file, 'w'),
            stderr=subprocess.STDOUT, # Redirect stderr to stdout, then to log file
            cwd=service_dir,
            # Use process group separation on Unix-like systems for easier cleanup
            preexec_fn=os.setsid if sys.platform != "win32" else None,
            shell=(sys.platform == "win32"), # Use shell=True on Windows if necessary
            env=os.environ # Pass current environment variables
        )
        running_processes[service_name] = process
        time.sleep(3) # Give the process a moment to start or fail

        # Check if the process terminated quickly (indicating a startup error)
        if process.poll() is not None:
            print(f"{RED}❌ Failed to start {service_name}. Process exited immediately. Check {log_file}{NC}")
            return False
        else:
            print(f"{GREEN}✅ {service_name} started (PID {process.pid}) on port {port}{NC}")
            return True
    except FileNotFoundError:
         # This error means 'npm' command was not found
         print(f"{RED}❌ Start command failed for {service_name}. Is 'npm' installed and in your PATH?{NC}")
         return False
    except Exception as e:
        print(f"{RED}❌ Exception starting {service_name}: {e}{NC}")
        # Check if the error is related to the script itself not existing
        if "Missing script" in str(e) or (hasattr(e, 'stderr') and e.stderr and "Missing script" in e.stderr):
             print(f"{YELLOW}   Hint: Ensure '{service_name}' has a '{npm_command}' script defined in its package.json.{NC}")
        return False


def cleanup(signum=None, frame=None):
    global is_shutting_down
    if is_shutting_down:
        return
    is_shutting_down = True

    print_header("SHUTTING DOWN SERVICES")
    # Copy the dictionary items to avoid issues while iterating and modifying
    processes_to_stop = list(running_processes.items())
    running_processes.clear() # Clear the global dict

    for name, process in processes_to_stop:
        print(f"Stopping {name} (PID {process.pid})...")
        if process.poll() is None: # Check if process is still running
            try:
                if sys.platform != "win32":
                    # Kill the entire process group on Unix-like systems
                    os.killpg(os.getpgid(process.pid), signal.SIGTERM)
                else:
                    # Terminate the process on Windows
                    process.terminate()

                # Wait for the process to terminate
                process.wait(timeout=5)
                print(f"{GREEN}✅ {name} stopped gracefully.{NC}")
            except subprocess.TimeoutExpired:
                print(f"{YELLOW}⚠️ {name} did not stop gracefully, forcing kill...{NC}")
                try:
                    if sys.platform != "win32":
                         os.killpg(os.getpgid(process.pid), signal.SIGKILL)
                    else:
                        # Force kill on Windows
                        subprocess.run(f"taskkill /PID {process.pid} /T /F", shell=True, check=False, capture_output=True)
                    print(f"{GREEN}✅ {name} force killed.{NC}")
                except Exception as e:
                    print(f"{RED}❌ Error force killing {name}: {e}{NC}")
            except Exception as e:
                print(f"{RED}❌ Error stopping {name}: {e}{NC}")
        else:
             print(f"{YELLOW}✅ {name} was already stopped.{NC}")


    print(f"{GREEN}✅ Shutdown complete.{NC}")
    sys.exit(0)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Start C4H Editor with ESM Microfrontend Architecture")
    parser.add_argument("--env", default="development", help="Environment name (must match a key in environments.json)")
    parser.add_argument("--services", nargs='+', help="Specific services (package names) to start", default=None)
    parser.add_argument("--no-build", action="store_true", help="Skip the build step for all packages")
    args = parser.parse_args()

    # Setup signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    print_header("STARTING C4H EDITOR WITH ESM MICROFRONTEND ARCHITECTURE")

    # Load environment configuration from environments.json
    if not load_environment_config(args.env):
        sys.exit(1) # Exit if config loading fails

    # --- Determine final service list and resolve ports ---
    final_services_config = []
    target_service_names = args.services if args.services else [cfg[0] for cfg in SERVICES_CONFIG]

    for service_name, default_port, needs_build in SERVICES_CONFIG:
        if service_name not in target_service_names:
            continue # Skip services not requested by the user

        resolved_port = default_port
        service_url = None

        # Find the URL in the environment config
        # Try direct match first (e.g., "shell", "yaml-editor")
        if service_name in environment_config:
            service_url = environment_config[service_name].get('url')
        else:
            # Handle cases like "config-selector" potentially matching multiple keys
            # Example: find "config-selector-workorder" if service_name is "config-selector"
            # We take the first match found. This assumes all variants run on the same port.
            for key, value in environment_config.items():
                if key.startswith(service_name) and isinstance(value, dict) and 'url' in value:
                    service_url = value.get('url')
                    print(f"{YELLOW}Note: Using URL from '{key}' for service '{service_name}'. Ensure this is correct.{NC}")
                    break

        # Try to parse the port from the URL
        if service_url:
            parsed_port = get_port_from_url(service_url)
            if parsed_port is not None:
                resolved_port = parsed_port
                # print(f"   Service '{service_name}' using port {resolved_port} from URL: {service_url}") # Debug
            else:
                 print(f"{YELLOW}⚠️ Could not parse port from URL '{service_url}' for {service_name}. Using default: {default_port}.{NC}")
                 resolved_port = default_port
        elif service_name != "shared": # Don't warn for 'shared' which has no URL/port
            print(f"{YELLOW}⚠️ No URL found for {service_name} in {args.env} config. Using default port: {default_port}.{NC}")
            resolved_port = default_port


        final_services_config.append((service_name, resolved_port, needs_build))
        # --- End Port Resolution ---


    if not final_services_config:
        print(f"{RED}❌ No valid services selected or found in config.{NC}")
        sys.exit(1)

    print(f"Services to handle: {', '.join([f'{name}({port})' if port != 0 else name for name, port, _ in final_services_config])}")

    # --- Check Ports ---
    print_header("CHECKING PORTS")
    ports_ok = True
    for service_name, port, _ in final_services_config:
        # Pass the *resolved* port to check_port
        if not check_port(port, service_name):
            ports_ok = False
            break # Exit loop early if a port check fails

    if not ports_ok:
        print(f"{RED}❌ Port checks failed. Aborting.{NC}")
        sys.exit(1) # Exit if any required port is unavailable

    # --- Build Packages ---
    if not args.no_build:
        print_header("BUILDING PACKAGES")
        build_success = True
        for service_name, _, needs_build in final_services_config:
            if needs_build:
                if not build_package(service_name):
                    # Allow 'shared' to have build issues but fail for others
                    if service_name != "shared":
                        build_success = False
                        print(f"{RED}❌ Build failed for {service_name}. Aborting.{NC}")
                        break # Stop build process on critical failure
        if not build_success:
             sys.exit(1)

    # --- Start Services ---
    print_header("STARTING SERVICES")
    start_success = True
    for service_name, port, _ in final_services_config:
        # Pass the *resolved* port to start_service
        if port > 0: # Only start services that have a port defined
            if not start_service(service_name, port):
                print(f"{RED}❌ Critical failure starting {service_name}. Initiating cleanup...{NC}")
                start_success = False
                break # Stop starting more services if one critically fails

    if not start_success:
         cleanup() # Clean up any services that might have started before the failure
         sys.exit(1)

    # --- Monitor Running Services ---
    if running_processes:
        print_header("SERVICES RUNNING")
        for service_name, process in running_processes.items():
             # Find the correct port from the final config for display
             port = next((p for s, p, _ in final_services_config if s == service_name), "N/A")
             print(f"  - {BLUE}{service_name}:{NC} http://localhost:{port} (PID: {process.pid})")

        print(f"\n{YELLOW}Press Ctrl+C to stop all services{NC}")

        # Keep the main script alive while services are running
        try:
            while True:
                # Check if any background process has terminated
                for name, process in list(running_processes.items()):
                    if process.poll() is not None: # If poll() returns anything other than None, process has ended
                        print(f"{RED}❌ Service '{name}' (PID {process.pid}) terminated unexpectedly.{NC}")
                        # Optionally check return code: process.returncode
                        # Remove from dictionary to stop monitoring
                        del running_processes[name]

                # If all monitored processes have ended, exit the script
                if not running_processes:
                    print(f"{YELLOW}All monitored services have stopped. Exiting.{NC}")
                    break

                time.sleep(2) # Check every 2 seconds
        except KeyboardInterrupt:
            # This is caught by the signal handler, but good practice to have it
            cleanup()
        finally:
             # Ensure cleanup runs even if the loop exits unexpectedly
             if not is_shutting_down:
                  cleanup()

    else:
        print(f"{YELLOW}⚠️ No services were started or remained running.{NC}")
        sys.exit(1) # Exit if nothing was successfully started