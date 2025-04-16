#!/bin/bash
# File: set_backend_env.sh
# Description: Sets environment variables for C4H Editor backend services.
# Usage: source ./set_backend_env.sh

echo "Setting environment variables for C4H Editor backend..."

# --- Choose ONE of the following sections (SQLite or PostgreSQL) ---
# --- Uncomment the section you want to use ---

# --- Option 1: Configure for SQLite (Default) ---
# Uses a local file in the current directory (where you run this script)
# export DB_TYPE="sqlite"
# export SQLITE_DB_PATH="./shell_service_dev.db"
# # The following PG variables are ignored when DB_TYPE=sqlite, but cleared just in case
# unset DB_HOST
# unset DB_PORT
# unset DB_NAME
# unset DB_USER
# unset DB_PASSWORD
# echo "Configured for SQLite using database file: ${SQLITE_DB_PATH}"
# --- End SQLite Configuration ---


# --- Option 2: Configure for PostgreSQL (Using your Docker details) ---
export DB_TYPE="postgres"
export DB_HOST="localhost"
export DB_PORT="5432"
export DB_NAME="c4h_prefs" # The database you created for the shell_service
export DB_USER="postgres" # From your docker inspect output
export DB_PASSWORD="password" # From your docker inspect output
# Unset SQLite variable if switching to PG
unset SQLITE_DB_PATH
echo "Configured for PostgreSQL:"
echo "  Host: ${DB_HOST}:${DB_PORT}"
echo "  DB:   ${DB_NAME}"
echo "  User: ${DB_USER}"
# --- End PostgreSQL Configuration ---


# --- Optional: Add other environment variables if needed ---
# export C4H_API_KEY="your_c4h_service_api_key" # If the C4H service requires one
# export VITE_PREFERENCES_SERVICE_URL="http://localhost:8001" # For frontend if needed


echo "Environment variables set."
echo "You can now run './backend_startup.sh'"