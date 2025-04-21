#!/usr/bin/env python3
# File: start_frontends.py (ESM Microfrontend Architecture)
# --- MODIFIED TO USE 'npm run preview' for MFEs and pass 'is_shell' ---
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
    # Assuming config-selector serves all its variants from one process
    ("config-selector", 3003, True),
    ("job-management", 3004, True),
    ("test-app", 3005, True), # Default port, will be overridden by env if possible
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

def fix_typescript_config(package_dir: str) -> bool:
    """Modifies tsconfig.json to disable strict unused checks."""
    tsconfig_path = os.path.join(package_dir, "tsconfig.json")
    if not os.path.exists(tsconfig_path):
        print(f"{YELLOW}No tsconfig.json found in {package_dir}, skipping fix.{NC}")
        return True

    print(f"{YELLOW}Adjusting TypeScript configuration in {tsconfig_path}...{NC}")
    try:
        with open(tsconfig_path, 'r', encoding='utf-8') as f:
            content = f.read()
            content = re.sub(r',\s*([}\]])', r'\1', content)
            config = json.loads(content)

        if 'compilerOptions' not in config:
            config['compilerOptions'] = {}

        config['compilerOptions']['noUnusedLocals'] = False
        config['compilerOptions']['noUnusedParameters'] = False

        with open(tsconfig_path, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2)

        print(f"{GREEN}✅ Successfully adjusted tsconfig.json for {os.path.basename(package_dir)}.{NC}")
        return True
    except json.JSONDecodeError as e:
        print(f"{RED}❌ Error decoding JSON in {tsconfig_path}: {e}{NC}")
        print(f"{YELLOW}   Please check the file for syntax errors.{NC}")
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
        os.environ['VITE_PREFS_SERVICE_URL'] = "http://localhost:8010" # Default prefs service
        return True

    try:
        with open(ENV_FILE, 'r') as f:
            all_envs = json.load(f)

        if app_env not in all_envs:
            print(f"{YELLOW}⚠️ Environment '{app_env}' not found in {ENV_FILE}. Using defaults.{NC}")
            environment_config = {}
            os.environ['VITE_PREFS_SERVICE_URL'] = "http://localhost:8010"
            return True

        print(f"Loading configuration for environment: {BLUE}{app_env}{NC}")
        environment_config = all_envs[app_env]

        os.environ['VITE_PREFS_SERVICE_URL'] = environment_config.get('prefs_service', {}).get('url', 'http://localhost:8010')

        print(f"{GREEN}✅ Environment configuration loaded{NC}")
        print(f"   - Prefs Service URL: {os.environ['VITE_PREFS_SERVICE_URL']}")
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

    # Skip TSConfig fix for shared, as tsc handles its own config
    if service_name != "shared":
        if not fix_typescript_config(service_dir):
            print(f"{YELLOW}⚠️ Could not modify tsconfig for {service_name}, build might fail.{NC}")

    log_file = os.path.join(ROOT_DIR, f"{service_name}_build_log.txt")
    print(f"{YELLOW}🔧 Building {service_name}... (Log: {log_file}){NC}")

    cmd = ["npm", "run", "build"]
    if service_name == "shared":
        # Use npx for tsc to ensure it uses the locally resolved version
        cmd = ["npx", "tsc", "--project", "tsconfig.json"]

    try:
        # Open log file for writing
        with open(log_file, 'w') as lf:
            # Run the process, capturing stdout and stderr separately
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE, # Capture stdout
                stderr=subprocess.PIPE, # Capture stderr
                cwd=service_dir,
                shell=(sys.platform == "win32"),
                env=os.environ,
                text=True # Decode stdout/stderr as text
            )

            # Read and write stdout/stderr to the log file in real-time (optional but helpful)
            stdout_data, stderr_data = process.communicate()
            lf.write("--- STDOUT ---\n")
            lf.write(stdout_data)
            lf.write("\n--- STDERR ---\n")
            lf.write(stderr_data)

        # Check the return code AFTER the process finishes
        if process.returncode != 0:
            # Print stderr specifically if build failed
            print(f"{RED}❌ Failed to build {service_name}. Exit Code: {process.returncode}. Check {log_file}{NC}")
            if stderr_data:
                 print(f"{RED}--- Error Output (from stderr) ---{NC}\n{stderr_data.strip()}\n{RED}---------------------------------{NC}")
            return False # Fail build script if ANY build fails
        else:
            # If build succeeded (exit code 0), check for critical output file for 'shared'
            if service_name == "shared":
                expected_output = os.path.join(service_dir, "dist", "build", "index.js") # Based on tsconfig outDir
                if not os.path.exists(expected_output):
                    print(f"{RED}❌ Build for 'shared' succeeded (Exit Code 0), but output file missing: {expected_output}{NC}")
                    print(f"{YELLOW}   Check tsconfig.json 'outDir' and build log '{log_file}'.{NC}")
                    return False
            print(f"{GREEN}✅ {service_name} built successfully{NC}")
            return True
    except FileNotFoundError:
        print(f"{RED}❌ Build command failed for {service_name}. Is '{cmd[0]}' installed and in your PATH?{NC}")
        return False
    except Exception as e:
        print(f"{RED}❌ Exception building {service_name}: {e}{NC}")
        return False

# --- MODIFIED FUNCTION SIGNATURE ---
def start_service(service_name: str, port: int, is_shell: bool) -> bool:
    """Starts a frontend service using npm run dev (shell) or preview (MFEs)."""
    if port == 0: # Services like 'shared' don't need to be started
        return True

    service_dir = os.path.join(MFE_ROOT, service_name)
    if not os.path.isdir(service_dir):
        print(f"{RED}❌ Service directory not found: {service_dir}{NC}")
        return False

    log_file = os.path.join(ROOT_DIR, f"{service_name}_log.txt")

    # Determine command based on whether it's the shell
    npm_command = "dev" if is_shell else "preview" # Use 'preview' for MFEs

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
            stderr=subprocess.STDOUT,
            cwd=service_dir,
            preexec_fn=os.setsid if sys.platform != "win32" else None,
            shell=(sys.platform == "win32"),
            env=os.environ
        )
        running_processes[service_name] = process
        # Give preview mode a bit more time maybe
        time.sleep(4 if not is_shell else 3)

        if process.poll() is not None:
            print(f"{RED}❌ Failed to start {service_name}. Process exited immediately. Check {log_file}{NC}")
            # Try to provide hints for common preview issues
            if not is_shell:
                dist_path = os.path.join(service_dir, 'dist')
                if not os.path.exists(dist_path):
                    print(f"{YELLOW}   Hint: 'dist' directory not found in {service_dir}. Did the build step run successfully?{NC}")
                else:
                    # Construct expected asset filename based on convention
                    asset_file = os.path.join(dist_path, 'assets', f'{service_name}.js') # Adjust if filename convention differs
                    if not os.path.exists(asset_file):
                            print(f"{YELLOW}   Hint: Built asset ({asset_file}) not found. Check build output/config.{NC}")
            return False
        else:
            print(f"{GREEN}✅ {service_name} started (PID {process.pid}) on port {port}{NC}")
            return True
    except FileNotFoundError:
            print(f"{RED}❌ Start command failed for {service_name}. Is 'npm' installed and in your PATH?{NC}")
            return False
    except Exception as e:
        print(f"{RED}❌ Exception starting {service_name}: {e}{NC}")
        if "Missing script" in str(e) or (hasattr(e, 'stderr') and e.stderr and "Missing script" in e.stderr):
                print(f"{YELLOW}   Hint: Ensure '{service_name}' has a '{npm_command}' script defined in its package.json.{NC}")
        return False

def cleanup(signum=None, frame=None):
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
    parser = argparse.ArgumentParser(description="Start C4H Editor with ESM Microfrontend Architecture")
    parser.add_argument("--env", default="development", help="Environment name (must match a key in environments.json)")
    parser.add_argument("--services", nargs='+', help="Specific services (package names) to start", default=None)
    parser.add_argument("--no-build", action="store_true", help="Skip the build step for all packages")
    args = parser.parse_args()

    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    print_header("STARTING C4H EDITOR WITH ESM MICROFRONTEND ARCHITECTURE")

    if not load_environment_config(args.env):
        sys.exit(1)

    final_services_config = []
    target_service_names = args.services if args.services else [cfg[0] for cfg in SERVICES_CONFIG]

    for service_name, default_port, needs_build in SERVICES_CONFIG:
        if service_name not in target_service_names:
            continue

        resolved_port = default_port
        service_url = None

        # Find URL in environment_config, handling potential variations like 'config-selector-*'
        # Prioritize direct key match
        if service_name in environment_config:
            service_url = environment_config[service_name].get('url')
        # Fallback to checking prefixes only if direct match fails
        elif service_name == 'config-selector':
            # Look for any key starting with 'config-selector-'
            for key, value in environment_config.items():
                if key.startswith('config-selector-') and isinstance(value, dict) and 'url' in value:
                    service_url = value.get('url')
                    print(f"{YELLOW}Note: Using URL from '{key}' for service '{service_name}'. Assumes all run on same port.{NC}")
                    break
        # Add similar logic for other potential prefix groups if needed

        if service_url:
            parsed_port = get_port_from_url(service_url)
            if parsed_port is not None:
                resolved_port = parsed_port
            elif service_name != "shared": # Don't warn for shared
                 print(f"{YELLOW}⚠️ Could not parse port from URL '{service_url}' for {service_name}. Using default: {default_port}.{NC}")
        elif service_name != "shared": # Don't warn for shared
            print(f"{YELLOW}⚠️ No URL found for {service_name} in {args.env} config. Using default port: {default_port}.{NC}")

        final_services_config.append((service_name, resolved_port, needs_build))

    if not final_services_config:
        print(f"{RED}❌ No valid services selected or found in config.{NC}")
        sys.exit(1)

    print(f"Services to handle: {', '.join([f'{name}({port})' if port != 0 else name for name, port, _ in final_services_config])}")

    print_header("CHECKING PORTS")
    ports_ok = True
    final_ports = {} # Store the final resolved port for each service
    for service_name, port, _ in final_services_config:
        if not check_port(port, service_name):
            ports_ok = False
            break
        final_ports[service_name] = port # Store the checked port

    if not ports_ok:
        print(f"{RED}❌ Port checks failed. Aborting.{NC}")
        sys.exit(1)

    if not args.no_build:
        print_header("BUILDING PACKAGES")
        build_success = True
        # Corrected build logic iteration
        for service_name, _, needs_build in final_services_config:
             should_build_now = needs_build and service_name != 'shell'
             if should_build_now:
                 if not build_package(service_name):
                     if service_name != "shared": # Allow shared build issues but fail for others
                         build_success = False
                         print(f"{RED}❌ Build failed for MFE {service_name}. Aborting.{NC}")
                         break
        if not build_success:
             sys.exit(1)
        # Build shared if any MFE was built (and shared itself wasn't the one that failed)
        elif "shared" not in [s for s, _, _ in final_services_config if not build_success] and any(s != 'shell' for s, _, _ in final_services_config):
             print(f"{YELLOW}Building 'shared' package as other MFEs depend on it...{NC}")
             build_package("shared")


    # --- Start Services (FIXED) ---
    print_header("STARTING SERVICES")
    start_success = True
    for service_name, _, _ in final_services_config: # Iterate through the final list
        port = final_ports.get(service_name) # Get the final port for this service
        if port is not None and port > 0: # Only start services that have a valid port
            is_shell_service = (service_name == "shell")
            # --- CORRECTED CALL ---
            if not start_service(service_name, port, is_shell_service):
            # --- END CORRECTION ---
                print(f"{RED}❌ Critical failure starting {service_name}. Initiating cleanup...{NC}")
                start_success = False
                break # Stop starting more services if one critically fails

    if not start_success:
         cleanup()
         sys.exit(1)

    if running_processes:
        print_header("SERVICES RUNNING")
        for service_name, process in running_processes.items():
             port = final_ports.get(service_name, "N/A") # Get resolved port for display
             print(f"  - {BLUE}{service_name}:{NC} http://localhost:{port} (PID: {process.pid})")

        print(f"\n{YELLOW}Press Ctrl+C to stop all services{NC}")

        try:
            while True:
                for name, process in list(running_processes.items()):
                    if process.poll() is not None:
                        print(f"{RED}❌ Service '{name}' (PID {process.pid}) terminated unexpectedly.{NC}")
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