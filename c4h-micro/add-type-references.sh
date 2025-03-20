#!/bin/bash
# File: c4h-micro/add-type-references.sh
# Adds type reference directive to all vite.config.ts files

# This script adds a reference to the federation.d.ts file in all vite.config.ts files

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: This script must be run from the c4h-micro directory"
  echo "Current directory: $(pwd)"
  exit 1
fi

# Create the federation.d.ts file if it doesn't exist
mkdir -p packages/shared/src/types
cat > packages/shared/src/types/federation.d.ts << 'EOF'
// Add type definitions for @originjs/vite-plugin-federation
declare module '@originjs/vite-plugin-federation' {
  export interface SharedConfig {
    singleton?: boolean;
    eager?: boolean;
    requiredVersion?: string;
    strictVersion?: boolean;
    version?: string;
  }
}
EOF

# Update all vite.config.ts files
for config_file in packages/*/vite.config.ts; do
  echo "Updating $config_file..."
  
  # Check if the reference is already there
  if grep -q "reference path=\"\.\./shared/src/types/federation.d.ts\"" "$config_file"; then
    echo "  Reference already exists, skipping..."
  else
    # Add the reference path at the top of the file (after any comments)
    sed -i.bak '1s/^/\/\/\/ <reference path="..\/shared\/src\/types\/federation.d.ts" \/>\n\n/' "$config_file"
    
    # Remove backup files
    rm "${config_file}.bak"
    
    echo "  Added reference path to $config_file"
  fi
done

echo "✅ All vite.config.ts files have been updated with the type reference"
