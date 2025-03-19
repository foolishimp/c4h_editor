#!/usr/bin/env python3
# migration_script_03k.py
#
# This script updates the root package.json and global.d.ts to include JobManagement

import os
import json
from pathlib import Path

BASE_DIR = Path("c4h-micro")

def create_directory(path):
    if not path.exists():
        print(f"Creating directory: {path}")
        path.mkdir(parents=True, exist_ok=True)

def write_file(path, content):
    print(f"Writing file: {path}")
    with open(path, "w") as file:
        file.write(content)

def update_root_files():
    # Update root package.json
    root_package_json_path = BASE_DIR / "package.json"
    with open(root_package_json_path, "r") as file:
        root_package_json = json.load(file)
    
    # Add scripts for job-management
    if "scripts" in root_package_json:
        root_package_json["scripts"]["start:job-management"] = "npm run start -w packages/job-management"
        root_package_json["scripts"]["build:job-management"] = "npm run build -w packages/job-management"
        
        # Update start script to include job-management
        start_script = root_package_json["scripts"]["start"]
        if "job-management" not in start_script:
            # This is more complex as we need to insert it into the existing concurrently command
            if "yaml-editor,config-selector" in start_script:
                # Replace with all microfrontends
                root_package_json["scripts"]["start"] = start_script.replace(
                    "yaml-editor,config-selector",
                    "yaml-editor,config-selector,job-management"
                ).replace(
                    "yellow,cyan",
                    "yellow,cyan,magenta"
                ).replace(
                    "npm run start:yaml-editor\" \"npm run start:config-selector\"",
                    "npm run start:yaml-editor\" \"npm run start:config-selector\" \"npm run start:job-management\""
                )
            
        # Update build script
        build_script = root_package_json["scripts"]["build"]
        if "job-management" not in build_script:
            # Insert job-management before config-editor
            if "build:yaml-editor && npm run build:config-selector" in build_script:
                root_package_json["scripts"]["build"] = build_script.replace(
                    "build:yaml-editor && npm run build:config-selector",
                    "build:yaml-editor && npm run build:config-selector && npm run build:job-management"
                )
    
    write_file(root_package_json_path, json.dumps(root_package_json, indent=2))
    
    # Update global.d.ts to include JobManager
    global_d_ts_path = BASE_DIR / "global.d.ts"
    with open(global_d_ts_path, "r") as file:
        global_d_ts_content = file.read()
    
    if "jobManagement/JobManager" not in global_d_ts_content:
        updated_global_d_ts = global_d_ts_content.strip() + "\ndeclare module 'jobManagement/JobManager';\n"
        write_file(global_d_ts_path, updated_global_d_ts)
    
    print("Root package.json and global.d.ts updated successfully!")

if __name__ == "__main__":
    update_root_files()