#!/bin/bash
# File: c4h-micro/debug-remote-entries.sh
# Script to test and debug remote entry files

# This script assumes it's being run from the c4h-micro directory
# where the package.json with workspaces is located

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: This script must be run from the c4h-micro directory"
  echo "Current directory: $(pwd)"
  exit 1
fi

# Definition of remote endpoints
REMOTES=(
  "http://localhost:3001/remoteEntry.js"
  "http://localhost:3002/remoteEntry.js"
  "http://localhost:3003/remoteEntry.js"
  "http://localhost:3004/remoteEntry.js"
)

REMOTE_NAMES=(
  "configEditor"
  "yamlEditor"
  "configSelector"
  "jobManagement"
)

# Create debug directory
mkdir -p debug
echo "Creating debug directory..."

# Test each remote
for i in "${!REMOTES[@]}"; do
  REMOTE="${REMOTES[$i]}"
  NAME="${REMOTE_NAMES[$i]}"
  
  echo "Testing $NAME at $REMOTE..."
  
  # Check if the remote is accessible
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$REMOTE")
  
  if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ $NAME is accessible (HTTP 200)"
    
    # Save the remote entry content for inspection
    curl -s "$REMOTE" > "debug/${NAME}_remoteEntry.js"
    echo "💾 Saved content to debug/${NAME}_remoteEntry.js"
    
    # Check if it has the correct format
    if grep -q "__federation_shared" "debug/${NAME}_remoteEntry.js" || grep -q "federatedComponentMap" "debug/${NAME}_remoteEntry.js"; then
      echo "✅ $NAME has valid federation structure"
    else
      echo "❌ $NAME might not be a valid Module Federation remote"
    fi
    
    # Check for specific exports
    case "$NAME" in
      "configEditor")
        if grep -q "ConfigEditor" "debug/${NAME}_remoteEntry.js"; then
          echo "✅ $NAME exports ConfigEditor"
        else
          echo "❌ $NAME does not export ConfigEditor"
        fi
        ;;
      "yamlEditor")
        if grep -q "YamlEditor" "debug/${NAME}_remoteEntry.js"; then
          echo "✅ $NAME exports YamlEditor"
        else
          echo "❌ $NAME does not export YamlEditor"
        fi
        ;;
      "configSelector")
        if grep -q "ConfigManager" "debug/${NAME}_remoteEntry.js"; then
          echo "✅ $NAME exports ConfigManager"
        else
          echo "❌ $NAME does not export ConfigManager"
        fi
        ;;
      "jobManagement")
        if grep -q "JobManager" "debug/${NAME}_remoteEntry.js"; then
          echo "✅ $NAME exports JobManager"
        else
          echo "❌ $NAME does not export JobManager"
        fi
        ;;
    esac
    
  else
    echo "❌ $NAME is not accessible (HTTP $HTTP_CODE)"
  fi
  
  echo "-----------------------------------------"
done

# Test the headers returned by the remotes
echo "Testing headers returned by remotes..."
for i in "${!REMOTES[@]}"; do
  REMOTE="${REMOTES[$i]}"
  NAME="${REMOTE_NAMES[$i]}"
  
  echo "Testing headers for $NAME..."
  curl -s -I "$REMOTE" > "debug/${NAME}_headers.txt"
  
  # Check for CORS headers
  if grep -q "Access-Control-Allow-Origin" "debug/${NAME}_headers.txt"; then
    echo "✅ $NAME has CORS headers"
  else
    echo "❌ $NAME is missing CORS headers"
  fi
  
  # Check for proper content type
  if grep -q "Content-Type: application/javascript" "debug/${NAME}_headers.txt"; then
    echo "✅ $NAME has correct Content-Type"
  elif grep -q "Content-Type: text/javascript" "debug/${NAME}_headers.txt"; then
    echo "✅ $NAME has acceptable Content-Type"
  else
    echo "❌ $NAME may have incorrect Content-Type"
  fi
  
  echo "-----------------------------------------"
done

echo "Debug information saved to the debug/ directory."
echo "Done testing remote entries."