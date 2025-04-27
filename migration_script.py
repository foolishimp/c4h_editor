#!/usr/bin/env python3

import argparse
import os
import shutil
import sys
from pathlib import Path

# --- Configuration ---
# Define relative paths from the source root where data currently resides
# CORRECTED based on user's ls output
SOURCE_PATHS = {
    "repos_root": "repositories",  # Directly under source root
    "jobs_data": "data/jobs",     # Directly under source root/data
    "shell_db_dir": "shell_service/data", # Still nested under shell_service
    "shell_db_file": "c4h_prefs.db"
}

# Define relative paths within the destination root where data should go
DEST_PATHS = {
    "repos_root": "repositories",
    "jobs_data": "jobs",
    "shell_db_dir": "shell_data"
}

# Configuration repository subdirectories to copy
REPO_SUBDIRS = ["workorders", "teamconfigs", "runtimeconfigs"]

# --- Colors for Output ---
GREEN = '\033[0;32m'
YELLOW = '\033[1;33m'
RED = '\033[0;31m'
BLUE = '\033[0;34m'
NC = '\033[0m' # No Color

# --- Helper Functions ---
def print_header(title: str):
    """Prints a formatted header."""
    print(f"\n{BLUE}========== {title} =========={NC}")

def print_success(message: str):
    """Prints a success message."""
    print(f"{GREEN}✅ {message}{NC}")

def print_warning(message: str):
    """Prints a warning message."""
    print(f"{YELLOW}⚠️ {message}{NC}")

def print_error(message: str):
    """Prints an error message."""
    print(f"{RED}❌ {message}{NC}")

def copy_directory_contents(src_dir: Path, dest_dir: Path):
    """Copies contents of src_dir to dest_dir, creating dest_dir if needed."""
    if not src_dir.is_dir():
        print_warning(f"Source directory not found, skipping: {src_dir}")
        return False
    try:
        dest_dir.mkdir(parents=True, exist_ok=True)
        # Use copytree with dirs_exist_ok=True to mimic copying contents
        shutil.copytree(src_dir, dest_dir, dirs_exist_ok=True)
        print_success(f"Copied contents of {src_dir} to {dest_dir}")
        return True
    except Exception as e:
        print_error(f"Error copying directory {src_dir} to {dest_dir}: {e}")
        return False

def copy_file(src_file: Path, dest_file: Path):
    """Copies src_file to dest_file, creating parent directory if needed."""
    if not src_file.is_file():
        print_warning(f"Source file not found, skipping: {src_file}")
        return False
    try:
        dest_file.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src_file, dest_file) # copy2 preserves more metadata
        print_success(f"Copied file {src_file} to {dest_file}")
        return True
    except Exception as e:
        print_error(f"Error copying file {src_file} to {dest_file}: {e}")
        return False

def remove_directory(dir_path: Path):
    """Removes a directory if it exists."""
    if dir_path.is_dir():
        try:
            shutil.rmtree(dir_path)
            print_success(f"Removed directory: {dir_path}")
            return True
        except Exception as e:
            print_error(f"Error removing directory {dir_path}: {e}")
            return False
    else:
        # print_warning(f"Directory not found, skipping removal: {dir_path}")
        return True # Not an error if it doesn't exist

# --- Main Script Logic ---
def main():
    parser = argparse.ArgumentParser(
        description="Migrate C4H backend data folders to a new location.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    parser.add_argument(
        "source_root",
        help="Absolute path to the source project root directory (e.g., /Users/jim/src/apps/c4h_editor)." # Updated example
    )
    parser.add_argument(
        "destination_root",
        help="Absolute path to the new external data root directory (e.g., /path/to/new/c4h_data)."
    )
    args = parser.parse_args()

    source_root = Path(args.source_root).resolve()
    destination_root = Path(args.destination_root).resolve()

    print_header("DATA MIGRATION SCRIPT (Corrected Paths)")
    print(f"Source Project Root: {source_root}")
    print(f"Destination Data Root: {destination_root}")

    if not source_root.is_dir():
        print_error(f"Source root directory does not exist: {source_root}")
        sys.exit(1)

    # --- 1. Create Destination Structure ---
    print_header("1. CREATING DESTINATION DIRECTORIES")
    dest_repos_path = destination_root / DEST_PATHS["repos_root"]
    dest_jobs_path = destination_root / DEST_PATHS["jobs_data"]
    dest_shell_db_path = destination_root / DEST_PATHS["shell_db_dir"]

    try:
        dest_repos_path.mkdir(parents=True, exist_ok=True)
        print_success(f"Ensured directory exists: {dest_repos_path}")
        dest_jobs_path.mkdir(parents=True, exist_ok=True)
        print_success(f"Ensured directory exists: {dest_jobs_path}")
        dest_shell_db_path.mkdir(parents=True, exist_ok=True)
        print_success(f"Ensured directory exists: {dest_shell_db_path}")
    except Exception as e:
        print_error(f"Failed to create destination directories: {e}")
        sys.exit(1)

    all_successful = True

    # --- 2. Copy Configuration Repositories ---
    print_header("2. COPYING CONFIGURATION REPOSITORIES")
    # Use corrected source path
    src_repos_root = source_root / SOURCE_PATHS["repos_root"]
    if not src_repos_root.is_dir():
        print_warning(f"Source repositories root not found: {src_repos_root}")
    else:
        for repo_name in REPO_SUBDIRS:
            src_repo_path = src_repos_root / repo_name
            dest_repo_path = dest_repos_path / repo_name
            if copy_directory_contents(src_repo_path, dest_repo_path):
                # Remove .git directory from destination
                git_dir_to_remove = dest_repo_path / ".git"
                if not remove_directory(git_dir_to_remove):
                    all_successful = False
            else:
                all_successful = False # Mark failure if copy failed

    # --- 3. Copy Jobs Data ---
    print_header("3. COPYING JOBS DATA")
    # Use corrected source path
    src_jobs_path = source_root / SOURCE_PATHS["jobs_data"]
    if not copy_directory_contents(src_jobs_path, dest_jobs_path):
        all_successful = False

    # --- 4. Copy Shell Service Database ---
    print_header("4. COPYING SHELL SERVICE DATABASE")
    # Source path for shell DB is correct
    src_shell_db_file = source_root / SOURCE_PATHS["shell_db_dir"] / SOURCE_PATHS["shell_db_file"]
    dest_shell_db_file = dest_shell_db_path / SOURCE_PATHS["shell_db_file"]
    if not copy_file(src_shell_db_file, dest_shell_db_file):
        all_successful = False

    # --- Completion Summary ---
    print_header("MIGRATION SUMMARY")
    if all_successful:
        print_success("Data migration script completed successfully.")
        print(f"{YELLOW}REMINDER: You still need to:")
        print(f"{YELLOW}  - Update 'environments.json' with the new paths ({destination_root}).")
        print(f"{YELLOW}  - Apply the necessary code changes (diffs).")
        print(f"{YELLOW}  - Restart services using 'python start_backends.py --env <your_env>'.")
    else:
        print_error("Data migration script completed with errors. Please review the output above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
