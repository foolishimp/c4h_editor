#!/usr/bin/env python3
# File: 4_setup_shell.py
# 
# This script sets up the shell application for the C4H Editor microfrontend architecture.
# It copies navigation components, list views, and other UI components.

import os
import re
import sys
import shutil
from pathlib import Path

# Configuration
PROJECT_ROOT = "c4h-editor-micro"
SOURCE_FRONTEND = "../frontend"
SHELL_DIR = os.path.join(PROJECT_ROOT, "packages", "shell")

def check_prerequisites():
    """Verify that the project structure, shared package, and config-editor have been set up"""
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
        
    config_editor_main = os.path.join(PROJECT_ROOT, "packages", "config-editor", "src", "ConfigEditor.tsx")
    if not os.path.exists(config_editor_main):
        print(f"Error: Config Editor main component not found at '{config_editor_main}'.")
        print("Please run 3_setup_config_editor.py first.")
        return False
        
    return True

def create_app_component():
    """Create the main App component for the shell"""
    print("\nCreating main App component...")
    
    app_file = os.path.join(SHELL_DIR, "src", "App.tsx")
    
    app_content = """// File: packages/shell/src/App.tsx
/**
 * Main App component for the shell application
 * Orchestrates all microfrontends and handles routing
 */
import React, { lazy, Suspense } from 'react';
import { ThemeProvider, CssBaseline, Box, CircularProgress } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Navigation from './components/common/Navigation';
import WorkOrderList from './components/WorkOrderList/WorkOrderList';
import JobsList from './components/JobsList/JobsList';
import { JobDetails } from './components/JobDetails/JobDetails';

// Lazy load the ConfigEditor from remote
const ConfigEditor = lazy(() => import('configEditor/ConfigEditor'));

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f7fa',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      'Segoe UI',
      'Roboto',
      'Oxygen',
      'Ubuntu',
      'Cantarell',
      'Open Sans',
      'Helvetica Neue',
      'sans-serif',
    ].join(','),
  },
});

// Create a loading component for Suspense fallback
const Loading = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <CircularProgress />
  </Box>
);

// Main App component
function App() {
  const [selectedJobId, setSelectedJobId] = React.useState<string | null>(null);

  const handleJobSelect = (jobId: string) => {
    setSelectedJobId(jobId);
  };

  const handleCloseJobDetails = () => {
    setSelectedJobId(null);
  };

  const handleCancelJob = (jobId: string) => {
    console.log('Cancel job:', jobId);
    // Implementation will be handled by JobsList component
  };

  const handleRefreshJobs = () => {
    console.log('Refresh jobs');
    // Implementation will be handled by JobsList component
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex' }}>
          <Navigation />
          <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
            <Routes>
              <Route path="/" element={<Navigate to="/workorders" replace />} />
              
              {/* WorkOrder list route */}
              <Route path="/workorders" element={<WorkOrderList />} />
              
              {/* WorkOrder editor routes - using remote microfrontend */}
              <Route path="/workorders/new" element={
                <Suspense fallback={<Loading />}>
                  <ConfigEditor />
                </Suspense>
              } />
              <Route path="/workorders/:id" element={
                <Suspense fallback={<Loading />}>
                  <ConfigEditor />
                </Suspense>
              } />
              
              {/* Job routes */}
              <Route path="/jobs" element={
                <>
                  <JobsList 
                    onSelect={handleJobSelect} 
                    onRefresh={handleRefreshJobs} 
                  />
                  {selectedJobId && (
                    <JobDetails 
                      jobId={selectedJobId} 
                      onClose={handleCloseJobDetails} 
                      onCancel={handleCancelJob} 
                    />
                  )}
                </>
              } />
            </Routes>
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;
"""
    
    with open(app_file, "w") as f:
        f.write(app_content)
    
    print(f"Created App component at {app_file}")

def create_entry_point():
    """Create the main entry point for the shell"""
    print("\nCreating entry point (index.tsx)...")
    
    index_file = os.path.join(SHELL_DIR, "src", "index.tsx")
    
    index_content = """// File: packages/shell/src/index.tsx
/**
 * Main entry point for the shell application
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Simple console log to verify script execution
console.log('Shell application bootstrapping...');

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Log to verify rendering attempt
console.log('Shell render called');
"""
    
    with open(index_file, "w") as f:
        f.write(index_content)
    
    print(f"Created index.tsx at {index_file}")

def create_index_html():
    """Create index.html for the shell"""
    print("\nCreating index.html...")
    
    index_file = os.path.join(SHELL_DIR, "index.html")
    
    index_content = """<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>C4H Editor</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/index.tsx"></script>
  </body>
</html>
"""
    
    with open(index_file, "w") as f:
        f.write(index_content)
    
    print(f"Created index.html at {index_file}")

def copy_css():
    """Copy CSS file from original frontend"""
    print("\nCopying CSS file...")
    
    source_css = os.path.join(SOURCE_FRONTEND, "src", "index.css")
    dest_css = os.path.join(SHELL_DIR, "src", "index.css")
    
    if os.path.exists(source_css):
        # Read the original file
        with open(source_css, "r") as f:
            content = f.read()
        
        # Add header comment
        header = f"/* File: {dest_css}\n * Migrated from original frontend\n */\n\n"
        modified_content = header + content
        
        # Save to destination
        with open(dest_css, "w") as f:
            f.write(modified_content)
        
        print(f"Copied and modified {source_css} to {dest_css}")
    else:
        print(f"Warning: Source file {source_css} does not exist")
        
        # Create minimal CSS
        minimal_css = """/* File: packages/shell/src/index.css */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  line-height: 1.6;
  color: #333;
  background-color: #f5f7fa;
  margin: 0;
}

#root {
  height: 100vh;
}
"""
        with open(dest_css, "w") as f:
            f.write(minimal_css)
        
        print(f"Created minimal CSS file at {dest_css}")

def copy_api_config():
    """Copy API configuration file from original frontend to shell"""
    print("\nCopying API configuration...")
    
    api_config_source = os.path.join(SOURCE_FRONTEND, "src", "config", "api.ts")
    api_config_dest = os.path.join(SHELL_DIR, "src", "config", "api.ts")
    
    if os.path.exists(api_config_source):
        # Read the original file
        with open(api_config_source, "r") as f:
            content = f.read()
        
        # Add header comment and re-export from shared
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

def copy_common_components():
    """Copy common UI components from original frontend to shell"""
    print("\nCopying common UI components...")
    
    components = [
        {"source": os.path.join(SOURCE_FRONTEND, "src", "components", "common", "Navigation.tsx"), 
         "dest": os.path.join(SHELL_DIR, "src", "components", "common", "Navigation.tsx")},
        {"source": os.path.join(SOURCE_FRONTEND, "src", "components", "common", "TimeAgo.tsx"), 
         "dest": os.path.join(SHELL_DIR, "src", "components", "common", "TimeAgo.tsx")}
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
            
            # Update API config import
            modified_content = re.sub(
                r"from ['\"]\.\.\/\.\.\/config\/api['\"]", 
                r"from '@/config/api';", 
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

def copy_list_components():
    """Copy list view components from original frontend to shell"""
    print("\nCopying list components...")
    
    components = [
        {"source": os.path.join(SOURCE_FRONTEND, "src", "components", "WorkOrderList", "WorkOrderList.tsx"), 
         "dest": os.path.join(SHELL_DIR, "src", "components", "WorkOrderList", "WorkOrderList.tsx")},
        {"source": os.path.join(SOURCE_FRONTEND, "src", "components", "JobsList", "JobsList.tsx"), 
         "dest": os.path.join(SHELL_DIR, "src", "components", "JobsList", "JobsList.tsx")},
        {"source": os.path.join(SOURCE_FRONTEND, "src", "components", "JobDetails", "JobDetails.tsx"), 
         "dest": os.path.join(SHELL_DIR, "src", "components", "JobDetails", "JobDetails.tsx")}
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
            
            # Update imports for common components
            modified_content = re.sub(
                r"from ['\"]\.\.\/common\/([^'\"]+)['\"]", 
                r"from '../common/\1';", 
                modified_content
            )
            
            # Update API config and hooks imports
            modified_content = re.sub(
                r"from ['\"]\.\.\/\.\.\/config\/api['\"]", 
                r"from '@/config/api';", 
                modified_content
            )
            
            modified_content = re.sub(
                r"from ['\"]\.\.\/\.\.\/hooks\/([^'\"]+)['\"]", 
                r"from '@/hooks/\1';", 
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

def copy_api_hooks():
    """Copy API hooks from original frontend to shell"""
    print("\nCopying API hooks...")
    
    hooks = [
        {"source": os.path.join(SOURCE_FRONTEND, "src", "hooks", "useWorkOrderApi.ts"), 
         "dest": os.path.join(SHELL_DIR, "src", "hooks", "useWorkOrderApi.ts")},
        {"source": os.path.join(SOURCE_FRONTEND, "src", "hooks", "useJobApi.ts"), 
         "dest": os.path.join(SHELL_DIR, "src", "hooks", "useJobApi.ts")}
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
                r"from '@/config/api';", 
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

def create_event_listener():
    """Create an event listener to handle cross-microfrontend communication"""
    print("\nCreating event listener...")
    
    event_listener_file = os.path.join(SHELL_DIR, "src", "utils", "eventListener.ts")
    
    # Create directory if it doesn't exist
    os.makedirs(os.path.dirname(event_listener_file), exist_ok=True)
    
    event_listener_content = """// File: packages/shell/src/utils/eventListener.ts
/**
 * Event listener for cross-microfrontend communication
 * Subscribes to events from the shared event bus
 */
import { eventBus } from 'shared';

// Initialize the event listeners
export const initEventListeners = () => {
  // Listen for workorder saved event
  const unsubscribeWorkOrderSaved = eventBus.subscribe('workorder:saved', (workOrder) => {
    console.log('WorkOrder saved event received:', workOrder);
    // Here you could trigger a refresh of the WorkOrder list
    // or update any other state in the shell application
  });

  // Return unsubscribe functions for cleanup
  return () => {
    unsubscribeWorkOrderSaved();
  };
};

// Export a function to inject the event listener into the App
export const withEventListener = (Component: React.ComponentType) => {
  return (props: any) => {
    React.useEffect(() => {
      const cleanup = initEventListeners();
      return cleanup;
    }, []);
    
    return <Component {...props} />;
  };
};
"""
    
    with open(event_listener_file, "w") as f:
        f.write(event_listener_content)
    
    print(f"Created event listener at {event_listener_file}")
    
    # Now update App.tsx to use the event listener
    app_file = os.path.join(SHELL_DIR, "src", "App.tsx")
    
    if os.path.exists(app_file):
        with open(app_file, "r") as f:
            content = f.read()
        
        # Update imports to include event listener
        import_line = "import { withEventListener } from './utils/eventListener';"
        
        # Find the position to add the import - after the last import
        last_import_pos = content.rfind("import")
        if last_import_pos >= 0:
            last_import_end = content.find(";", last_import_pos)
            if last_import_end >= 0:
                content = content[:last_import_end + 1] + "\n" + import_line + content[last_import_end + 1:]
        
        # Update the export to wrap with event listener
        export_line = "export default App;"
        new_export_line = "export default withEventListener(App);"
        
        content = content.replace(export_line, new_export_line)
        
        # Save the updated file
        with open(app_file, "w") as f:
            f.write(content)
        
        print(f"Updated App.tsx to use event listener")
    else:
        print(f"Warning: App.tsx not found at {app_file}")

# Main function
if __name__ == "__main__":
    print("C4H Editor Migration - Step 4: Shell Application Setup")
    print("====================================================")
    
    # Check prerequisites
    if not check_prerequisites():
        sys.exit(1)
    
    # Create main components
    create_app_component()
    create_entry_point()
    create_index_html()
    
    # Copy styles
    copy_css()
    
    # Copy API configuration
    copy_api_config()
    
    # Copy components
    copy_common_components()
    copy_list_components()
    
    # Copy hooks
    copy_api_hooks()
    
    # Create event listener
    create_event_listener()
    
    print("\nStep 4 Complete! Shell application setup finished.")
    print("\nMigration complete! You can now:")
    print("1. Navigate to the project directory: cd", PROJECT_ROOT)
    print("2. Install dependencies: npm install")
    print("3. Start the development server: npm start")
    print("\nThis will start both the shell and config-editor microfrontends.")