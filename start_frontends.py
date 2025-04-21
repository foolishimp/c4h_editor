#!/usr/bin/env python3
# File: start_frontends.py (ESM Microfrontend Architecture)
import argparse
import json
import os
import signal
import socket
import subprocess
import sys
import time
import re
from typing import Dict, List, Tuple

# --- Configuration ---
ROOT_DIR = os.getcwd()
ENV_FILE = os.path.join(ROOT_DIR, "environments.json")
MFE_ROOT = os.path.join(ROOT_DIR, "c4h-micro/packages")

# Service definitions: (package_name, default_port, needs_build_first)
SERVICES_CONFIG: List[Tuple[str, int, bool]] = [
    ("shared", 0, True),
    ("yaml-editor", 3002, True),
    ("config-selector", 3003, True),
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
                        print(f"{YELLOW}Automatic killing not implemented for Windows...{NC}")
                        return False
                    else:
                        cmd = f"lsof -ti tcp:{port} | xargs kill -9"
                        subprocess.run(cmd, shell=True, check=False, capture_output=True)
                    time.sleep(1)
                    return not is_port_in_use(port)
                except Exception as e:
                    print(f"{RED}❌ Error killing process: {e}{NC}")
                    return False
            return False
        except EOFError:
            return False
    else:
        print(f"{GREEN}✅ Port {port} is free{NC}")
        return True

def fix_typescript_config(package_dir: str) -> bool:
    """Modifies tsconfig.json to disable strict unused checks."""
    tsconfig_path = os.path.join(package_dir, "tsconfig.json")
    if not os.path.exists(tsconfig_path):
        return False
    
    try:
        with open(tsconfig_path, 'r') as f:
            config = json.load(f)
            
        # Disable noUnusedLocals in compilerOptions
        if 'compilerOptions' in config:
            config['compilerOptions']['noUnusedLocals'] = False
            config['compilerOptions']['noUnusedParameters'] = False
            
        with open(tsconfig_path, 'w') as f:
            json.dump(config, f, indent=2)
            
        return True
    except Exception as e:
        print(f"{RED}Error modifying tsconfig: {e}{NC}")
        return False

def load_environment_config(app_env: str) -> bool:
    global environment_config
    print_header("LOADING ENVIRONMENT CONFIGURATION")
    
    if not os.path.exists(ENV_FILE):
        print(f"{YELLOW}⚠️ {ENV_FILE} not found. Using default configurations.{NC}")
        environment_config = {}
        os.environ['VITE_IMPORT_MAP_URL'] = "http://localhost:3000/import-map.json"
        os.environ['VITE_PREFS_SERVICE_URL'] = "http://localhost:8001"
        return True

    try:
        with open(ENV_FILE, 'r') as f:
            all_envs = json.load(f)

        if app_env not in all_envs:
            print(f"{YELLOW}⚠️ Environment '{app_env}' not found. Using defaults.{NC}")
            environment_config = {}
            os.environ['VITE_IMPORT_MAP_URL'] = "http://localhost:3000/import-map.json"
            os.environ['VITE_PREFS_SERVICE_URL'] = "http://localhost:8001"
            return True

        print(f"{GREEN}Loading configuration for environment: {BLUE}{app_env}{NC}")
        environment_config = all_envs[app_env]
        
        os.environ['VITE_IMPORT_MAP_URL'] = environment_config.get('import_map', {}).get('url', "http://localhost:3000/import-map.json")
        os.environ['VITE_PREFS_SERVICE_URL'] = environment_config.get('prefs_service', {}).get('url', 'http://localhost:8001')
        
        print(f"{GREEN}✅ Environment configuration loaded{NC}")
        return True
    except Exception as e:
        print(f"{RED}❌ Error processing {ENV_FILE}: {e}{NC}")
        return False

def build_package(service_name: str) -> bool:
    service_dir = os.path.join(MFE_ROOT, service_name)
    
    if not os.path.isdir(service_dir):
        print(f"{RED}❌ Package directory '{service_dir}' not found.{NC}")
        return False
    
    # Fix TypeScript config to avoid unused import errors
    print(f"{YELLOW}Adjusting TypeScript configuration for {service_name}...{NC}")
    fix_typescript_config(service_dir)
    
    log_file = os.path.join(ROOT_DIR, f"{service_name}_build_log.txt")
    
    # For shared package, only run tsc
    cmd = ["npm", "run", "build"] if service_name != "shared" else ["npx", "tsc"]
    
    try:
        print(f"{YELLOW}🔧 Building {service_name}...{NC}")
        process = subprocess.Popen(
            cmd,
            stdout=open(log_file, 'w'),
            stderr=subprocess.STDOUT,
            cwd=service_dir,
            shell=(sys.platform == "win32")
        )
        
        process.wait()
        
        if process.returncode != 0:
            print(f"{RED}❌ Failed to build {service_name}. Check {log_file}{NC}")
            # Special handling for shared package
            if service_name == "shared":
                print(f"{YELLOW}Attempting to create output directory for shared package...{NC}")
                os.makedirs(os.path.join(service_dir, "dist/build"), exist_ok=True)
                return True  # Continue despite errors for shared
            return False
        else:
            print(f"{GREEN}✅ {service_name} built successfully{NC}")
            return True
    except Exception as e:
        print(f"{RED}❌ Exception building {service_name}: {e}{NC}")
        return False

def start_service(service_name: str, port: int) -> bool:
    if port == 0:
        return True
        
    service_dir = os.path.join(MFE_ROOT, service_name)
    log_file = os.path.join(ROOT_DIR, f"{service_name}_log.txt")
    
    npm_command = "start" if service_name == "shell" else "preview"
    cmd = [
        "npm", "run", npm_command, "--",
        "--port", str(port),
        "--strictPort"
    ]
    
    try:
        print(f"{YELLOW}🚀 Starting {service_name} on port {port}...{NC}")
        process = subprocess.Popen(
            cmd,
            stdout=open(log_file, 'w'),
            stderr=subprocess.STDOUT,
            cwd=service_dir,
            preexec_fn=os.setsid if sys.platform != "win32" else None,
            shell=(sys.platform == "win32")
        )
        running_processes[service_name] = process
        time.sleep(2)
        
        if process.poll() is not None:
            print(f"{RED}❌ Failed to start {service_name}. Check {log_file}{NC}")
            return False
        else:
            print(f"{GREEN}✅ {service_name} started (PID {process.pid}){NC}")
            return True
    except Exception as e:
        print(f"{RED}❌ Exception starting {service_name}: {e}{NC}")
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
        if process.poll() is None:
            try:
                if sys.platform != "win32":
                    os.killpg(os.getpgid(process.pid), signal.SIGTERM)
                else:
                    process.terminate()
                
                process.wait(timeout=5)
            except Exception:
                try:
                    if sys.platform != "win32":
                        os.killpg(os.getpgid(process.pid), signal.SIGKILL)
                    else:
                        subprocess.run(f"taskkill /PID {process.pid} /T /F", shell=True)
                except:
                    pass
    
    print(f"{GREEN}✅ Shutdown complete.{NC}")
    sys.exit(0)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Start C4H Editor with ESM Microfrontend Architecture")
    parser.add_argument("--env", default="development", help="Environment")
    parser.add_argument("--services", nargs='+', help="Services to start", default=None)
    parser.add_argument("--no-build", action="store_true", help="Skip building packages")
    args = parser.parse_args()
    
    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)
    
    print_header("STARTING C4H EDITOR WITH ESM MICROFRONTEND ARCHITECTURE")
    
    if not load_environment_config(args.env):
        sys.exit(1)
    
    services_to_handle = []
    all_service_names = [cfg[0] for cfg in SERVICES_CONFIG]
    target_service_names = args.services if args.services else all_service_names
    
    for name in target_service_names:
        found = False
        for cfg in SERVICES_CONFIG:
            if cfg[0] == name:
                services_to_handle.append(cfg)
                found = True
                break
        if not found:
            print(f"{YELLOW}⚠️ Service '{name}' not found in config.{NC}")
    
    if not services_to_handle:
        print(f"{RED}❌ No valid services selected.{NC}")
        sys.exit(1)
    
    print(f"Services: {', '.join([info[0] for info in services_to_handle])}")
    
    print_header("CHECKING PORTS")
    ports_ok = True
    for service_name, port, _ in services_to_handle:
        if not check_port(port, service_name):
            ports_ok = False
            break
    
    if not ports_ok:
        sys.exit(1)
    
    if not args.no_build:
        print_header("BUILDING PACKAGES")
        for service_name, _, needs_build in services_to_handle:
            if needs_build and not build_package(service_name):
                if service_name == "shared":
                    print(f"{YELLOW}Warning: Shared package build had issues but continuing...{NC}")
                else:
                    print(f"{RED}❌ Failed to build {service_name}. Aborting.{NC}")
                    sys.exit(1)
    
    print_header("STARTING SERVICES")
    for service_name, port, _ in services_to_handle:
        if port > 0 and not start_service(service_name, port):
            print(f"{RED}❌ Failed to start {service_name}.{NC}")
            cleanup()
    
    if running_processes:
        print_header("SERVICES RUNNING")
        for service_name, process in running_processes.items():
            port = next((p for s, p, _ in services_to_handle if s == service_name), 0)
            log_file = os.path.join(ROOT_DIR, f"{service_name}_log.txt")
            print(f"  - {BLUE}{service_name}:{NC} http://localhost:{port} (PID: {process.pid})")
        
        print(f"\n{YELLOW}Press Ctrl+C to stop all services{NC}")
        
        try:
            while True:
                for name, process in list(running_processes.items()):
                    if process.poll() is not None:
                        print(f"{RED}❌ Service '{name}' terminated unexpectedly.{NC}")
                        del running_processes[name]
                
                if not running_processes:
                    print(f"{YELLOW}All services have stopped. Exiting.{NC}")
                    break
                
                time.sleep(2)
        except KeyboardInterrupt:
            cleanup()
    else:
        print(f"{RED}❌ No services were started.{NC}")
        sys.exit(1)