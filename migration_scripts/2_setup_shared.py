#!/usr/bin/env python3
# File: 2_setup_shared.py
# 
# This script sets up the shared package for the C4H Editor microfrontend architecture.
# It copies type definitions, shared components, and utilities.

import os
import re
import sys
import shutil
from pathlib import Path

# Configuration
PROJECT_ROOT = "c4h-editor-micro"
SOURCE_FRONTEND = "../frontend"  # Path to the existing frontend code
SHARED_PACKAGE_DIR = os.path.join(PROJECT_ROOT, "packages", "shared")

def check_prerequisites():
    """Verify that the project structure has been set up"""
    if not os.path.exists(PROJECT_ROOT):
        print(f"Error: Project directory '{PROJECT_ROOT}' does not exist.")
        print("Please run 1_setup_structure.py first.")
        return False
        
    if not os.path.exists(SOURCE_FRONTEND):
        print(f"Error: Source frontend directory '{SOURCE_FRONTEND}' does not exist.")
        return False
        
    return True

def create_event_bus():
    """Create event bus for cross-microfrontend communication"""
    print("\nCreating event bus...")
    
    event_bus_file = os.path.join(SHARED_PACKAGE_DIR, "src", "utils", "eventBus.ts")
    os.makedirs(os.path.dirname(event_bus_file), exist_ok=True)
    
    event_bus_content = """// File: packages/shared/src/utils/eventBus.ts
/**
 * EventBus for cross-microfrontend communication
 * Provides a simple pub/sub mechanism for sharing events
 */

type EventCallback = (data: any) => void;

class EventBus {
  private events: Record<string, EventCallback[]> = {};

  subscribe(event: string, callback: EventCallback): () => void {
    if (!this.events[event]) {
      this.events[event] = [];
    }

    this.events[event].push(callback);

    // Return unsubscribe function
    return () => {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    };
  }

  publish(event: string, data: any): void {
    if (!this.events[event]) {
      return;
    }

    this.events[event].forEach(callback => {
      callback(data);
    });
  }
}

// Create singleton instance
const eventBus = new EventBus();

// Make available globally for cross-microfrontend communication
(window as any).__C4H_EVENT_BUS__ = eventBus;

export default eventBus;
"""
    
    with open(event_bus_file, "w") as f:
        f.write(event_bus_content)
    
    print(f"Created event bus at {event_bus_file}")

def copy_type_definitions():
    """Copy type definitions from original frontend to shared package"""
    print("\nCopying type definitions...")
    
    type_files = [
        {"source": os.path.join(SOURCE_FRONTEND, "src", "types", "workorder.ts"), 
         "dest": os.path.join(SHARED_PACKAGE_DIR, "src", "types", "workorder.ts")},
        {"source": os.path.join(SOURCE_FRONTEND, "src", "types", "job.ts"), 
         "dest": os.path.join(SHARED_PACKAGE_DIR, "src", "types", "job.ts")},
        {"source": os.path.join(SOURCE_FRONTEND, "src", "types", "config.ts"), 
         "dest": os.path.join(SHARED_PACKAGE_DIR, "src", "types", "config.ts")}
    ]
    
    for file_info in type_files:
        if os.path.exists(file_info["source"]):
            # Read the original file
            with open(file_info["source"], "r") as f:
                content = f.read()
            
            # Add header comment
            header = f"// File: {file_info['dest']}\n// Migrated from original frontend\n\n"
            
            modified_content = header + content
            
            # Save to destination
            os.makedirs(os.path.dirname(file_info["dest"]), exist_ok=True)
            with open(file_info["dest"], "w") as f:
                f.write(modified_content)
            
            print(f"Copied and modified {file_info['source']} to {file_info['dest']}")
        else:
            print(f"Warning: Source file {file_info['source']} does not exist")

def copy_shared_components():
    """Copy shared components from original frontend to shared package"""
    print("\nCopying shared UI components...")
    
    components = [
        {"source": os.path.join(SOURCE_FRONTEND, "src", "components", "common", "DiffViewer.tsx"), 
         "dest": os.path.join(SHARED_PACKAGE_DIR, "src", "components", "DiffViewer.tsx")},
        {"source": os.path.join(SOURCE_FRONTEND, "src", "components", "common", "TimeAgo.tsx"), 
         "dest": os.path.join(SHARED_PACKAGE_DIR, "src", "components", "TimeAgo.tsx")}
    ]
    
    for component in components:
        if os.path.exists(component["source"]):
            # Read the original file
            with open(component["source"], "r") as f:
                content = f.read()
            
            # Add header comment
            header = f"// File: {component['dest']}\n// Migrated from original frontend\n\n"
            
            # Modify imports to match new structure
            modified_content = content
            
            # Update imports from types to shared package
            modified_content = re.sub(
                r"from ['\"]\.\.\/\.\.\/types\/([^'\"]+)['\"]", 
                r"from '../types/\1'", 
                modified_content
            )
            
            # Add the header
            modified_content = header + modified_content
            
            # Save to destination
            os.makedirs(os.path.dirname(component["dest"]), exist_ok=True)
            with open(component["dest"], "w") as f:
                f.write(modified_content)
            
            print(f"Copied and modified {component['source']} to {component['dest']}")
        else:
            print(f"Warning: Source file {component['source']} does not exist")

def copy_api_config():
    """Copy API configuration file from original frontend to shared package"""
    print("\nCopying API configuration...")
    
    api_config_source = os.path.join(SOURCE_FRONTEND, "src", "config", "api.ts")
    api_config_dest = os.path.join(SHARED_PACKAGE_DIR, "src", "config", "api.ts")
    
    if os.path.exists(api_config_source):
        # Read the original file
        with open(api_config_source, "r") as f:
            content = f.read()
        
        # Add header comment
        header = f"// File: {api_config_dest}\n// Migrated from original frontend\n\n"
        modified_content = header + content
        
        # Save to destination
        os.makedirs(os.path.dirname(api_config_dest), exist_ok=True)
        with open(api_config_dest, "w") as f:
            f.write(modified_content)
        
        print(f"Copied and modified {api_config_source} to {api_config_dest}")
    else:
        print(f"Warning: Source file {api_config_source} does not exist")

def create_shared_index():
    """Create index.ts file for the shared package"""
    print("\nCreating shared package index.ts...")
    
    index_file = os.path.join(SHARED_PACKAGE_DIR, "src", "index.ts")
    
    index_content = """// File: packages/shared/src/index.ts
/**
 * Main entry point for shared package
 * Exports all shared types, utilities, and components
 */

// Export shared types
export * from './types/workorder';
export * from './types/job';
export * from './types/config';

// Export utils
export { default as eventBus } from './utils/eventBus';

// Export shared components
export { default as TimeAgo } from './components/TimeAgo';
export { default as DiffViewer } from './components/DiffViewer';

// Export API config
export { default as api, API_ENDPOINTS } from './config/api';"""
    
    with open(index_file, "w") as f:
        f.write(index_content)
    
    print(f"Created shared package index.ts at {index_file}")

# Main function
if __name__ == "__main__":
    print("C4H Editor Migration - Step 2: Shared Package Setup")
    print("==================================================")
    
    # Check prerequisites
    if not check_prerequisites():
        sys.exit(1)
    
    # Create event bus
    create_event_bus()
    
    # Copy type definitions
    copy_type_definitions()
    
    # Copy shared components
    copy_shared_components()
    
    # Copy API configuration
    copy_api_config()
    
    # Create shared index
    create_shared_index()
    
    print("\nStep 2 Complete! Shared package setup finished.")
    print("\nNext steps:")
    print("1. Run script to set up config-editor: python 3_setup_config_editor.py")