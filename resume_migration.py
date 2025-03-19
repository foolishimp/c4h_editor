#!/usr/bin/env python3
# resume_migration.py
#
# This script resumes the migration process from script 05

import os
import sys
import subprocess
from pathlib import Path

# Get the current working directory
PROJECT_ROOT = Path(os.getcwd())

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
    
    # Modify the write_file function to create parent directories
    if "def write_file(path, content):" in script_content:
        old_write_file = """def write_file(path, content):
    print(f"Writing file: {path}")
    with open(path, "w") as file:
        file.write(content)"""
        
        new_write_file = """def write_file(path, content):
    print(f"Writing file: {path}")
    # Ensure the parent directory exists
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as file:
        file.write(content)"""
        
        script_content = script_content.replace(old_write_file, new_write_file)
    
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
    # Check if the fixed script 05 exists, if not create it
    fixed_script_05 = PROJECT_ROOT / "migration_scripts" / "migration_script_05_fixed.py"
    if not fixed_script_05.exists():
        # Run the fix script
        fix_script = PROJECT_ROOT / "fix_migration_script_05.py"
        if not fix_script.exists():
            print("Please run fix_migration_script_05.py first to create the fixed script.")
            return 1
        
        subprocess.run([sys.executable, fix_script])
    
    # Now run the fixed script 05
    original_script_05 = PROJECT_ROOT / "migration_scripts" / "migration_script_05.py"
    if not run_script(original_script_05):
        print("Failed to run the fixed migration script 05.")
        return 1
    
    print("\n" + "=" * 80)
    print("MIGRATION COMPLETED SUCCESSFULLY!")
    print("=" * 80)
    print("\nNext steps:")
    print(f"1. Install dependencies: cd {ROOT_DIR} && npm install")
    print(f"2. Build shared package: cd {ROOT_DIR} && npm run build:shared")
    print(f"3. Start the application: cd {ROOT_DIR} && npm start")
    return 0

if __name__ == "__main__":
    sys.exit(main())