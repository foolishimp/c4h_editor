#!/usr/bin/env python3
# fix_migration_script_05.py
#
# This script fixes the migration_script_05.py by ensuring
# all necessary directories are created before writing files

import os
from pathlib import Path

# Function to modify migration script 05
def fix_migration_script_05():
    # Path to the script
    script_path = Path("migration_scripts/migration_script_05.py")
    
    # Read the script content
    with open(script_path, "r") as file:
        content = file.read()
    
    # Find the write_file function
    write_file_function = """def write_file(path, content):
    print(f"Writing file: {path}")
    with open(path, "w") as file:
        file.write(content)"""
    
    # Replace with a version that creates parent directories
    fixed_write_file_function = """def write_file(path, content):
    print(f"Writing file: {path}")
    # Ensure the parent directory exists
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as file:
        file.write(content)"""
    
    # Replace the function in the content
    modified_content = content.replace(write_file_function, fixed_write_file_function)
    
    # Write the modified content to a fixed script file
    fixed_script_path = Path("migration_scripts/migration_script_05_fixed.py")
    with open(fixed_script_path, "w") as file:
        file.write(modified_content)
    
    print(f"Fixed script written to {fixed_script_path}")
    print("You can now run this script directly:")
    print(f"python {fixed_script_path}")
    
    return fixed_script_path

if __name__ == "__main__":
    fixed_path = fix_migration_script_05()