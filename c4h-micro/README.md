# C4H Editor Microfrontend Architecture

## Overview

This is a microfrontend implementation of the C4H Editor, which allows users to:
- Create, edit, and manage WorkOrders
- Submit WorkOrders as Jobs
- Track Job status and view results
- Edit configurations via YAML using Monaco Editor

## Project Structure

```
c4h-editor/
├── packages/
│   ├── shell/                # Main container application
│   ├── config-editor/        # WorkOrder editor microfrontend
│   └── shared/               # Shared utilities, types, and components
└── package.json              # Root package.json for workspaces
```

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm (v8+)

### Installation

1. Install dependencies:
   ```
   npm install
   ```

2. Start the development server:
   ```
   npm start
   ```

This will start both the shell application (port 3000) and the config-editor microfrontend (port 3001).

### Building for Production

To build the entire application:

```
npm run build
```

## Technology Stack

- **Module Federation**: Webpack 5 (with Vite plugin)
- **Build System**: Vite
- **Frontend Framework**: React 18
- **UI Components**: Material UI
- **Editor**: Monaco Editor
- **State Management**: React Context + Event Bus
- **HTTP Client**: Axios
- **TypeScript**: TypeScript 5.3+

## Architecture

The application is built using a microfrontend architecture with Webpack Module Federation:

1. **Shell Application**: Main container, routing, authentication
2. **Config Editor**: WorkOrder editor microfrontend
3. **Shared Package**: Common types, utilities, and components

Cross-microfrontend communication is handled by a combination of:
- React Context for local state
- Custom Event Bus for cross-microfrontend events
- Shared types and utilities
