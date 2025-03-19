#!/usr/bin/env python3
# migration_script_03a.py
#
# This script creates the basic structure for the JobManagement microfrontend:
# - Creates package.json

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

def setup_job_management_basic_structure():
    # Create directory structure
    job_management_dir = BASE_DIR / "packages" / "job-management"
    create_directory(job_management_dir)
    create_directory(job_management_dir / "src")
    create_directory(job_management_dir / "src" / "components")
    create_directory(job_management_dir / "src" / "contexts")
    create_directory(job_management_dir / "src" / "hooks")
    create_directory(job_management_dir / "src" / "utils")
    
    # Create package.json
    package_json = {
        "name": "job-management",
        "private": True,
        "version": "0.1.0",
        "type": "module",
        "scripts": {
            "start": "vite --port 3004 --strictPort",
            "build": "tsc && vite build",
            "preview": "vite preview --port 3004 --strictPort"
        },
        "dependencies": {
            "@emotion/react": "^11.11.4",
            "@emotion/styled": "^11.11.0",
            "@mui/icons-material": "^5.15.14",
            "@mui/material": "^5.15.14",
            "axios": "^1.6.7",
            "react": "^18.3.1",
            "react-dom": "^18.3.1",
            "react-router-dom": "^6.22.3",
            "date-fns": "^3.6.0",
            "shared": "*"
        },
        "devDependencies": {
            "@originjs/vite-plugin-federation": "^1.3.5",
            "@types/react": "^18.2.61",
            "@types/react-dom": "^18.2.19",
            "@vitejs/plugin-react": "^4.3.4",
            "typescript": "^5.3.3",
            "vite": "^5.4.14"
        }
    }
    
    write_file(job_management_dir / "package.json", json.dumps(package_json, indent=2))
    
    print("JobManagement package.json created successfully!")

if __name__ == "__main__":
    setup_job_management_basic_structure()