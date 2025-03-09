# File: backend/api/routes/prompts.py

from typing import List, Dict, Any, Optional
from datetime import datetime
import time
from fastapi import APIRouter, HTTPException, Depends, Query, Path, Body, BackgroundTasks
from pydantic import BaseModel

# Fix imports to use absolute paths instead of relative paths
from backend.models.prompt import Prompt, PromptVersion, PromptTestCase
from backend.services.prompt_repository import PromptRepository
from backend.services.lineage_tracker import LineageTracker
from backend.services.llm_service import LLMService, ModelResponse  # Add LLM service import
from backend.dependencies import get_prompt_repository, get_lineage_tracker, get_llm_service  # Updated dependency

# Create the router object
router = APIRouter(prefix="/api/v1/prompts", tags=["prompts"])

# Request/Response Models
class PromptCreateRequest(BaseModel):
    id: str
    template: Dict[str, Any]
    metadata: Dict[str, Any]
    commit_message: str
    author: str

class PromptUpdateRequest(BaseModel):
    template: Dict[str, Any]
    metadata: Dict[str, Any]
    commit_message: str
    author: str

class PromptResponse(BaseModel):
    id: str
    version: str
    template: Dict[str, Any]
    metadata: Dict[str, Any]
    commit: str
    updated_at: datetime

class PromptListResponse(BaseModel):
    id: str
    version: str
    title: str
    author: str
    updated_at: str
    last_commit: str
    last_commit_message: str

class PromptHistoryResponse(BaseModel):
    prompt_id: str
    versions: List[Dict[str, Any]]

class PromptTestRequest(BaseModel):
    parameters: Dict[str, Any]
    test_cases: Optional[List[PromptTestCase]] = None
    llm_config: Optional[Dict[str, Any]] = None  # Changed from model_config to llm_config to avoid naming conflict

class PromptTestResponse(BaseModel):
    prompt_id: str
    rendered_prompt: str
    parameters: Dict[str, Any]
    model_response: Optional[str] = None
    model_info: Optional[Dict[str, Any]] = None  # Added model information
    test_results: Optional[List[Dict[str, Any]]] = None
    execution_time: float
    timestamp: datetime = datetime.utcnow()

@router.post("", response_model=PromptResponse)
async def create_prompt(
    request: PromptCreateRequest,
    repo: PromptRepository = Depends(get_prompt_repository)
):
    """Create a new prompt."""
    try:
        # Convert to Prompt model
        prompt = Prompt(
            id=request.id,
            template=request.template,
            metadata=request.metadata
        )
        
        # Create prompt in repository
        commit = repo.create_prompt(
            prompt=prompt,
            commit_message=request.commit_message,
            author=request.author
        )
        
        # Get the created prompt
        created_prompt = repo.get_prompt(prompt.id)
        
        return PromptResponse(
            id=created_prompt.id,
            version=created_prompt.metadata.version,
            template=created_prompt.template.dict(),
            metadata=created_prompt.metadata.dict(),
            commit=commit,
            updated_at=created_prompt.metadata.updated_at
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create prompt: {str(e)}")

@router.get("", response_model=List[PromptListResponse])
async def list_prompts(
    repo: PromptRepository = Depends(get_prompt_repository)
):
    """List all prompts."""
    try:
        prompts = repo.list_prompts()
        return prompts
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list prompts: {str(e)}")

@router.get("/{prompt_id}", response_model=PromptResponse)
async def get_prompt(
    prompt_id: str = Path(..., description="The ID of the prompt to retrieve"),
    version: Optional[str] = Query(None, description="Optional version or commit reference"),
    repo: PromptRepository = Depends(get_prompt_repository)
):
    """Get a prompt by ID and optional version."""
    try:
        prompt = repo.get_prompt(prompt_id, version)
        
        # Get commit info
        if version:
            commit = version
        else:
            # Get last commit for this prompt
            prompt_path = repo._get_prompt_path(prompt_id)
            last_commit = next(repo.repo.iter_commits(paths=str(prompt_path)))
            commit = last_commit.hexsha
        
        return PromptResponse(
            id=prompt.id,
            version=prompt.metadata.version,
            template=prompt.template.dict(),
            metadata=prompt.metadata.dict(),
            commit=commit,
            updated_at=prompt.metadata.updated_at
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get prompt: {str(e)}")

@router.put("/{prompt_id}", response_model=PromptResponse)
async def update_prompt(
    prompt_id: str = Path(..., description="The ID of the prompt to update"),
    request: PromptUpdateRequest = Body(...),
    repo: PromptRepository = Depends(get_prompt_repository)
):
    """Update an existing prompt."""
    try:
        # Get existing prompt
        existing_prompt = repo.get_prompt(prompt_id)
        
        # Update prompt with new data
        updated_prompt = Prompt(
            id=prompt_id,
            template=request.template,
            metadata=request.metadata,
            parent_id=existing_prompt.parent_id,
            lineage=existing_prompt.lineage
        )
        
        # Update in repository
        commit = repo.update_prompt(
            prompt=updated_prompt,
            commit_message=request.commit_message,
            author=request.author
        )
        
        # Get the updated prompt
        result = repo.get_prompt(prompt_id)
        
        return PromptResponse(
            id=result.id,
            version=result.metadata.version,
            template=result.template.dict(),
            metadata=result.metadata.dict(),
            commit=commit,
            updated_at=result.metadata.updated_at
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update prompt: {str(e)}")

@router.delete("/{prompt_id}")
async def delete_prompt(
    prompt_id: str = Path(..., description="The ID of the prompt to delete"),
    commit_message: str = Query(..., description="Commit message"),
    author: str = Query(..., description="Author of the commit"),
    repo: PromptRepository = Depends(get_prompt_repository)
):
    """Delete a prompt."""
    try:
        repo.delete_prompt(
            prompt_id=prompt_id,
            commit_message=commit_message,
            author=author
        )
        return {"message": f"Prompt {prompt_id} deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete prompt: {str(e)}")

@router.get("/{prompt_id}/history", response_model=PromptHistoryResponse)
async def get_prompt_history(
    prompt_id: str = Path(..., description="The ID of the prompt"),
    repo: PromptRepository = Depends(get_prompt_repository)
):
    """Get the version history of a prompt."""
    try:
        versions = repo.get_prompt_history(prompt_id)
        
        # Format version history
        history = [
            {
                "version": v.version,
                "commit_hash": v.commit_hash,
                "created_at": v.created_at.isoformat(),
                "author": v.author,
                "message": v.message
            }
            for v in versions
        ]
        
        return PromptHistoryResponse(
            prompt_id=prompt_id,
            versions=history
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get prompt history: {str(e)}")

@router.get("/{prompt_id}/diff")
async def get_prompt_diff(
    prompt_id: str = Path(..., description="The ID of the prompt"),
    from_version: str = Query(..., description="Source version or commit reference"),
    to_version: str = Query(..., description="Target version or commit reference"),
    repo: PromptRepository = Depends(get_prompt_repository)
):
    """Get the diff between two versions of a prompt."""
    try:
        diff = repo.get_diff(prompt_id, from_version, to_version)
        return {"diff": diff}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get diff: {str(e)}")

@router.post("/{prompt_id}/render")
async def render_prompt(
    prompt_id: str = Path(..., description="The ID of the prompt"),
    request: Dict[str, Any] = Body(..., description="Parameters for rendering"),
    version: Optional[str] = Query(None, description="Optional version or commit reference"),
    repo: PromptRepository = Depends(get_prompt_repository)
):
    """Render a prompt with parameters."""
    try:
        prompt = repo.get_prompt(prompt_id, version)
        rendered = prompt.render(request)
        return {"prompt_id": prompt_id, "rendered_prompt": rendered}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to render prompt: {str(e)}")

@router.post("/{prompt_id}/test", response_model=PromptTestResponse)
async def test_prompt(
    prompt_id: str = Path(..., description="The ID of the prompt"),
    request: PromptTestRequest = Body(...),
    version: Optional[str] = Query(None, description="Optional version or commit reference"),
    background_tasks: BackgroundTasks = None,
    repo: PromptRepository = Depends(get_prompt_repository),
    lineage_tracker: LineageTracker = Depends(get_lineage_tracker),
    llm_service: LLMService = Depends(get_llm_service)  # Add LLM service dependency
):
    """Test a prompt with parameters and optional test cases."""
    start_time = time.time()
    
    try:
        # Get prompt
        prompt = repo.get_prompt(prompt_id, version)
        
        # Render prompt
        rendered = prompt.render(request.parameters)
        
        # Extract model config - changed from model_config to llm_config
        model_config = request.llm_config or {}
        provider = model_config.get("provider")
        model = model_config.get("model")
        temperature = model_config.get("temperature", 0.7)
        max_tokens = model_config.get("max_tokens", 1000)
        
        # Call LLM service
        model_response: ModelResponse = await llm_service.generate(
            prompt=rendered,
            provider=provider,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        # Track test execution in lineage
        if lineage_tracker:
            # Add to background tasks to avoid blocking the response
            if background_tasks:
                background_tasks.add_task(
                    lineage_tracker.track_prompt_test,
                    prompt_id=prompt_id,
                    version=prompt.metadata.version,
                    parameters=request.parameters,
                    rendered_prompt=rendered,
                    model_response=model_response.text
                )
            else:
                lineage_tracker.track_prompt_test(
                    prompt_id=prompt_id,
                    version=prompt.metadata.version,
                    parameters=request.parameters,
                    rendered_prompt=rendered,
                    model_response=model_response.text
                )
        
        # Calculate execution time
        execution_time = time.time() - start_time
        
        # Execute test cases if provided
        test_results = None
        if request.test_cases:
            test_results = []
            for test_case in request.test_cases:
                # Render prompt with test case parameters
                test_rendered = prompt.render(test_case.parameters)
                
                # Call LLM service for test case
                test_response = await llm_service.generate(
                    prompt=test_rendered,
                    provider=provider,
                    model=model,
                    temperature=temperature,
                    max_tokens=max_tokens
                )
                
                # Check if expected output is in response
                success = test_case.expected_output is None or test_case.expected_output in test_response.text
                
                test_results.append({
                    "name": test_case.name,
                    "success": success,
                    "expected": test_case.expected_output,
                    "actual": test_response.text,
                    "parameters": test_case.parameters,
                    "metadata": test_case.metadata
                })
        
        return PromptTestResponse(
            prompt_id=prompt_id,
            rendered_prompt=rendered,
            parameters=request.parameters,
            model_response=model_response.text,
            model_info={
                "model": model_response.model,
                "provider": model_response.provider,
                "usage": model_response.usage,
                "latency": model_response.latency
            },
            test_results=test_results,
            execution_time=execution_time
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to test prompt: {str(e)}")

@router.post("/{prompt_id}/clone")
async def clone_prompt(
    prompt_id: str = Path(..., description="The ID of the prompt to clone"),
    new_id: str = Query(..., description="New ID for the cloned prompt"),
    author: str = Query(..., description="Author of the clone"),
    repo: PromptRepository = Depends(get_prompt_repository)
):
    """Clone a prompt to create a new one based on it."""
    try:
        # Get source prompt
        source_prompt = repo.get_prompt(prompt_id)
        
        # Create a new prompt based on the source
        new_prompt = Prompt(
            id=new_id,
            template=source_prompt.template,
            metadata={
                **source_prompt.metadata.dict(),
                "author": author,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "version": "1.0.0"
            },
            parent_id=prompt_id,
            lineage=[*source_prompt.lineage, prompt_id] if source_prompt.lineage else [prompt_id]
        )
        
        # Create in repository
        commit = repo.create_prompt(
            prompt=new_prompt,
            commit_message=f"Cloned from {prompt_id}",
            author=author
        )
        
        # Get the created prompt
        created_prompt = repo.get_prompt(new_id)
        
        return PromptResponse(
            id=created_prompt.id,
            version=created_prompt.metadata.version,
            template=created_prompt.template.dict(),
            metadata=created_prompt.metadata.dict(),
            commit=commit,
            updated_at=created_prompt.metadata.updated_at
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clone prompt: {str(e)}")