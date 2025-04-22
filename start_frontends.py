#!/usr/bin/env python3
# File: start_frontends.py (ESM Microfrontend Architecture)
# --- MODIFIED: Added build step for 'shared' package ---
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
SERVICES_CONFIG: List[Tuple[str, int]] = [
    ("shared", 0), # Port 0 means it doesn't need to be started as a server
    ("yaml-editor", 3005), # Using default ports, will be overridden by env
    ("config-selector", 3003),
    ("job-management", 3004),
    ("test-app", 3006),
    ("shell", 3100), # Explicitly different from vite default
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
            s.bind(("127.0.0.1", port))
            return False
        except socket.error:
            return True

def check_port(port: int, service_name: str) -> bool:
    """Checks if a port is available and optionally tries to kill the process using it."""
    if port == 0:
        return True

    print(f"Checking port {BLUE}{port}{NC} for service {BLUE}{service_name}{NC}...")
    if is_port_in_use(port):
        print(f"{YELLOW}⚠️ Port {port} is in use{NC}")
        try:
            choice = input(f"Kill process using port {port}? (y/n) ").strip().lower()
            if choice == 'y':
                try:
                    if sys.platform == "win32":
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
                    time.sleep(2)
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
                 return False
        except EOFError:
             print(f"{RED}❌ Cannot prompt for input (EOFError). Port conflict not resolved.{NC}")
             return False
    else:
        print(f"{GREEN}✅ Port {port} is free{NC}")
        return True

def load_environment_config(app_env: str) -> bool:
    """Loads config from JSON file and exports variables."""
    global environment_config
    print_header("LOADING ENVIRONMENT CONFIGURATION")
    if not os.path.exists(ENV_FILE):
        print(f"{YELLOW}⚠️ {ENV_FILE} not found. Using default configurations.{NC}")
        environment_config = {}
        # Set default prefs service URL directly
        os.environ['VITE_PREFS_SERVICE_URL'] = "http://localhost:8011"
        return True

    try:
        with open(ENV_FILE, 'r') as f:
            all_envs = json.load(f)

        if app_env not in all_envs:
            print(f"{YELLOW}⚠️ Environment '{app_env}' not found in {ENV_FILE}. Using defaults.{NC}")
            environment_config = {}
            # Set default prefs service URL directly
            os.environ['VITE_PREFS_SERVICE_URL'] = "http://localhost:8011"
            return True

        print(f"Loading configuration for environment: {BLUE}{app_env}{NC}")
        environment_config = all_envs[app_env]

        # Set environment variables needed by the shell
        os.environ['VITE_PREFS_SERVICE_URL'] = environment_config.get('prefs_service', {}).get('url', 'http://localhost:8011')

        print(f"{GREEN}✅ Environment configuration loaded{NC}")
        print(f"   - Prefs Service URL: {os.environ['VITE_PREFS_SERVICE_URL']}")
        return True
    except json.JSONDecodeError as e:
        print(f"{RED}❌ Error parsing {ENV_FILE}: {e}. Please check the JSON syntax.{NC}")
        return False
    except Exception as e:
        print(f"{RED}❌ Error processing {ENV_FILE}: {e}{NC}")
        return False

def start_service(service_name: str, port: int) -> bool:
    """Starts a frontend service using npx vite directly."""
    if port == 0:
        return True

    service_dir = os.path.join(MFE_ROOT, service_name)
    if not os.path.isdir(service_dir):
        print(f"{RED}❌ Service directory not found: {service_dir}{NC}")
        return False

    log_file = os.path.join(ROOT_DIR, f"{service_name}_log.txt")

    cmd = [
        "npx", "-y",
        "vite",
        "--port", str(port),
        "--strictPort"
    ]

    print(f"{YELLOW}DEBUG: Running command: {' '.join(cmd)}{NC}")

    try:
        print(f"{YELLOW}🚀 Starting {service_name} directly with 'vite' expecting port {port}... (Log: {log_file}){NC}")
        process = subprocess.Popen(
            cmd,
            stdout=open(log_file, 'w'),
            stderr=subprocess.STDOUT,
            cwd=service_dir,
            preexec_fn=os.setsid if sys.platform != "win32" else None,
            shell=(sys.platform == "win32"),
            env=os.environ
        )
        running_processes[service_name] = process
        time.sleep(4)

        if process.poll() is not None:
            print(f"{RED}❌ Failed to start {service_name}. Process exited immediately. Check {log_file}{NC}")
            return False
        else:
            try:
                 with open(log_file, 'r') as lf:
                      log_content = lf.read()
                      match = re.search(r'Local:\s+http://[^\s:]+:(\d+)/', log_content)
                      if match:
                           actual_port = int(match.group(1))
                           if actual_port == port:
                                print(f"{GREEN}✅ {service_name} started (PID {process.pid}) on expected port {port}{NC}")
                           else:
                                print(f"{YELLOW}⚠️ {service_name} started (PID {process.pid}) but on UNEXPECTED port {actual_port} (expected {port}). Check Vite logs/config.{NC}")
                      else:
                           print(f"{YELLOW}⚠️ {service_name} started (PID {process.pid}) but could not confirm listening port from log.{NC}")

            except Exception as e:
                 print(f"{YELLOW}Note: Could not read port from log file for {service_name}: {e}{NC}")
            return True
    except FileNotFoundError:
         print(f"{RED}❌ Start command failed for {service_name}. Is 'npx' in your PATH and 'vite' installed in the workspace?{NC}")
         return False
    except Exception as e:
        print(f"{RED}❌ Exception starting {service_name}: {e}{NC}")
        return False


def cleanup(signum=None, frame=None):
    """Gracefully terminates running processes."""
    global is_shutting_down
    if is_shutting_down:
        return
    is_shutting_down = True

    print_header("SHUTTING DOWN SERVICES")
    processes_to_stop = list(running_processes.items())
    running_processes.clear()

    for name, process in processes_to_stop:
        print(f"Stopping {name} (PID {process.pid})...")
        if process.poll() is None:
            try:
                if sys.platform != "win32":
                    os.killpg(os.getpgid(process.pid), signal.SIGTERM)
                else:
                    process.terminate()
                process.wait(timeout=5)
                print(f"{GREEN}✅ {name} stopped gracefully.{NC}")
            except subprocess.TimeoutExpired:
                print(f"{YELLOW}⚠️ {name} did not stop gracefully, forcing kill...{NC}")
                try:
                    if sys.platform != "win32":
                         os.killpg(os.getpgid(process.pid), signal.SIGKILL)
                    else:
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
    parser = argparse.ArgumentParser(description="Start C4H Editor Microfrontends in Dev Mode")
    parser.add_argument("--env", default="development", help="Environment name (must match a key in environments.json)")
    parser.add_argument("--services", nargs='+', help="Specific services (package names) to start", default=None)
    args = parser.parse_args()

    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    print_header("STARTING C4H EDITOR MICROFRONTENDS (DEV MODE)")

    if not load_environment_config(args.env):
        sys.exit(1)

    final_services_config = []
    target_service_names = args.services if args.services else [cfg[0] for cfg in SERVICES_CONFIG]

    # Resolve ports based on environment config or defaults
    for service_name, default_port in SERVICES_CONFIG:
        if service_name not in target_service_names:
            continue

        resolved_port = default_port
        service_url = None

        # Find URL in environment_config
        if service_name in environment_config:
            service_url = environment_config[service_name].get('url')
        elif service_name == 'config-selector':
            for key, value in environment_config.items():
                if key.startswith('config-selector-') and isinstance(value, dict) and 'url' in value:
                    service_url = value.get('url')
                    print(f"{YELLOW}Note: Using URL from '{key}' for service '{service_name}'. Assumes all run on same port.{NC}")
                    break

        if service_url:
            parsed_port = get_port_from_url(service_url)
            if parsed_port is not None:
                resolved_port = parsed_port
            elif service_name != "shared":
                 print(f"{YELLOW}⚠️ Could not parse port from URL '{service_url}' for {service_name}. Using default: {default_port}.{NC}")
        elif service_name != "shared":
            print(f"{YELLOW}⚠️ No URL found for {service_name} in {args.env} config. Using default port: {default_port}.{NC}")

        final_services_config.append((service_name, resolved_port))

    if not final_services_config:
        print(f"{RED}❌ No valid services selected or found in config.{NC}")
        sys.exit(1)

    print(f"Services to handle: {', '.join([f'{name}({port})' if port != 0 else name for name, port in final_services_config])}")

    print_header("CHECKING PORTS")
    ports_ok = True
    final_ports = {}
    for service_name, port in final_services_config:
        if not check_port(port, service_name):
            ports_ok = False
            break
        final_ports[service_name] = port

    if not ports_ok:
        print(f"{RED}❌ Port checks failed. Aborting.{NC}")
        sys.exit(1)

    # --- Build Shared Package --- # <<< MODIFICATION INSERTED HERE <<<
    print_header("BUILDING SHARED PACKAGE")
    shared_dir = os.path.join(MFE_ROOT, "shared")
    if os.path.isdir(shared_dir):
        print(f"Running build in {shared_dir}...")
        # Assuming pnpm based on script comments, adjust if using npm/yarn
        build_cmd = ["pnpm", "run", "build"]
        try:
            # Run build command, capture output
            result = subprocess.run(build_cmd, cwd=shared_dir, check=True, capture_output=True, text=True)
            print(f"{GREEN}✅ 'shared' package built successfully.{NC}")
            # Optionally print stdout/stderr from build if needed for debugging
            # print(result.stdout)
        except subprocess.CalledProcessError as e:
            print(f"{RED}❌ Failed to build 'shared' package. Error:{NC}")
            print(e.stderr) # Print build errors
            sys.exit(1)
        except FileNotFoundError:
             print(f"{RED}❌ Build command ('pnpm run build') failed. Is 'pnpm' installed and in PATH?{NC}")
             sys.exit(1)
    else:
        print(f"{YELLOW}⚠️ Shared package directory not found at {shared_dir}. Skipping build.{NC}")
    # --- End Build Shared Package --- # <<< END MODIFICATION <<<

    print_header("STARTING SERVICES (DEV MODE)")
    start_success = True
    for service_name, _ in final_services_config:
        port = final_ports.get(service_name)
        if port is not None and port > 0:
            if not start_service(service_name, port):
                print(f"{RED}❌ Critical failure starting {service_name}. Initiating cleanup...{NC}")
                start_success = False
                break

    if not start_success:
         cleanup()
         sys.exit(1)

    if running_processes:
        print_header("SERVICES RUNNING (DEV MODE)")
        for service_name, process in running_processes.items():
             port = final_ports.get(service_name, "N/A")
             log_file = os.path.join(ROOT_DIR, f"{service_name}_log.txt")
             print(f"  - {BLUE}{service_name}:{NC} http://localhost:{port} (PID: {process.pid}, Logs: {BLUE}{log_file}{NC})")

        print(f"\n{YELLOW}Press Ctrl+C to stop all services{NC}")

        try:
            while True:
                for name, process in list(running_processes.items()):
                    if process.poll() is not None:
                        print(f"{RED}❌ Service '{name}' (PID {process.pid}) terminated unexpectedly. Exit code: {process.returncode}{NC}")
                        del running_processes[name]
                if not running_processes:
                    print(f"{YELLOW}All monitored services have stopped. Exiting.{NC}")
                    break
                time.sleep(2)
        except KeyboardInterrupt:
            cleanup()
        finally:
             if not is_shutting_down:
                  cleanup()
    else:
        print(f"{YELLOW}⚠️ No services were started or remained running.{NC}")
        sys.exit(1)