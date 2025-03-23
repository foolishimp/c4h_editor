#!/bin/bash
# setup-minimal-test.sh
# This script creates a minimal microfrontend test project with Module Federation
# Run from an empty directory to set up the entire project structure

set -e # Exit on error

echo "=== Creating Minimal Microfrontend Test Project ==="
echo "Creating project directories..."

# Create project structure
mkdir -p minimal-test/shell/src
mkdir -p minimal-test/form/src

cd minimal-test

# Create root package.json
cat > package.json << 'EOF'
{
  "name": "minimal-test",
  "private": true,
  "workspaces": [
    "shell",
    "form"
  ],
  "scripts": {
    "start:shell": "cd shell && npm run dev",
    "start:form": "cd form && npm run dev",
    "build:form": "cd form && npm run build",
    "preview:form": "cd form && npm run preview",
    "dev": "concurrently \"npm run start:form\" \"npm run start:shell\"",
    "build": "npm run build:form && cd shell && npm run build"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
EOF

echo "Creating debug script..."

# Create debug script
cat > debug-federation.js << 'EOF'
// file: minimal-test/debug-federation.js
const http = require('http');
const fs = require('fs');
const path = require('path');

// Check if remoteEntry.js exists in both development and build modes
function checkRemoteEntryFile() {
  console.log('Checking for remoteEntry.js in form project...');
  
  // Check in development mode (public directory)
  const devPath = path.join(__dirname, 'form', 'public', 'remoteEntry.js');
  const devExists = fs.existsSync(devPath);
  console.log(`Development mode (public/remoteEntry.js): ${devExists ? 'EXISTS' : 'MISSING'}`);
  
  // Check in build output (dist directory)
  const buildPath = path.join(__dirname, 'form', 'dist', 'remoteEntry.js');
  const buildExists = fs.existsSync(buildPath);
  console.log(`Build mode (dist/remoteEntry.js): ${buildExists ? 'EXISTS' : 'MISSING'}`);
  
  // Check in assets directory (used by some Vite configurations)
  const assetsPath = path.join(__dirname, 'form', 'dist', 'assets', 'remoteEntry.js');
  const assetsExists = fs.existsSync(assetsPath);
  console.log(`Build mode (dist/assets/remoteEntry.js): ${assetsExists ? 'EXISTS' : 'MISSING'}`);
  
  return { devExists, buildExists, assetsExists };
}

// Try to fetch remoteEntry.js from the running server
function checkServerResponse() {
  return new Promise((resolve) => {
    console.log('\nTrying to fetch remoteEntry.js from running server...');
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/remoteEntry.js',
      method: 'GET',
      timeout: 3000
    };
    
    const req = http.request(options, (res) => {
      console.log(`Response status: ${res.statusCode}`);
      console.log(`Content-Type: ${res.headers['content-type'] || 'not specified'}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const firstChars = data.substring(0, 100).replace(/\n/g, '');
        const isHtml = data.includes('<!DOCTYPE html>') || data.includes('<html');
        const isJs = !isHtml && (data.includes('export') || data.includes('function') || data.includes('const'));
        
        console.log(`First 100 chars: ${firstChars}...`);
        console.log(`Content appears to be: ${isHtml ? 'HTML' : isJs ? 'JavaScript' : 'Unknown'}`);
        
        resolve({
          statusCode: res.statusCode,
          contentType: res.headers['content-type'],
          isHtml,
          isJs
        });
      });
    });
    
    req.on('error', (err) => {
      console.error(`Error: ${err.message}`);
      resolve({
        error: err.message,
        statusCode: null,
        contentType: null,
        isHtml: false,
        isJs: false
      });
    });
    
    req.on('timeout', () => {
      console.log('Request timed out');
      req.destroy();
      resolve({
        error: 'Timeout',
        statusCode: null,
        contentType: null,
        isHtml: false,
        isJs: false
      });
    });
    
    req.end();
  });
}

// Main function to run diagnostics
async function runDiagnostics() {
  console.log('======= MODULE FEDERATION DEBUGGING =======\n');
  
  // Check file system for remoteEntry.js
  const fileCheck = checkRemoteEntryFile();
  
  // Try to access remoteEntry.js from server
  console.log('\nAttempting to connect to form app server...');
  try {
    const serverResponse = await checkServerResponse();
    
    // Provide a summary and recommendations
    console.log('\n======= DIAGNOSTICS SUMMARY =======');
    
    if (fileCheck.buildExists || fileCheck.assetsExists) {
      console.log('✅ remoteEntry.js exists in build output');
    } else {
      console.log('❌ remoteEntry.js not found in build output - might need to build the form app');
    }
    
    if (serverResponse.error) {
      console.log(`❌ Failed to connect to server: ${serverResponse.error}`);
      console.log('   Is the form app running on port 3001?');
    } else if (serverResponse.isHtml) {
      console.log('❌ Server returned HTML instead of JavaScript for remoteEntry.js');
      console.log('   This is likely why Module Federation is failing');
      console.log('   Recommendations:');
      console.log('   1. Check Vite configuration for the form app');
      console.log('   2. Make sure the Module Federation plugin is correctly configured');
      console.log('   3. Ensure server is configured to serve static files correctly');
    } else if (serverResponse.isJs) {
      console.log('✅ Server returned JavaScript for remoteEntry.js');
      console.log('   If the shell app is still failing, check:');
      console.log('   1. CORS settings');
      console.log('   2. Correct import path in the shell app');
    } else {
      console.log('❓ Server returned unknown content type for remoteEntry.js');
      console.log(`   Content-Type: ${serverResponse.contentType || 'not specified'}`);
    }
    
    console.log('\n======= POTENTIAL FIXES =======');
    console.log('1. Try preview mode instead of dev server:');
    console.log('   - Run: cd form && npm run build && npm run preview');
    console.log('2. Check vite.config.ts in the form app:');
    console.log('   - Ensure the federation plugin is correctly configured');
    console.log('   - Try setting `deps: false` in the federation plugin config');
    console.log('3. For the shell app, try these remoteEntry.js URLs:');
    console.log('   - Dev mode: http://localhost:3001/remoteEntry.js');
    console.log('   - Preview mode: http://localhost:3001/assets/remoteEntry.js');
    
    console.log('\n======= END OF DIAGNOSTICS =======');
  } catch (err) {
    console.error('Error running diagnostics:', err);
  }
}

// Run the diagnostics
runDiagnostics();
EOF

echo "Creating README..."

# Create README.md
cat > README.md << 'EOF'
# Minimal Microfrontend Test Project

This is a minimal project to test and debug Module Federation in a Vite environment. It consists of:

1. A Shell application that attempts to load a remote component
2. A Form microfrontend that exposes a simple contact form component

## Project Structure

```
minimal-test/
├── shell/            # Shell application (port 3000)
├── form/             # Form microfrontend (port 3001)
├── debug-federation.js # Debug script to diagnose Module Federation issues
└── package.json      # Root package.json for workspace
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

This will install dependencies for both the shell and form applications.

### 2. Run the Applications

There are several ways to run the applications, depending on what you're testing:

#### Development Mode
```bash
# Run both shell and form in development mode
npm run dev
```

#### Build and Preview Mode (Recommended for debugging Module Federation)
```bash
# Build and run the form in preview mode, then run the shell in dev mode
npm run build:form
npm run preview:form
npm run start:shell
```

### 3. Debug Module Federation Issues

If you're experiencing issues with Module Federation, run the debug script:

```bash
node debug-federation.js
```

This script will:
- Check if remoteEntry.js exists in the file system
- Attempt to fetch remoteEntry.js from the running server
- Analyze the response and provide recommendations

## Common Issues and Solutions

### Issue: Shell Cannot Load remoteEntry.js

1. **HTML Instead of JavaScript**: If the server returns HTML instead of JavaScript for remoteEntry.js, try:
   - Use preview mode instead of dev mode for the form app
   - Check the form app's vite.config.ts
   - Try setting `build.target: 'esnext'` and `build.modulePreload: false`

2. **CORS Issues**: If you're seeing CORS errors:
   - Make sure both servers have CORS enabled
   - Check that the correct URL is being used to load remoteEntry.js

### Issue: Vite Development Mode Problems

Vite's development server can sometimes cause issues with Module Federation. The most reliable approach is:

1. Build the form app (`npm run build:form`)
2. Run the form app in preview mode (`npm run preview:form`)
3. Run the shell app in development mode (`npm run start:shell`)

### Issue: Different URLs in Development vs Preview

Remember that the URL for remoteEntry.js might be different:
- Dev mode: http://localhost:3001/remoteEntry.js
- Preview mode: http://localhost:3001/assets/remoteEntry.js

Update the shell's vite.config.ts accordingly.

## Testing the Integration

1. Open the shell app at http://localhost:3000
2. Click the "Load Form Component" button
3. If successful, you should see the contact form loaded from the form microfrontend
4. If it fails, check the error message and follow the debug steps

## Additional Resources

- [Vite Plugin Federation Documentation](https://github.com/originjs/vite-plugin-federation)
- [Module Federation Examples](https://github.com/module-federation/module-federation-examples)
EOF

echo "Setting up form microfrontend..."

# Create form package.json
cat > form/package.json << 'EOF'
{
  "name": "form",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port 3001 --strictPort",
    "build": "tsc && vite build",
    "preview": "vite preview --port 3001 --strictPort"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@originjs/vite-plugin-federation": "^1.3.5",
    "@types/react": "^18.2.15",
    "@types/react-dom": "^18.2.7",
    "@vitejs/plugin-react": "^4.0.3",
    "typescript": "^5.0.2",
    "vite": "^4.4.5"
  }
}
EOF

# Create form vite.config.ts
cat > form/vite.config.ts << 'EOF'
// file: minimal-test/form/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'formApp',
      filename: 'remoteEntry.js',
      exposes: {
        './SimpleForm': './src/SimpleForm.tsx',
      },
      shared: ['react', 'react-dom']
    })
  ],
  build: {
    modulePreload: false,
    target: 'esnext',
    minify: false,
    cssCodeSplit: false
  },
  server: {
    fs: {
      // Allow serving files from one level up
      allow: ['..']
    }
  }
})
EOF

# Create form tsconfig.json
cat > form/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
EOF

# Create form tsconfig.node.json
cat > form/tsconfig.node.json << 'EOF'
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
EOF

# Create form index.html
cat > form/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Test Form App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF

# Create form main.tsx
cat > form/src/main.tsx << 'EOF'
// file: minimal-test/form/src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import SimpleForm from './SimpleForm'

// Log to confirm the app is bootstrapping
console.log('Form app bootstrapping...');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
      <h1>Test Form App</h1>
      <p>This is the standalone form app. Below is the form component that will be exposed to the shell:</p>
      <div style={{ marginTop: '20px', padding: '20px', border: '1px solid #ccc', borderRadius: '4px' }}>
        <SimpleForm />
      </div>
    </div>
  </React.StrictMode>,
)
EOF

# Create form SimpleForm.tsx
cat > form/src/SimpleForm.tsx << 'EOF'
// file: minimal-test/form/src/SimpleForm.tsx
import React, { useState } from 'react';

interface FormData {
  name: string;
  email: string;
  message: string;
}

const SimpleForm: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    message: ''
  });
  
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    setIsSubmitted(true);
  };

  return (
    <div>
      <h2>Contact Form</h2>
      {isSubmitted ? (
        <div style={{ color: 'green', marginTop: '20px' }}>
          <p>Thank you for your submission!</p>
          <button 
            style={{ 
              marginTop: '10px', 
              padding: '8px 16px', 
              background: '#f0f0f0', 
              border: '1px solid #ddd', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
            onClick={() => setIsSubmitted(false)}
          >
            Submit another
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Name:
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              style={{ 
                width: '100%', 
                padding: '8px', 
                borderRadius: '4px', 
                border: '1px solid #ddd' 
              }}
            />
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Email:
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              style={{ 
                width: '100%', 
                padding: '8px', 
                borderRadius: '4px', 
                border: '1px solid #ddd' 
              }}
            />
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Message:
            </label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              required
              rows={4}
              style={{ 
                width: '100%', 
                padding: '8px', 
                borderRadius: '4px', 
                border: '1px solid #ddd',
                resize: 'vertical'
              }}
            />
          </div>
          
          <button 
            type="submit"
            style={{ 
              padding: '10px 20px', 
              background: '#4a90e2', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Submit
          </button>
        </form>
      )}
    </div>
  );
};

export default SimpleForm;
EOF

echo "Setting up shell application..."

# Create shell package.json
cat > shell/package.json << 'EOF'
{
  "name": "shell",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port 3000",
    "build": "tsc && vite build",
    "preview": "vite preview --port 3000"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@originjs/vite-plugin-federation": "^1.3.5",
    "@types/react": "^18.2.15",
    "@types/react-dom": "^18.2.7",
    "@vitejs/plugin-react": "^4.0.3",
    "typescript": "^5.0.2",
    "vite": "^4.4.5"
  }
}
EOF

# Create shell vite.config.ts
cat > shell/vite.config.ts << 'EOF'
// file: minimal-test/shell/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

// Configure remote URL based on environment
const remoteUrl = process.env.NODE_ENV === 'production'
  ? 'http://localhost:3001/assets/remoteEntry.js'
  : 'http://localhost:3001/remoteEntry.js';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'shell',
      remotes: {
        form: remoteUrl
      },
      shared: ['react', 'react-dom']
    })
  ],
  build: {
    modulePreload: false,
    target: 'esnext',
    minify: false,
    cssCodeSplit: false
  },
  // To help debug the network requests
  server: {
    cors: true,
    hmr: {
      clientPort: 3000
    }
  }
})
EOF

# Create shell tsconfig.json
cat > shell/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src", "types.d.ts"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
EOF

# Create shell tsconfig.node.json
cat > shell/tsconfig.node.json << 'EOF'
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
EOF

# Create shell types.d.ts
cat > shell/types.d.ts << 'EOF'
// file: minimal-test/shell/types.d.ts
declare module 'form/SimpleForm' {
  import React from 'react';
  const SimpleForm: React.FC;
  export default SimpleForm;
}
EOF

# Create shell index.html
cat > shell/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Shell App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF

# Create shell main.tsx
cat > shell/src/main.tsx << 'EOF'
// file: minimal-test/shell/src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'

// Log to confirm the app is bootstrapping
console.log('Shell app bootstrapping...');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
EOF

# Create shell App.tsx
cat > shell/src/App.tsx << 'EOF'
// file: minimal-test/shell/src/App.tsx
import React, { lazy, Suspense, useState } from 'react';
import Shell from './Shell';

// Lazy load the remote component
const RemoteForm = lazy(() => import('form/SimpleForm'));

const App: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const handleButtonClick = () => {
    setError(null);
    setShowForm(true);
  };

  return (
    <Shell>
      <h1>Shell Application</h1>
      <p>This is the main shell that will load the form microfrontend.</p>
      
      <div style={{ marginTop: '20px' }}>
        <button 
          onClick={handleButtonClick}
          style={{ 
            padding: '10px 20px', 
            background: '#4a90e2', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Load Form Component
        </button>
      </div>
      
      {showForm && (
        <div style={{ marginTop: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '4px' }}>
          <h2>Remote Form:</h2>
          <Suspense fallback={<div>Loading form component...</div>}>
            <ErrorBoundary onError={setError}>
              <RemoteForm />
            </ErrorBoundary>
          </Suspense>
        </div>
      )}
      
      {error && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#ffebee', borderRadius: '4px', color: '#c62828' }}>
          <h3>Error Loading Form:</h3>
          <p>{error.message}</p>
          <details>
            <summary>Technical Details</summary>
            <pre>{error.stack}</pre>
          </details>
          <div>
            <p>
              <strong>Debug Steps:</strong>
            </p>
            <ol>
              <li>Check if form application is running on port 3001</li>
              <li>Visit <a href="http://localhost:3001/remoteEntry.js" target="_blank" rel="noopener noreferrer">http://localhost:3001/remoteEntry.js</a> directly to check if it returns JavaScript</li>
              <li>Check browser console for CORS errors</li>
            </ol>
          </div>
        </div>
      )}
    </Shell>
  );
};

// Simple error boundary component
interface ErrorBoundaryProps {
  children: React.ReactNode;
  onError: (error: Error) => void;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, { hasError: boolean }> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

export default App;
EOF

# Create shell Shell.tsx
cat > shell/src/Shell.tsx << 'EOF'
// file: minimal-test/shell/src/Shell.tsx
import React from 'react';

interface ShellProps {
  children: React.ReactNode;
}

const Shell: React.FC<ShellProps> = ({ children }) => {
  return (
    <div style={{ 
      fontFamily: 'Arial, sans-serif', 
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px'
    }}>
      <header style={{ 
        padding: '10px 0',
        borderBottom: '1px solid #eaeaea',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ fontWeight: 'bold', fontSize: '1.5rem' }}>
          Microfrontend Test
        </div>
        <nav>
          <a href="#" style={{ 
            margin: '0 10px', 
            color: '#4a90e2', 
            textDecoration: 'none' 
          }}>
            Home
          </a>
          <a href="#" style={{ 
            margin: '0 10px', 
            color: '#4a90e2', 
            textDecoration: 'none' 
          }}>
            About
          </a>
        </nav>
      </header>
      
      <main>
        {children}
      </main>
      
      <footer style={{ 
        marginTop: '40px', 
        padding: '20px 0', 
        borderTop: '1px solid #eaeaea',
        color: '#666',
        textAlign: 'center'
      }}>
        <p>Test Microfrontend Shell with Module Federation</p>
      </footer>
    </div>
  );
};

export default Shell;
EOF

echo "Making debug script executable..."
chmod +x debug-federation.js

echo "Project setup complete!"
echo ""
echo "Next steps:"
echo "1. Navigate to the project directory: cd minimal-test"
echo "2. Install dependencies: npm install"
echo "3. Start the project in dev mode: npm run dev"
echo "   or try build and preview mode (recommended):"
echo "   npm run build:form && npm run preview:form"
echo "   npm run start:shell (in another terminal)"
echo ""
echo "If you encounter issues:"
echo "Run the debug script: node debug-federation.js"
echo ""
echo "For more information, see the README.md file."