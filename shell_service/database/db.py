"""
Database connection management module for the Preferences Shell Service.
Supports SQLite (via aiosqlite) and PostgreSQL (via asyncpg) based on DATABASE_URL.
"""

import asyncio
import logging
from typing import Optional, Dict, Any
import os
from pathlib import Path
from contextlib import asynccontextmanager
import re # For placeholder replacement

# Import both drivers
import aiosqlite
import asyncpg

logger = logging.getLogger(__name__)

# --- Configuration ---
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{Path(__file__).parent.parent.resolve() / 'data' / 'c4h_prefs.db'}") # Default to SQLite using absolute path

# Construct absolute path for SQLite file if used, ensuring parent dir exists
DB_DIR = Path(__file__).parent.parent / "data"
DB_FILE = DB_DIR / os.environ.get("DB_NAME", "c4h_prefs.db")
DB_TYPE = "sqlite" if DATABASE_URL.startswith("sqlite") else "postgres"

# --- Global Connection State ---
# Use separate variables for pool (pg) and connection (sqlite)
_pg_pool: Optional[asyncpg.Pool] = None
_sqlite_db: Optional[aiosqlite.Connection] = None

async def connect():
    """Establish connection pool (PostgreSQL) or connection (SQLite)."""
    global _pg_pool, _sqlite_db

    if _pg_pool or _sqlite_db:
        logger.warning(f"Database connection ({DB_TYPE}) already established.")
        return True

    try:
        if DB_TYPE == "sqlite":
            # Extract file path from DATABASE_URL (sqlite:///path/to/db.file)
            db_file_path = Path(DATABASE_URL[len("sqlite:///"):])
            db_dir = db_file_path.parent
            logger.info(f"[SERVICE] Attempting to connect to SQLite DB at resolved path: {db_file_path.resolve()}") # <-- Log absolute path
            if not db_dir.exists():
                 logger.info(f"Creating database directory: {db_dir}")
                 db_dir.mkdir(parents=True, exist_ok=True) # Ensure directory exists

            _sqlite_db = await aiosqlite.connect(db_file_path)
            _sqlite_db.row_factory = aiosqlite.Row
            logger.info(f"Connected to SQLite database: {db_file_path}")
        else: # Assume PostgreSQL
            # Use DATABASE_URL directly if provided, otherwise fallback to individual vars
            if "DATABASE_URL" in os.environ:
                _pg_pool = await asyncpg.create_pool(dsn=DATABASE_URL, min_size=1, max_size=10)
                logger.info(f"Connected to PostgreSQL using DATABASE_URL")
            else: # Fallback to individual env vars
                DB_HOST = os.environ.get("DB_HOST", "localhost")
                DB_PORT = os.environ.get("DB_PORT", "5432")
                DB_NAME = os.environ.get("DB_NAME", "c4h_prefs")
                DB_USER = os.environ.get("DB_USER", "postgres")
                DB_PASS = os.environ.get("DB_PASSWORD", "postgres") # Use DB_PASSWORD
                _pg_pool = await asyncpg.create_pool(
                    host=DB_HOST, port=DB_PORT, database=DB_NAME,
                    user=DB_USER, password=DB_PASS,
                    min_size=1, max_size=10
                )
                logger.info(f"Connected to PostgreSQL database at {DB_HOST}:{DB_PORT}/{DB_NAME}")
        return True
    except Exception as e:
        logger.error(f"Failed to connect to {DB_TYPE} database: {e}", exc_info=True)
        _pg_pool = None
        _sqlite_db = None
        return False

async def disconnect():
    """Close the database connection/pool."""
    global _pg_pool, _sqlite_db
    if _pg_pool:
        await _pg_pool.close()
        logger.info("Closed PostgreSQL connection pool.")
        _pg_pool = None
    if _sqlite_db:
        await _sqlite_db.close()
        logger.info("Closed SQLite database connection.")
        _sqlite_db = None

async def check_health() -> bool:
    """Check database connection health by trying to acquire and use a connection."""
    # Use get_connection which attempts connection if needed
    try:
        async with get_connection() as conn: # Use the context manager
            # conn will be _sqlite_db for sqlite or an acquired conn for postgres
            if DB_TYPE == "sqlite":
                # Use the connection provided by the context manager ('conn' is _sqlite_db here)
                cursor = await conn.execute("SELECT 1")
                await cursor.fetchone()
                await cursor.close()
            else: # PostgreSQL ('conn' is an acquired pool connection here)
                await conn.fetchval("SELECT 1")
        # If we get here without exception, connection worked
        return True
    except Exception as e:
        logger.error(f"{DB_TYPE} health check failed within get_connection context: {e}", exc_info=True) # Log error with context
        return False

@asynccontextmanager
async def get_connection():
    """Context manager yielding the appropriate connection/pool connection."""
    if DB_TYPE == "sqlite":
        if not _sqlite_db:
            logger.warning("SQLite DB not connected, attempting auto-connect...")
            if not await connect():
                raise RuntimeError("Database not connected and failed to connect.")
        # Yield the single connection for SQLite
        yield _sqlite_db
        # No release step needed for the single connection model
    else: # PostgreSQL
        if not _pg_pool:
            logger.warning("Postgres Pool not initialized, attempting auto-connect...")
            if not await connect():
                raise RuntimeError("Database not connected and failed to connect.")
        conn = await _pg_pool.acquire()
        try:
            yield conn
        finally:
            await _pg_pool.release(conn)

def _adapt_query_placeholders(query: str) -> str:
    """Adapts $N placeholders to ? for SQLite if needed."""
    if DB_TYPE == "sqlite":
        # Replace $1, $2, ... with ?
        return re.sub(r"\$\d+", "?", query)
    return query # Return original for PostgreSQL

async def execute(query: str, *args, fetch_type="all") -> Any:
    """Execute a database query, adapting for DB type."""
    if DB_TYPE == "sqlite":
        if not _sqlite_db: raise RuntimeError("SQLite Database not connected")
        conn = _sqlite_db # Use the global connection
    else:
        if not _pg_pool: raise RuntimeError("PostgreSQL Pool not initialized")
        # Acquire connection from pool for PG
        conn = await _pg_pool.acquire()

    adapted_query = _adapt_query_placeholders(query)

    try:
        if DB_TYPE == "sqlite":
            cursor = await conn.execute(adapted_query, args)
            try:
                if fetch_type == "all": return await cursor.fetchall()
                elif fetch_type == "one": return await cursor.fetchone()
                elif fetch_type == "val":
                    row = await cursor.fetchone(); return row[0] if row else None
                elif fetch_type == "status":
                    await conn.commit(); return cursor.rowcount # Commit on status queries
                else: raise ValueError(f"Invalid fetch_type: {fetch_type}")
            finally:
                await cursor.close()
        else: # PostgreSQL (conn is an acquired Pool connection)
            if fetch_type == "all": return await conn.fetch(adapted_query, *args)
            elif fetch_type == "one": return await conn.fetchrow(adapted_query, *args)
            elif fetch_type == "val": return await conn.fetchval(adapted_query, *args)
            elif fetch_type == "status": return await conn.execute(adapted_query, *args) # PG execute returns status string
            else: raise ValueError(f"Invalid fetch_type: {fetch_type}")
    except Exception as e:
        logger.error(f"{DB_TYPE} query error: {e}", exc_info=True)
        logger.error(f"Adapted Query: {adapted_query}, Args: {args}")
        raise
    finally:
        # Release connection only if it's a PG pool connection
        if DB_TYPE == "postgres" and conn:
             if not _pg_pool: raise RuntimeError("PostgreSQL Pool not initialized") # type guard
             await _pg_pool.release(conn)