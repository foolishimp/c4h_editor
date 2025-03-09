# File: backend/tests/test_prompt_repository.py
"""
Unit tests for the PromptRepository service.
"""

import pytest
import tempfile
import shutil
import json
from pathlib import Path
from datetime import datetime

from backend.services.prompt_repository import PromptRepository
from backend.models.prompt import Prompt, PromptTemplate, PromptMetadata, PromptConfig, PromptParameter

@pytest.fixture
def test_repo():
    """Create a temporary repository for testing."""
    repo_dir = tempfile.mkdtemp()
    repo = PromptRepository(repo_dir)
    
    yield repo
    
    # Clean up
    shutil.rmtree(repo_dir)

@pytest.fixture
def sample_prompt():
    """Create a sample prompt for testing."""
    return Prompt(
        id="test-prompt",
        template=PromptTemplate(
            text="This is a test prompt with parameter {param1}",
            parameters=[
                PromptParameter(
                    name="param1",
                    type="string",
                    description="Test parameter",
                    default="default value",
                    required=True
                )
            ],
            config=PromptConfig(
                temperature=0.7,
                max_tokens=1000
            )
        ),
        metadata=PromptMetadata(
            author="test-user",
            description="Test prompt for unit tests",
            tags=["test", "unit-test"],
            version="1.0.0"
        )
    )

def test_init_repo(test_repo):
    """Test repository initialization."""
    # Check if repo is initialized
    assert test_repo.repo is not None
    
    # Check if README.md is created
    readme_path = Path(test_repo.repo_path) / "README.md"
    assert readme_path.exists()

def test_create_prompt(test_repo, sample_prompt):
    """Test creating a prompt."""
    # Create prompt
    commit = test_repo.create_prompt(
        prompt=sample_prompt,
        commit_message="Test commit",
        author="test-user"
    )
    
    # Check if commit is returned
    assert commit is not None
    
    # Check if file is created
    prompt_path = test_repo._get_prompt_path(sample_prompt.id)
    assert prompt_path.exists()
    
    # Check file content
    with open(prompt_path, "r") as f:
        data = json.load(f)
    
    assert data["id"] == sample_prompt.id
    assert data["template"]["text"] == sample_prompt.template.text

def test_get_prompt(test_repo, sample_prompt):
    """Test getting a prompt."""
    # Create prompt
    test_repo.create_prompt(
        prompt=sample_prompt,
        commit_message="Test commit",
        author="test-user"
    )
    
    # Get prompt
    retrieved_prompt = test_repo.get_prompt(sample_prompt.id)
    
    # Check if prompt is returned
    assert retrieved_prompt is not None
    assert retrieved_prompt.id == sample_prompt.id
    assert retrieved_prompt.template.text == sample_prompt.template.text
    assert retrieved_prompt.metadata.author == sample_prompt.metadata.author

def test_update_prompt(test_repo, sample_prompt):
    """Test updating a prompt."""
    # Create prompt
    test_repo.create_prompt(
        prompt=sample_prompt,
        commit_message="Test commit",
        author="test-user"
    )
    
    # Update prompt
    updated_prompt = Prompt(
        id=sample_prompt.id,
        template=PromptTemplate(
            text="Updated text with {param1}",
            parameters=sample_prompt.template.parameters,
            config=sample_prompt.template.config
        ),
        metadata=sample_prompt.metadata
    )
    
    commit = test_repo.update_prompt(
        prompt=updated_prompt,
        commit_message="Update test",
        author="test-user"
    )
    
    # Check if commit is returned
    assert commit is not None
    
    # Get updated prompt
    retrieved_prompt = test_repo.get_prompt(sample_prompt.id)
    
    # Check if prompt is updated
    assert retrieved_prompt.template.text == "Updated text with {param1}"

def test_delete_prompt(test_repo, sample_prompt):
    """Test deleting a prompt."""
    # Create prompt
    test_repo.create_prompt(
        prompt=sample_prompt,
        commit_message="Test commit",
        author="test-user"
    )
    
    # Delete prompt
    commit = test_repo.delete_prompt(
        prompt_id=sample_prompt.id,
        commit_message="Delete test",
        author="test-user"
    )
    
    # Check if commit is returned
    assert commit is not None
    
    # Check if file is deleted
    prompt_path = test_repo._get_prompt_path(sample_prompt.id)
    assert not prompt_path.exists()
    
    # Check if getting deleted prompt raises error
    with pytest.raises(ValueError):
        test_repo.get_prompt(sample_prompt.id)

def test_list_prompts(test_repo, sample_prompt):
    """Test listing prompts."""
    # Create multiple prompts
    test_repo.create_prompt(
        prompt=sample_prompt,
        commit_message="Test commit 1",
        author="test-user"
    )
    
    second_prompt = Prompt(
        id="test-prompt-2",
        template=sample_prompt.template,
        metadata=sample_prompt.metadata
    )
    
    test_repo.create_prompt(
        prompt=second_prompt,
        commit_message="Test commit 2",
        author="test-user"
    )
    
    # List prompts
    prompts = test_repo.list_prompts()
    
    # Check if both prompts are returned
    assert len(prompts) == 2
    assert any(p["id"] == "test-prompt" for p in prompts)
    assert any(p["id"] == "test-prompt-2" for p in prompts)

def test_get_prompt_history(test_repo, sample_prompt):
    """Test getting prompt history."""
    # Create prompt
    test_repo.create_prompt(
        prompt=sample_prompt,
        commit_message="Initial commit",
        author="test-user"
    )
    
    # Make multiple updates
    for i in range(3):
        updated_prompt = Prompt(
            id=sample_prompt.id,
            template=PromptTemplate(
                text=f"Updated text {i} with {{param1}}",
                parameters=sample_prompt.template.parameters,
                config=sample_prompt.template.config
            ),
            metadata=PromptMetadata(
                author="test-user",
                description=f"Update {i}",
                tags=["test"],
                version=f"1.0.{i+1}"
            )
        )
        
        test_repo.update_prompt(
            prompt=updated_prompt,
            commit_message=f"Update {i}",
            author="test-user"
        )
    
    # Get history
    history = test_repo.get_prompt_history(sample_prompt.id)
    
    # Check if history contains all versions
    assert len(history) == 4  # Initial + 3 updates
    
    # Check if history is ordered by timestamp (newest first)
    assert history[0].prompt.metadata.version == "1.0.3"
    assert history[3].prompt.metadata.version == "1.0.0"

def test_render_prompt(test_repo, sample_prompt):
    """Test rendering a prompt with parameters."""
    # Create prompt
    test_repo.create_prompt(
        prompt=sample_prompt,
        commit_message="Test commit",
        author="test-user"
    )
    
    # Get prompt
    prompt = test_repo.get_prompt(sample_prompt.id)
    
    # Render with parameters
    rendered = prompt.render({"param1": "test value"})
    
    # Check rendered text
    assert rendered == "This is a test prompt with parameter test value"
    
    # Test with default value
    rendered = prompt.render({})
    assert rendered == "This is a test prompt with parameter default value"
    
    # Test with missing required parameter
    with pytest.raises(ValueError):
        # Set required=True and no default
        prompt.template.parameters[0].default = None
        prompt.render({})