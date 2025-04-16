"""
Database connection management module for the Preferences Shell Service.
Uses asyncpg for PostgreSQL connectivity.
"""

import asyncio
import logging
from typing import Optional, Dict, Any
import asyncpg
import os
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)

# Get database connection parameters from environment variables
# with fallbacks to development defaults
DB_HOST = os.environ.get("DB_HOST", "localhost")
DB_PORT = os.environ.get("DB_PORT", "5432")
DB_NAME = os.environ.get("DB_NAME", "c4h_prefs")
DB_USER = os.environ.get("DB_USER", "postgres")
DB_PASS = os.environ.get("DB_PASSWORD", "postgres")

# Global connection pool
pool: Optional[asyncpg.Pool] = None

async def connect():
    """Establish connection pool to the database."""
    global pool
    try:
        pool = await asyncpg.create_pool(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASS,
            min_size=1,
            max_size=10,
        )
        logger.info(f"Connected to PostgreSQL database at {DB_HOST}:{DB_PORT}/{DB_NAME}")
        return True
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}", exc_info=True)
        pool = None
        return False

async def disconnect():
    """Close the database connection pool."""
    global pool
    if pool:
        await pool.close()
        logger.info("Closed PostgreSQL connection pool")
        pool = None

async def check_health() -> bool:
    """Check database connection health."""
    if not pool:
        return False
    
    try:
        # Try to execute a simple query
        async with pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        return True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False

@asynccontextmanager
async def get_connection():
    """Get a database connection from the pool."""
    if not pool:
        logger.error("Database pool not initialized. Call connect() first.")
        raise RuntimeError("Database not connected")
    
    conn = await pool.acquire()
    try:
        yield conn
    finally:
        await pool.release(conn)

# Query execution helper
async def execute(query: str, *args, fetch_type="all", **kwargs) -> Any:
    """Execute a database query with proper error handling."""
    if not pool:
        logger.error("Database pool not initialized. Call connect() first.")
        raise RuntimeError("Database not connected")
    
    try:
        async with pool.acquire() as conn:
            if fetch_type == "all":
                return await conn.fetch(query, *args, **kwargs)
            elif fetch_type == "one":
                return await conn.fetchrow(query, *args, **kwargs)
            elif fetch_type == "val":
                return await conn.fetchval(query, *args, **kwargs)
            elif fetch_type == "status":
                return await conn.execute(query, *args, **kwargs)
            else:
                raise ValueError(f"Invalid fetch_type: {fetch_type}")
    except Exception as e:
        logger.error(f"Database query error: {e}", exc_info=True)
        logger.error(f"Query: {query}, Args: {args}, Kwargs: {kwargs}")
        raise