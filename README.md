# C4H Prompt Editor

A comprehensive prompt management system for creating, testing, and versioning prompts for LLMs.

## Features

- Git-based version control for prompts
- Web-based editor with syntax highlighting
- Parameter management and substitution
- Test prompts with multiple LLM providers
- Lineage tracking for prompt usage
- RESTful API for integrations

## Project Structure

```
c4h_editor/
├── backend/                    # FastAPI backend
│   ├── api/                    # API routes
│   ├── models/                 # Data models
│   ├── services/               # Business logic services
│   ├── tests/                  # Unit tests
│   ├── config.py               # Configuration management
│   ├── dependencies.py         # Dependency injection
│   ├── main.py                 # Application entry point
│   └── requirements.txt        # Python dependencies
├── frontend/                   # React frontend
│   ├── src/                    # Source code
│   │   ├── components/         # React components
│   │   ├── hooks/              # Custom React hooks
│   │   └── types/              # TypeScript type definitions
│   ├── package.json            # npm dependencies
│   └── vite.config.ts          # Vite configuration
├── data/                       # Data storage directory
│   ├── prompt_repository/      # Git-based prompt storage
│   ├── lineage/                # Lineage tracking data
│   └── backups/                # Backup storage
├── config.yaml                 # Application configuration
├── docker-compose.yml          # Docker configuration
└── README.md                   # This file
```

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- Git

### Backend Setup

1. Set up a virtual environment:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Create required directories:
   ```bash
   mkdir -p ../data/prompt_repository ../data/lineage ../data/backups
   ```

4. Run the server:
   ```bash
   uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend Setup

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

## API Documentation

Once the backend is running, API documentation is available at:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Docker Deployment

To deploy the application using Docker:

```bash
docker-compose up -d
```

## Configuration

The application can be configured using:

1. `config.yaml` file in the root directory
2. Environment variables (prefixed with `PROMPT_EDITOR_`)

## Environment Variables

- `ANTHROPIC_API_KEY`: API key for Anthropic (Claude)
- `OPENAI_API_KEY`: API key for OpenAI (GPT)
- `CONFIG_PATH`: Path to configuration file (default: `./config.yaml`)
- `HOST`: Host for the backend server (default: `0.0.0.0`)
- `PORT`: Port for the backend server (default: `8000`)

## Design Principles

This project follows these design principles:

1. **LLM-First Processing**
   - Offload most logic and decision-making to the LLM
   - Use LLM for verification and validation where possible

2. **Minimal Agent Logic**
   - Keep agent code focused on infrastructure concerns
   - Avoid embedding business logic in agents
   - Let LLM handle complex decision trees

3. **Hierarchical Configuration**
   - All configuration follows a strict hierarchy
   - Base config provides defaults and templates
   - Override config adds or updates leaf nodes

## License

[MIT License](LICENSE)