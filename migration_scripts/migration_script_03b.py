#!/usr/bin/env python3
# migration_script_03b.py
#
# This script creates the tsconfig files for the JobManagement microfrontend:
# - Creates tsconfig.json and tsconfig.node.json

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

def create_tsconfig_files():
    job_management_dir = BASE_DIR / "packages" / "job-management"
    
    # Create tsconfig.json
    tsconfig_json = {
        "compilerOptions": {
            "target": "ES2020",
            "useDefineForClassFields": True,
            "lib": ["ES2020", "DOM", "DOM.Iterable"],
            "module": "ESNext",
            "skipLibCheck": True,
            "moduleResolution": "bundler",
            "allowImportingTsExtensions": True,
            "resolveJsonModule": True,
            "isolatedModules": True,
            "noEmit": True,
            "jsx": "react-jsx",
            "strict": True,
            "noImplicitAny": True,
            "noUnusedLocals": True,
            "noUnusedParameters": True,
            "noFallthroughCasesInSwitch": True,
            "allowSyntheticDefaultImports": True,
            "esModuleInterop": True,
            "baseUrl": ".",
            "paths": {
                "@/*": ["./src/*"]
            }
        },
        "include": ["src", "../../global.d.ts"],
        "references": [
            {
                "path": "./tsconfig.node.json"
            }
        ]
    }
    
    write_file(job_management_dir / "tsconfig.json", json.dumps(tsconfig_json, indent=2))
    
    # Create tsconfig.node.json
    tsconfig_node_json = {
        "compilerOptions": {
            "composite": True,
            "skipLibCheck": True,
            "module": "ESNext",
            "moduleResolution": "bundler",
            "allowSyntheticDefaultImports": True
        },
        "include": ["vite.config.ts"]
    }
    
    write_file(job_management_dir / "tsconfig.node.json", json.dumps(tsconfig_node_json, indent=2))
    
    print("JobManagement tsconfig files created successfully!")

if __name__ == "__main__":
    create_tsconfig_files()