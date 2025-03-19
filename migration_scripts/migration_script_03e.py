#!/usr/bin/env python3
# migration_script_03e.py
#
# This script creates the main.tsx entry point for standalone development

import os
from pathlib import Path

BASE_DIR = Path("c4h-micro")

def create_directory(path):
    if not path.exists():
        print(f"Creating directory: {path}")
        path.mkdir(parents=True, exist_ok=True)

def write_file(path, content):
    print(f"Writing file: {path}")
    with open(path, "w") as file:
        file.write(content)

def create_main_tsx():
    job_management_dir = BASE_DIR / "packages" / "job-management"
    
    # Create main.tsx
    main_tsx = """// File: packages/job-management/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline, Container } from '@mui/material';
import JobManager from './JobManager';

// Simple standalone app
const App = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <JobManager />
    </Container>
  );
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <CssBaseline />
    <App />
  </React.StrictMode>
);
"""
    
    write_file(job_management_dir / "src" / "main.tsx", main_tsx)
    
    print("main.tsx entry point created successfully!")

if __name__ == "__main__":
    create_main_tsx()