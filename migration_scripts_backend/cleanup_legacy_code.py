#!/usr/bin/env python
# File: cleanup_legacy_code.py
"""
Script to clean up legacy code in the C4H Editor backend.
This script removes deprecated files and backs them up to a legacy directory.
"""

import os
import shutil
from pathlib import Path
from datetime import datetime

# Files to remove
LEGACY_FILES = [
    "backend/services/prompt_repository.py",
    "backend/api/routes/prompts.py",
    "backend/models/prompt.py",
    "backend/services/workorder_repository.py",
    "backend/tests/test_prompt_repository.py",
    "backend/tests/test_workorder_repository.py",
    "backend/scripts/migrate_workorders.py",
]

def main():
    """Main function to remove legacy files."""
    # Create backup directory
    backup_dir = Path(f"legacy_backup_{datetime.now().strftime('%Y%m%d%H%M%S')}")
    backup_dir.mkdir(exist_ok=True)
    
    print(f"Backing up legacy files to {backup_dir}")
    
    # Process each file
    for file_path in LEGACY_FILES:
        path = Path(file_path)
        
        if path.exists():
            # Create parent directories in backup
            backup_path = backup_dir / path
            backup_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Backup file
            shutil.copy2(path, backup_path)
            print(f"Backed up: {path}")
            
            # Remove file
            path.unlink()
            print(f"Removed: {path}")
        else:
            print(f"File not found (already removed): {path}")
    
    print("\nLegacy code cleanup complete!")
    print(f"Backups stored in: {backup_dir}")
    print("\nReminder: The main.py and dependencies.py files have also been updated.")
    print("You should update these files manually with the versions provided.")

if __name__ == "__main__":
    # Ask for confirmation
    print("This script will remove legacy code files and back them up.")
    print("The following files will be removed:")
    for file in LEGACY_FILES:
        print(f"  - {file}")
    
    confirm = input("\nAre you sure you want to proceed? (y/n): ")
    if confirm.lower() == 'y':
        main()
    else:
        print("Operation cancelled.")