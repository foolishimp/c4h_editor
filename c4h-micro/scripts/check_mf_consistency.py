#!/usr/bin/env python3
# File: check_mf_consistency.py
# Consistency checker for Vite Module Federation microfrontends

import os
import json
import re
import sys
import subprocess
from pathlib import Path
from typing import Dict, List, Any, Optional, Set, Tuple

# ANSI color codes for output
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'

# Global counters for results
issues_found = 0
checks_passed = 0

def print_header(text: str) -> None:
    """Print a formatted header"""
    print(f"\n{Colors.BLUE}{Colors.BOLD}{'=' * 80}{Colors.END}")
    print(f"{Colors.BLUE}{Colors.BOLD} {text} {Colors.END}")
    print(f"{Colors.BLUE}{Colors.BOLD}{'=' * 80}{Colors.END}")

def print_success(text: str) -> None:
    """Print a success message"""
    global checks_passed
    checks_passed += 1
    print(f"{Colors.GREEN}✅ {text}{Colors.END}")

def print_warning(text: str) -> None:
    """Print a warning message"""
    global issues_found
    issues_found += 1
    print(f"{Colors.YELLOW}⚠️ {text}{Colors.END}")

def print_error(text: str) -> None:
    """Print an error message"""
    global issues_found
    issues_found += 1
    print(f"{Colors.RED}❌ {text}{Colors.END}")

def print_info(text: str) -> None:
    """Print an info message"""
    print(f"{Colors.BLUE}ℹ️ {text}{Colors.END}")

def find_packages(root_dir: Path) -> List[Path]:
    """Find all package directories in a monorepo"""
    packages_dir = root_dir / "packages"
    if not packages_dir.exists():
        print_warning(f"No 'packages' directory found at {root_dir}")
        return []
    
    return [d for d in packages_dir.iterdir() if d.is_dir()]

def load_json_file(file_path: Path) -> Optional[Dict[str, Any]]:
    """Load and parse a JSON file"""
    try:
        if not file_path.exists():
            print_warning(f"File not found: {file_path}")
            return None
        
        with open(file_path, 'r') as f:
            return json.load(f)
    except json.JSONDecodeError:
        print_error(f"Invalid JSON in file: {file_path}")
        return None
    except Exception as e:
        print_error(f"Error reading file {file_path}: {str(e)}")
        return None

def parse_vite_config(file_path: Path) -> Dict[str, Any]:
    """Parse Vite configuration file to extract relevant settings"""
    if not file_path.exists():
        print_warning(f"Vite config not found: {file_path}")
        return {}
    
    # This is a basic parser for demonstration purposes
    # In a production environment, you'd want to use a proper TS/JS parser
    try:
        with open(file_path, 'r') as f:
            content = f.read()
        
        # Extract federation configuration
        config = {}
        
        # Check for federation plugin
        federation_match = re.search(r'federation\(\s*{([^}]*)}', content, re.DOTALL)
        if federation_match:
            federation_str = federation_match.group(1)
            
            # Extract name
            name_match = re.search(r'name\s*:\s*[\'"]([^\'"]+)[\'"]', federation_str)
            if name_match:
                config['name'] = name_match.group(1)
            
            # Extract filename
            filename_match = re.search(r'filename\s*:\s*[\'"]([^\'"]+)[\'"]', federation_str)
            if filename_match:
                config['filename'] = filename_match.group(1)
            
            # Extract remotes
            remotes_match = re.search(r'remotes\s*:\s*{([^}]*)}', federation_str, re.DOTALL)
            if remotes_match:
                remotes_str = remotes_match.group(1)
                remotes = {}
                for remote_match in re.finditer(r'(\w+)\s*:\s*[\'"]([^\'"]+)[\'"]', remotes_str):
                    remotes[remote_match.group(1)] = remote_match.group(2)
                config['remotes'] = remotes
            
            # Extract exposes
            exposes_match = re.search(r'exposes\s*:\s*{([^}]*)}', federation_str, re.DOTALL)
            if exposes_match:
                exposes_str = exposes_match.group(1)
                exposes = {}
                for expose_match in re.finditer(r'[\'"](.+?)[\'"]\s*:\s*[\'"](.+?)[\'"]', exposes_str):
                    exposes[expose_match.group(1)] = expose_match.group(2)
                config['exposes'] = exposes
            
            # Extract shared dependencies
            shared_match = re.search(r'shared\s*:\s*{([^}]*)}', federation_str, re.DOTALL)
            if shared_match:
                shared_str = shared_match.group(1)
                shared = {}
                
                # Extract simple shared entries and those with singleton
                for shared_entry in re.finditer(r'[\'"]([^\'"]+)[\'"]\s*:\s*({[^}]*}|\w+)', shared_str, re.DOTALL):
                    key = shared_entry.group(1)
                    value = shared_entry.group(2)
                    
                    if value.startswith('{'):
                        # Complex entry with settings
                        singleton_match = re.search(r'singleton\s*:\s*(\w+)', value)
                        singleton = singleton_match.group(1) if singleton_match else None
                        
                        req_version_match = re.search(r'requiredVersion\s*:\s*[\'"]([^\'"]+)[\'"]', value)
                        req_version = req_version_match.group(1) if req_version_match else None
                        
                        shared[key] = {
                            'singleton': singleton == 'true',
                            'requiredVersion': req_version
                        }
                    else:
                        # Simple boolean entry
                        shared[key] = value == 'true'
                
                config['shared'] = shared
        
        # Extract server configuration
        server_match = re.search(r'server\s*:\s*{([^}]*)}', content, re.DOTALL)
        if server_match:
            server_str = server_match.group(1)
            
            port_match = re.search(r'port\s*:\s*(\d+)', server_str)
            if port_match:
                config['port'] = int(port_match.group(1))
            
            cors_match = re.search(r'cors\s*:\s*(\w+)', server_str)
            if cors_match:
                config['cors'] = cors_match.group(1) == 'true'
        
        # Extract build configuration
        build_match = re.search(r'build\s*:\s*{([^}]*)}', content, re.DOTALL)
        if build_match:
            build_str = build_match.group(1)
            
            target_match = re.search(r'target\s*:\s*[\'"]([^\'"]+)[\'"]', build_str)
            if target_match:
                config['target'] = target_match.group(1)
            
            module_preload_match = re.search(r'modulePreload\s*:\s*(\w+)', build_str)
            if module_preload_match:
                config['modulePreload'] = module_preload_match.group(1) == 'true'
        
        return config
    
    except Exception as e:
        print_error(f"Error parsing Vite config {file_path}: {str(e)}")
        return {}

def check_package(package_dir: Path, is_shell: bool = False) -> Dict[str, Any]:
    """Check consistency for a single package"""
    package_name = package_dir.name
    print_header(f"Checking package: {package_name}" + (" (Shell)" if is_shell else ""))
    
    package_info = {
        "name": package_name,
        "path": package_dir,
        "is_shell": is_shell,
        "issues": 0
    }
    
    # Check package.json
    package_json_path = package_dir / "package.json"
    package_json = load_json_file(package_json_path)
    if not package_json:
        print_error(f"Missing or invalid package.json in {package_name}")
        package_info["issues"] += 1
        return package_info
    
    package_info["package_json"] = package_json
    
    # Check dependencies versions
    package_info["dependencies"] = {
        **package_json.get("dependencies", {}),
        **package_json.get("devDependencies", {})
    }
    
    # Check for critical dependencies
    required_deps = ["react", "react-dom", "@originjs/vite-plugin-federation", "vite"]
    for dep in required_deps:
        if dep not in package_info["dependencies"]:
            print_warning(f"Missing dependency: {dep} in {package_name}")
            package_info["issues"] += 1
    
    # Check for postbuild script
    scripts = package_json.get("scripts", {})
    has_postbuild = "postbuild" in scripts
    if not has_postbuild and not is_shell:
        print_warning(f"No 'postbuild' script found to copy remoteEntry.js in {package_name}")
        package_info["issues"] += 1
    
    # Check vite.config.ts
    vite_config_path = package_dir / "vite.config.ts"
    vite_config = parse_vite_config(vite_config_path)
    package_info["vite_config"] = vite_config
    
    if not vite_config:
        print_error(f"Missing or invalid vite.config.ts in {package_name}")
        package_info["issues"] += 1
        return package_info
    
    # Check federation configuration
    if is_shell:
        if "remotes" not in vite_config:
            print_error(f"Shell is missing 'remotes' configuration")
            package_info["issues"] += 1
        else:
            for remote_name, remote_url in vite_config.get("remotes", {}).items():
                if "/assets/remoteEntry.js" not in remote_url:
                    print_warning(f"Remote URL for {remote_name} should point to /assets/remoteEntry.js: {remote_url}")
                    package_info["issues"] += 1
    else:
        if "exposes" not in vite_config:
            print_warning(f"Microfrontend {package_name} is not exposing any components")
            package_info["issues"] += 1
        
        if "filename" not in vite_config:
            print_warning(f"Missing 'filename' in federation config for {package_name}")
            package_info["issues"] += 1
        elif vite_config["filename"] != "remoteEntry.js":
            print_warning(f"Federation filename should be 'remoteEntry.js', found: {vite_config['filename']}")
            package_info["issues"] += 1
    
    # Check for shared dependencies
    if "shared" not in vite_config:
        print_warning(f"Missing 'shared' configuration in federation for {package_name}")
        package_info["issues"] += 1
    
    # Check build settings
    if vite_config.get("target") != "esnext":
        print_warning(f"Build target should be 'esnext' in {package_name}, found: {vite_config.get('target')}")
        package_info["issues"] += 1
    
    if vite_config.get("modulePreload") is not False:
        print_warning(f"modulePreload should be false in {package_name}")
        package_info["issues"] += 1
    
    # Check CORS settings
    if vite_config.get("cors") is not True:
        print_warning(f"CORS should be enabled in {package_name}")
        package_info["issues"] += 1
    
    # Check dist directory if it exists
    dist_dir = package_dir / "dist"
    if dist_dir.exists():
        package_info["has_dist"] = True
        
        # Check for remoteEntry.js locations
        assets_remote_entry = dist_dir / "assets" / "remoteEntry.js"
        root_remote_entry = dist_dir / "remoteEntry.js"
        
        if not is_shell:
            if not assets_remote_entry.exists():
                print_warning(f"Missing remoteEntry.js in assets directory for {package_name}")
                package_info["issues"] += 1
            else:
                print_success(f"Found remoteEntry.js in assets directory for {package_name}")
            
            if not root_remote_entry.exists():
                print_warning(f"Missing remoteEntry.js in root dist directory for {package_name}")
                package_info["issues"] += 1
            else:
                print_success(f"Found remoteEntry.js in root dist directory for {package_name}")
    else:
        package_info["has_dist"] = False
        print_info(f"No dist directory found for {package_name} (not built yet)")
    
    return package_info

def compare_packages(packages_info: List[Dict[str, Any]]) -> None:
    """Compare consistency across packages"""
    print_header("Cross-Package Consistency Checks")
    
    # Check version consistency across packages
    print_info("Checking dependency version consistency...")
    
    dependency_versions = {}
    
    for package in packages_info:
        for dep, version in package["dependencies"].items():
            if dep not in dependency_versions:
                dependency_versions[dep] = {}
            
            dependency_versions[dep][package["name"]] = version
    
    critical_deps = ["react", "react-dom", "@mui/material", "vite", "@originjs/vite-plugin-federation"]
    for dep in critical_deps:
        if dep not in dependency_versions:
            continue
        
        versions = set(dependency_versions[dep].values())
        if len(versions) > 1:
            print_warning(f"Inconsistent versions for {dep}: {dependency_versions[dep]}")
        else:
            print_success(f"Consistent versions for {dep}: {next(iter(versions))}")
    
    # Check port conflicts
    ports = {}
    for package in packages_info:
        port = package.get("vite_config", {}).get("port")
        if port:
            if port in ports:
                print_error(f"Port conflict: {port} used by both {package['name']} and {ports[port]}")
            else:
                ports[port] = package["name"]
    
    # Check federation name uniqueness
    names = {}
    for package in packages_info:
        name = package.get("vite_config", {}).get("name")
        if name:
            if name in names:
                print_error(f"Name conflict: {name} used by both {package['name']} and {names[name]}")
            else:
                names[name] = package["name"]
    
    # Check shell's remotes against available microfrontends
    shell_packages = [p for p in packages_info if p["is_shell"]]
    if not shell_packages:
        print_warning("No shell package identified for remote consistency check")
    else:
        shell = shell_packages[0]
        remotes = shell.get("vite_config", {}).get("remotes", {})
        microfrontend_names = {p.get("vite_config", {}).get("name") for p in packages_info if not p["is_shell"]}
        
        for remote_name in remotes:
            if remote_name not in microfrontend_names:
                print_warning(f"Shell references unknown remote: {remote_name}")
        
        for mf_name in microfrontend_names:
            if mf_name and mf_name not in remotes:
                print_warning(f"Microfrontend {mf_name} is not referenced by shell")

def check_project_root(root_dir: Path) -> None:
    """Check project root for workspace configuration"""
    print_header("Checking Project Root")
    
    # Check root package.json for workspace configuration
    root_package_json_path = root_dir / "package.json"
    root_package_json = load_json_file(root_package_json_path)
    
    if not root_package_json:
        print_warning("Missing or invalid root package.json")
        return
    
    # Check for workspaces configuration
    if "workspaces" not in root_package_json:
        print_warning("No workspaces configuration found in root package.json")
    else:
        print_success("Workspaces configuration found: " + str(root_package_json["workspaces"]))
    
    # Check for root level dependencies
    dev_deps = root_package_json.get("devDependencies", {})
    shared_dev_deps = ["vite", "@vitejs/plugin-react", "@originjs/vite-plugin-federation"]
    
    for dep in shared_dev_deps:
        if dep in dev_deps:
            print_success(f"Found shared devDependency at root: {dep}@{dev_deps[dep]}")
        else:
            print_warning(f"Missing shared devDependency at root: {dep}")
    
    # Check for federation.d.ts file
    federation_types_path = root_dir / "packages" / "shared" / "src" / "types" / "federation.d.ts"
    if not federation_types_path.exists():
        print_warning("Missing federation.d.ts file for type definitions")
    else:
        print_success("Found federation.d.ts file")
        
        # Basic check of the content
        with open(federation_types_path, 'r') as f:
            content = f.read()
            if "singleton" in content and "SharedConfig" in content:
                print_success("federation.d.ts contains required type definitions")
            else:
                print_warning("federation.d.ts may be missing required type definitions")

def main() -> int:
    """Main function to run the consistency checks"""
    if len(sys.argv) > 1:
        root_dir = Path(sys.argv[1])
    else:
        root_dir = Path.cwd()
    
    print_header(f"Starting Module Federation Consistency Check in {root_dir}")
    
    # Check project root configuration
    check_project_root(root_dir)
    
    # Find all packages
    packages = find_packages(root_dir)
    if not packages:
        print_error("No packages found to check")
        return 1
    
    print_info(f"Found {len(packages)} packages")
    
    # Identify shell and microfrontends
    shell_candidates = []
    for package in packages:
        package_json_path = package / "package.json"
        if not package_json_path.exists():
            continue
        
        with open(package_json_path, 'r') as f:
            try:
                data = json.load(f)
                # This is a simple heuristic - adjust as needed
                if data.get("name") == "shell":
                    shell_candidates.append(package)
            except:
                pass
    
    shell = None
    if shell_candidates:
        shell = shell_candidates[0]
        print_info(f"Identified shell package: {shell.name}")
    else:
        print_warning("Could not identify shell package, assuming first package is shell")
        shell = packages[0]
    
    # Check each package
    packages_info = []
    for package in packages:
        is_shell = package == shell
        package_info = check_package(package, is_shell)
        packages_info.append(package_info)
    
    # Cross-package consistency checks
    compare_packages(packages_info)
    
    # Summary
    print_header("Consistency Check Summary")
    print(f"Checks passed: {checks_passed}")
    print(f"Issues found: {issues_found}")
    
    for package_info in packages_info:
        status = f"{Colors.GREEN}PASS{Colors.END}" if package_info["issues"] == 0 else f"{Colors.RED}FAIL ({package_info['issues']} issues){Colors.END}"
        print(f"{package_info['name']}: {status}")
    
    return 0 if issues_found == 0 else 1

if __name__ == "__main__":
    sys.exit(main())