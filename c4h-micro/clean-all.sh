#!/bin/bash

# Corrected paths assuming the script is run from within c4h-micro/

# Remove all node_modules folders within packages
echo "Removing node_modules folders in packages/..."
find packages -name 'node_modules' -type d -prune -exec echo "Removing {}" \; -exec rm -rf '{}' +
echo "Done removing node_modules."

# Remove all dist folders within packages
echo "Removing dist folders in packages/..."
find packages -name 'dist' -type d -prune -exec echo "Removing {}" \; -exec rm -rf '{}' +
echo "Done removing dist."

# Remove the root lock file (Update based on your package manager)
echo "Removing lock file(s)..."
# If using npm:
rm -f ../package-lock.json # Adjust path if running from c4h-micro root
# If using pnpm:
# rm -f ../pnpm-lock.yaml # Adjust path if running from c4h-micro root
# If using yarn:
# rm -f ../yarn.lock # Adjust path if running from c4h-micro root
echo "Done removing lock file(s)."

# Optional: Remove root node_modules if it exists outside 'c4h-micro'
# echo "Removing root node_modules (if present)..."
# rm -rf ../node_modules # Adjust path if running from c4h-micro root
# echo "Done removing root node_modules."

echo "Cleanup script finished."