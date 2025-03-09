# File: backend/setup.py

from setuptools import setup, find_packages

setup(
    name="prompt-editor-backend",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "fastapi==0.104.1",
        "uvicorn==0.24.0",
        "pydantic==2.4.2",
        "gitpython==3.1.40",
        "python-multipart==0.0.6",
        "fastapi-cors==0.0.6",
        "sqlalchemy==2.0.22",
        "psycopg2-binary==2.9.9",
        "marquez-client==0.30.0",
        "prefect==2.13.0",
        "python-dotenv==1.0.0",
        "pytest==7.4.3",
        "httpx==0.25.1",
    ],
)