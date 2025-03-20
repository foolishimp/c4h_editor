#!/usr/bin/env python3
import os
import re
import sys
from pathlib import Path

def process_vite_config(file_path):
    print(f"Processing {file_path}")
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Remove 'react/jsx-runtime' entry from shared dependencies
    content = re.sub(r"'react/jsx-runtime':\s*{[^}]*},?\s*", "", content)
    
    # Add eager: true to react and react-dom if not present
    for lib in ['react', 'react-dom']:
        pattern = fr"'{lib}':\s*{{\s*([^}}]*?)\s*}}"
        replacement = lambda m: (
            f"'{lib}': {{ " + 
            (m.group(1) + ", " if not "eager:" in m.group(1) else m.group(1).replace("eager: false", "eager: true")) + 
            "eager: true }"
        )
        content = re.sub(pattern, replacement, content)
    
    # Write the modified content back
    with open(file_path, 'w') as f:
        f.write(content)
    
    return True

def main():
    # Get the project root directory
    if len(sys.argv) > 1:
        root_dir = sys.argv[1]
    else:
        root_dir = os.path.join(os.getcwd(), "c4h-micro")
    
    if not os.path.exists(root_dir):
        print(f"Error: Directory {root_dir} does not exist")
        return 1
    
    packages_dir = os.path.join(root_dir, "packages")
    if not os.path.exists(packages_dir):
        print(f"Error: Packages directory {packages_dir} does not exist")
        return 1
    
    # Find all vite.config.ts files
    vite_configs = []
    for pkg_dir in os.listdir(packages_dir):
        vite_config = os.path.join(packages_dir, pkg_dir, "vite.config.ts")
        if os.path.exists(vite_config):
            vite_configs.append(vite_config)
    
    if not vite_configs:
        print("No vite.config.ts files found")
        return 1
    
    print(f"Found {len(vite_configs)} vite.config.ts files to process")
    
    # Process each config file
    for config_file in vite_configs:
        success = process_vite_config(config_file)
        if success:
            print(f"Successfully updated {config_file}")
        else:
            print(f"Failed to update {config_file}")
    
    print("\nDone! Please run the build process again to verify the changes fixed the issue.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
