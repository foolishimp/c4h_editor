#!/usr/bin/env python3
# File: 3_setup_config_editor.py
# 
# This script sets up the config-editor microfrontend package
# for the C4H Editor microfrontend architecture.

import os
import re
import sys
import shutil
from pathlib import Path

# Configuration
PROJECT_ROOT = "c4h-editor-micro"
SOURCE_FRONTEND = "../frontend"  # Path to the existing frontend code
CONFIG_EDITOR_DIR = os.path.join(PROJECT_ROOT, "packages", "config-editor")

def check_prerequisites():
    """Verify that the project structure and shared package have been set up"""
    if not os.path.exists(PROJECT_ROOT):
        print(f"Error: Project directory '{PROJECT_ROOT}' does not exist.")
        print("Please run 1_setup_structure.py first.")
        return False
        
    if not os.path.exists(SOURCE_FRONTEND):
        print(f"Error: Source frontend directory '{SOURCE_FRONTEND}' does not exist.")
        return False
        
    shared_index = os.path.join(PROJECT_ROOT, "packages", "shared", "src", "index.ts")
    if not os.path.exists(shared_index):
        print(f"Error: Shared package index not found at '{shared_index}'.")
        print("Please run 2_setup_shared.py first.")
        return False
        
    return True

def create_main_component():
    """Create the main ConfigEditor component"""
    print("\nCreating main ConfigEditor component...")
    
    config_editor_file = os.path.join(CONFIG_EDITOR_DIR, "src", "ConfigEditor.tsx")
    
    config_editor_content = """// File: packages/config-editor/src/ConfigEditor.tsx
/**
 * Main component for the Config Editor microfrontend
 * This is the entry point exposed via Module Federation
 */
import React from 'react';
import { useParams } from 'react-router-dom';
import { WorkOrderProvider } from './contexts/WorkOrderContext';
import WorkOrderEditor from './components/WorkOrderEditor';

// Main component exported for Module Federation
const ConfigEditor: React.FC = () => {
  // Get workOrderId from URL params
  const { id } = useParams<{ id?: string }>();
  
  return (
    <WorkOrderProvider>
      <WorkOrderEditor workOrderId={id} />
    </WorkOrderProvider>
  );
};

export default ConfigEditor;
"""
    
    with open(config_editor_file, "w") as f:
        f.write(config_editor_content)
    
    print(f"Created ConfigEditor component at {config_editor_file}")

def copy_context():
    """Copy and adapt the WorkOrderContext from original frontend"""
    print("\nCopying WorkOrderContext...")
    
    source_file = os.path.join(SOURCE_FRONTEND, "src", "contexts", "WorkOrderContext.tsx")
    dest_file = os.path.join(CONFIG_EDITOR_DIR, "src", "contexts", "WorkOrderContext.tsx")
    
    if os.path.exists(source_file):
        # Read the original file
        with open(source_file, "r") as f:
            content = f.read()
        
        # Add header comment
        header = f"// File: {dest_file}\n// Migrated from original frontend\n\n"
        
        # Replace import statements to use the shared package types
        modified_content = content.replace(
            "import { WorkOrder } from '../types/workorder';", 
            "import { WorkOrder, eventBus } from 'shared';"
        )
        
        # Replace other possible imports from types
        modified_content = re.sub(
            r"from ['\"]\.\.\/types\/([^'\"]+)['\"]", 
            r"from 'shared';", 
            modified_content
        )
        
        # Update API config import
        modified_content = re.sub(
            r"from ['\"]\.\.\/config\/api['\"]", 
            r"from 'shared';", 
            modified_content
        )
        
        # Add event bus integration - find saveWorkOrder function
        save_work_order_match = re.search(r"const saveWorkOrder = useCallback\(async[^{]+{", modified_content)
        if save_work_order_match:
            save_start_idx = save_work_order_match.end()
            # Add event publishing after successful save
            event_bus_code = """
      // Notify shell app about the save
      if (result) {
        eventBus.publish('workorder:saved', result);
      }
"""
            # Find a good spot to insert it - right after the successful save
            result_set_idx = modified_content.find("setWorkOrder(result)", save_start_idx)
            if result_set_idx > 0:
                end_of_line_idx = modified_content.find("\n", result_set_idx)
                if end_of_line_idx > 0:
                    modified_content = (
                        modified_content[:end_of_line_idx + 1] +
                        event_bus_code +
                        modified_content[end_of_line_idx + 1:]
                    )
        
        # Add the header
        modified_content = header + modified_content
        
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(dest_file), exist_ok=True)
        
        # Save to destination
        with open(dest_file, "w") as f:
            f.write(modified_content)
        
        print(f"Copied and modified {source_file} to {dest_file}")
    else:
        print(f"Warning: Source file {source_file} does not exist")

def copy_api_config():
    """Copy API configuration file from original frontend"""
    print("\nCopying API configuration...")
    
    api_config_source = os.path.join(SOURCE_FRONTEND, "src", "config", "api.ts")
    api_config_dest = os.path.join(CONFIG_EDITOR_DIR, "src", "config", "api.ts")
    
    if os.path.exists(api_config_source):
        # Read the original file
        with open(api_config_source, "r") as f:
            content = f.read()
        
        # Add header comment and export shared API from shared package
        modified_content = f"""// File: {api_config_dest}
// Migrated from original frontend

// Re-export from shared package
export * from 'shared';
"""
        
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(api_config_dest), exist_ok=True)
        
        # Save to destination
        with open(api_config_dest, "w") as f:
            f.write(modified_content)
        
        print(f"Created API config proxy at {api_config_dest}")
    else:
        print(f"Warning: Source file {api_config_source} does not exist")

def copy_hooks():
    """Copy API hooks from original frontend"""
    print("\nCopying API hooks...")
    
    hooks = [
        {"source": os.path.join(SOURCE_FRONTEND, "src", "hooks", "useWorkOrderApi.ts"), 
         "dest": os.path.join(CONFIG_EDITOR_DIR, "src", "hooks", "useWorkOrderApi.ts")},
        {"source": os.path.join(SOURCE_FRONTEND, "src", "hooks", "useConfigSection.ts"), 
         "dest": os.path.join(CONFIG_EDITOR_DIR, "src", "hooks", "useConfigSection.ts")},
        {"source": os.path.join(SOURCE_FRONTEND, "src", "hooks", "useJobApi.ts"), 
         "dest": os.path.join(CONFIG_EDITOR_DIR, "src", "hooks", "useJobApi.ts")}
    ]
    
    for hook in hooks:
        if os.path.exists(hook["source"]):
            # Read the original file
            with open(hook["source"], "r") as f:
                content = f.read()
            
            # Add header comment
            header = f"// File: {hook['dest']}\n// Migrated from original frontend\n\n"
            
            # Modify imports to match new structure
            modified_content = content
            
            # Update imports from types to shared package
            modified_content = re.sub(
                r"from ['\"]\.\.\/types\/([^'\"]+)['\"]", 
                r"from 'shared';", 
                modified_content
            )
            
            # Update API config import
            modified_content = re.sub(
                r"from ['\"]\.\.\/config\/api['\"]", 
                r"from 'shared';", 
                modified_content
            )
            
            # Add the header
            modified_content = header + modified_content
            
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(hook["dest"]), exist_ok=True)
            
            # Save to destination
            with open(hook["dest"], "w") as f:
                f.write(modified_content)
            
            print(f"Copied and modified {hook['source']} to {hook['dest']}")
        else:
            print(f"Warning: Source file {hook['source']} does not exist")

def copy_editor_components():
    """Copy WorkOrderEditor components from original frontend"""
    print("\nCopying editor components...")
    
    components = [
        {"source": os.path.join(SOURCE_FRONTEND, "src", "components", "WorkOrderEditor", "WorkOrderEditor.tsx"), 
         "dest": os.path.join(CONFIG_EDITOR_DIR, "src", "components", "WorkOrderEditor.tsx")},
        {"source": os.path.join(SOURCE_FRONTEND, "src", "components", "WorkOrderEditor", "YAMLEditor.tsx"), 
         "dest": os.path.join(CONFIG_EDITOR_DIR, "src", "components", "YAMLEditor.tsx")},
        {"source": os.path.join(SOURCE_FRONTEND, "src", "components", "WorkOrderEditor", "WorkOrderVersionControl.tsx"), 
         "dest": os.path.join(CONFIG_EDITOR_DIR, "src", "components", "WorkOrderVersionControl.tsx")}
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
                r"from 'shared';", 
                modified_content
            )
            
            # Update imports from context
            modified_content = re.sub(
                r"from ['\"]\.\.\/\.\.\/contexts\/([^'\"]+)['\"]", 
                r"from '../contexts/\1';", 
                modified_content
            )
            
            # Update imports from hooks
            modified_content = re.sub(
                r"from ['\"]\.\.\/\.\.\/hooks\/([^'\"]+)['\"]", 
                r"from '../hooks/\1';", 
                modified_content
            )
            
            # Update imports from common components
            modified_content = re.sub(
                r"from ['\"]\.\.\/\.\.\/components\/common\/([^'\"]+)['\"]", 
                r"from 'shared';", 
                modified_content
            )
            
            # Add the header
            modified_content = header + modified_content
            
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(component["dest"]), exist_ok=True)
            
            # Save to destination
            with open(component["dest"], "w") as f:
                f.write(modified_content)
            
            print(f"Copied and modified {component['source']} to {component['dest']}")
        else:
            print(f"Warning: Source file {component['source']} does not exist")

def create_index_html():
    """Create index.html for standalone development"""
    print("\nCreating index.html...")
    
    index_file = os.path.join(CONFIG_EDITOR_DIR, "index.html")
    
    index_content = """<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>C4H Config Editor</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
"""
    
    with open(index_file, "w") as f:
        f.write(index_content)
    
    print(f"Created index.html at {index_file}")

def create_main_file():
    """Create main.tsx for standalone development"""
    print("\nCreating main.tsx...")
    
    main_file = os.path.join(CONFIG_EDITOR_DIR, "src", "main.tsx")
    
    main_content = """// File: packages/config-editor/src/main.tsx
/**
 * Entry point for standalone development
 * This file is not used when the app is consumed as a microfrontend
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import ConfigEditor from './ConfigEditor';

// Simple console log to verify script execution
console.log('Config Editor application bootstrapping...');

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <CssBaseline />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ConfigEditor />} />
        <Route path="/:id" element={<ConfigEditor />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

console.log('Config Editor render called');
"""
    
    with open(main_file, "w") as f:
        f.write(main_content)
    
    print(f"Created main.tsx at {main_file}")

# Main function
if __name__ == "__main__":
    print("C4H Editor Migration - Step 3: Config Editor Setup")
    print("=================================================")
    
    # Check prerequisites
    if not check_prerequisites():
        sys.exit(1)
    
    # Create main ConfigEditor component
    create_main_component()
    
    # Copy context
    copy_context()
    
    # Copy API config
    copy_api_config()
    
    # Copy hooks
    copy_hooks()
    
    # Copy editor components
    copy_editor_components()
    
    # Create files for standalone development
    create_index_html()
    create_main_file()
    
    print("\nStep 3 Complete! Config Editor setup finished.")
    print("\nNext steps:")
    print("1. Run script to set up shell: python 4_setup_shell.py")