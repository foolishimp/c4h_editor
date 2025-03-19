#!/usr/bin/env python
# File: scripts/identify_legacy_code.py
"""
Script to identify legacy code in the C4H Editor backend.
This script scans the codebase for imports from deprecated modules
and generates a report of files that need to be updated.
"""

import os
import re
from pathlib import Path
from collections import defaultdict

# Define legacy modules
LEGACY_MODULES = [
    'backend.services.prompt_repository',
    'backend.services.workorder_repository',  # Note: not workorder_repository_v2
    'backend.models.prompt',
]

def find_imports(file_path):
    """Find imports from legacy modules in a file."""
    with open(file_path, 'r') as f:
        content = f.read()
    
    imports = []
    for module in LEGACY_MODULES:
        # Look for import statements
        import_pattern = re.compile(fr'(from\s+{module}\s+import|import\s+{module})')
        if import_pattern.search(content):
            imports.append(module)
    
    return imports

def scan_directory(directory):
    """Scan a directory for Python files importing legacy modules."""
    results = defaultdict(list)
    
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.py'):
                file_path = os.path.join(root, file)
                legacy_imports = find_imports(file_path)
                if legacy_imports:
                    results[file_path] = legacy_imports
    
    return results

def main():
    """Main function to scan the codebase and generate a report."""
    # Get the backend directory (assuming this script is in the scripts/ directory)
    backend_dir = Path(__file__).parent.parent / 'backend'
    
    # Scan the backend directory
    results = scan_directory(backend_dir)
    
    # Print the results
    print("=== Legacy Code Report ===")
    print(f"\nFound {len(results)} files with imports from legacy modules:\n")
    
    for file_path, imports in results.items():
        rel_path = os.path.relpath(file_path, backend_dir.parent)
        print(f"File: {rel_path}")
        print("Legacy imports:")
        for imp in imports:
            print(f"  - {imp}")
        print()
    
    print("=== Recommended Actions ===")
    print("1. Update imports to use the new modules:")
    print("   - Replace 'backend.services.workorder_repository' with 'backend.services.workorder_repository_v2'")
    print("   - Replace prompt-based imports with config-based alternatives")
    print("2. Follow the migration guide to update your code to use the generic config API")

if __name__ == '__main__':
    main()