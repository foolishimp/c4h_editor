#!/usr/bin/env python3
# run_complete_migration.py
#
# This script runs all migration scripts in the correct order to:
# 1. Create the YamlEditor microfrontend
# 2. Create the ConfigSelector microfrontend
# 3. Create the JobManagement microfrontend
# 4. Update the Shared package
# 5. Update the Shell application

import os
import sys
import subprocess
from pathlib import Path

# Get the current working directory (should be the root of the project)
PROJECT_ROOT = Path(os.getcwd())

# The directory containing the migration scripts
SCRIPTS_DIR = PROJECT_ROOT / "migration_scripts"

# The root directory of the frontend codebase
ROOT_DIR = PROJECT_ROOT / "c4h-micro"

def run_script(script_path):
    """Run a Python script and capture its output."""
    print(f"\n{'=' * 80}")
    print(f"Running {script_path.name}")
    print(f"{'=' * 80}")
    
    # Create a modified version of the script with the correct BASE_DIR
    script_content = script_path.read_text()
    
    # Replace the BASE_DIR line if it exists
    if "BASE_DIR = Path(\"c4h-micro\")" in script_content:
        script_content = script_content.replace(
            "BASE_DIR = Path(\"c4h-micro\")",
            f"BASE_DIR = Path(\"{ROOT_DIR}\")"
        )
    
    # Create a temporary script with the modified content
    temp_script_path = script_path.with_suffix(".temp.py")
    temp_script_path.write_text(script_content)
    
    try:
        # Run the modified script
        result = subprocess.run(
            [sys.executable, temp_script_path],
            capture_output=True,
            text=True
        )
        
        if result.stdout:
            print(result.stdout)
        
        if result.stderr:
            print(f"ERRORS:\n{result.stderr}", file=sys.stderr)
        
        if result.returncode != 0:
            print(f"Script {script_path.name} failed with return code {result.returncode}", file=sys.stderr)
            return False
        
        return True
    finally:
        # Clean up the temporary script
        if temp_script_path.exists():
            temp_script_path.unlink()

def main():
    # Verify that the migration scripts directory exists
    if not SCRIPTS_DIR.exists() or not SCRIPTS_DIR.is_dir():
        print(f"Error: Migration scripts directory not found at {SCRIPTS_DIR}", file=sys.stderr)
        return 1
    
    # Verify that the frontend root directory exists
    if not ROOT_DIR.exists() or not ROOT_DIR.is_dir():
        print(f"Error: Frontend root directory not found at {ROOT_DIR}", file=sys.stderr)
        return 1
        
    # Define the scripts to run in order
    script_names = [
        # 1. YamlEditor microfrontend
        "migration_script_01.py",
        
        # 2. ConfigSelector microfrontend
        "migration_script_02a.py",
        "migration_script_02ba.py",
        "migration_script_02bb.py",
        "migration_script_02c.py",
        
        # 3. JobManagement microfrontend
        "migration_script_03a.py", 
        "migration_script_03b.py", 
        "migration_script_03c.py", 
        "migration_script_03d.py", 
        "migration_script_03e.py", 
        "migration_script_03f.py", 
        "migration_script_03g.py", 
        "migration_script_03h.py", 
        "migration_script_03i.py", 
        "migration_script_03j.py", 
        "migration_script_03k.py",
        
        # 4. Update Shared package
        "migration_script_04.py",
        
        # 5. Update Shell application
        "migration_script_05.py",
    ]
    
    # Convert to Path objects and check existence
    scripts = []
    missing_scripts = []
    for name in script_names:
        script_path = SCRIPTS_DIR / name
        if not script_path.exists():
            missing_scripts.append(name)
        scripts.append(script_path)
    
    if missing_scripts:
        print("Error: The following scripts are missing:", file=sys.stderr)
        for script in missing_scripts:
            print(f"  - {script}", file=sys.stderr)
        return 1
    
    # Print information about what will be done
    print(f"Migration scripts directory: {SCRIPTS_DIR}")
    print(f"Frontend root directory: {ROOT_DIR}")
    print(f"Will run {len(scripts)} migration scripts in sequence.")
    print("Press Enter to continue or Ctrl+C to abort...")
    input()
    
    # Run each script in order
    success = True
    for script_path in scripts:
        if not run_script(script_path):
            success = False
            break
    
    # Report final status
    if success:
        print("\n" + "=" * 80)
        print("COMPLETE MIGRATION SUCCEEDED!")
        print("=" * 80)
        print("\nNext steps:")
        print(f"1. Install dependencies: cd {ROOT_DIR} && npm install")
        print(f"2. Build shared package: cd {ROOT_DIR} && npm run build:shared")
        print(f"3. Start the application: cd {ROOT_DIR} && npm start")
        return 0
    else:
        print("\n" + "=" * 80)
        print("MIGRATION FAILED!")
        print("=" * 80)
        return 1

if __name__ == "__main__":
    sys.exit(main())