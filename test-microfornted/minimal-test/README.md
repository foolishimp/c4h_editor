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
