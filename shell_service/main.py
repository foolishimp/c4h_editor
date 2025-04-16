"""
Main FastAPI application for the Preferences Shell Service.
"""

import logging
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Assuming routes are in ./api/routes/
from api.routes import shell as shell_router

# Configure basic logging
logging.basicConfig(stream=sys.stdout, level=logging.INFO)
logger = logging.getLogger(__name__)


app = FastAPI(
    title="C4H Preferences Shell Service",
    description="Backend-for-Frontend (BFF) serving UI configuration and preferences for the C4H Editor Shell.",
    version="0.1.0"
)

# --- Middleware ---
# TODO: Configure CORS properly based on deployment needs
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for now, restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API Routers ---
app.include_router(shell_router.router)

@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "healthy", "service": "Preferences Shell Service"}