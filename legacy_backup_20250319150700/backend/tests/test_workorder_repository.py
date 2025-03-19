# File: backend/tests/test_workorder_repository.py
"""
Unit tests for the WorkOrderRepository service.
"""

import pytest
import tempfile
import shutil
import json
from pathlib import Path
from datetime import datetime

from backend.services.workorder_repository import WorkOrderRepository
from backend.models.workorder import WorkOrder, WorkOrderTemplate, WorkOrderMetadata, WorkOrderConfig, WorkOrderParameter

@pytest.fixture
def test_repo():
    """Create a temporary repository for testing."""
    repo_dir = tempfile.mkdtemp()
    repo = WorkOrderRepository(repo_dir)
    
    yield repo
    
    # Clean up
    shutil.rmtree(repo_dir)

@pytest.fixture
def sample_workorder():
    """Create a sample workorder for testing."""
    return WorkOrder(
        id="test-workorder",
        template=WorkOrderTemplate(
            text="This is a test workorder with parameter {param1}",
            parameters=[
                WorkOrderParameter(
                    name="param1",
                    type="string",
                    description="Test parameter",
                    default="default value",
                    required=True
                )
            ],
            config=WorkOrderConfig(
                temperature=0.7,
                max_tokens=1000
            )
        ),
        metadata=WorkOrderMetadata(
            author="test-user",
            description="Test workorder for unit tests",
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

def test_create_workorder(test_repo, sample_workorder):
    """Test creating a workorder."""
    # Create workorder
    commit = test_repo.create_workorder(
        workorder=sample_workorder,
        commit_message="Test commit",
        author="test-user"
    )
    
    # Check if commit is returned
    assert commit is not None
    
    # Check if file is created
    workorder_path = test_repo._get_workorder_path(sample_workorder.id)
    assert workorder_path.exists()
    
    # Check file content
    with open(workorder_path, "r") as f:
        data = json.load(f)
    
    assert data["id"] == sample_workorder.id
    assert data["template"]["text"] == sample_workorder.template.text

def test_get_workorder(test_repo, sample_workorder):
    """Test getting a workorder."""
    # Create workorder
    test_repo.create_workorder(
        workorder=sample_workorder,
        commit_message="Test commit",
        author="test-user"
    )
    
    # Get workorder
    retrieved_workorder = test_repo.get_workorder(sample_workorder.id)
    
    # Check if workorder is returned
    assert retrieved_workorder is not None
    assert retrieved_workorder.id == sample_workorder.id
    assert retrieved_workorder.template.text == sample_workorder.template.text
    assert retrieved_workorder.metadata.author == sample_workorder.metadata.author

def test_update_workorder(test_repo, sample_workorder):
    """Test updating a workorder."""
    # Create workorder
    test_repo.create_workorder(
        workorder=sample_workorder,
        commit_message="Test commit",
        author="test-user"
    )
    
    # Update workorder
    updated_workorder = WorkOrder(
        id=sample_workorder.id,
        template=WorkOrderTemplate(
            text="Updated text with {param1}",
            parameters=sample_workorder.template.parameters,
            config=sample_workorder.template.config
        ),
        metadata=sample_workorder.metadata
    )
    
    commit = test_repo.update_workorder(
        workorder=updated_workorder,
        commit_message="Update test",
        author="test-user"
    )
    
    # Check if commit is returned
    assert commit is not None
    
    # Get updated workorder
    retrieved_workorder = test_repo.get_workorder(sample_workorder.id)
    
    # Check if workorder is updated
    assert retrieved_workorder.template.text == "Updated text with {param1}"

def test_delete_workorder(test_repo, sample_workorder):
    """Test deleting a workorder."""
    # Create workorder
    test_repo.create_workorder(
        workorder=sample_workorder,
        commit_message="Test commit",
        author="test-user"
    )
    
    # Delete workorder
    commit = test_repo.delete_workorder(
        workorder_id=sample_workorder.id,
        commit_message="Delete test",
        author="test-user"
    )
    
    # Check if commit is returned
    assert commit is not None
    
    # Check if file is deleted
    workorder_path = test_repo._get_workorder_path(sample_workorder.id)
    assert not workorder_path.exists()
    
    # Check if getting deleted workorder raises error
    with pytest.raises(ValueError):
        test_repo.get_workorder(sample_workorder.id)

def test_list_workorders(test_repo, sample_workorder):
    """Test listing workorders."""
    # Create multiple workorders
    test_repo.create_workorder(
        workorder=sample_workorder,
        commit_message="Test commit 1",
        author="test-user"
    )
    
    second_workorder = WorkOrder(
        id="test-workorder-2",
        template=sample_workorder.template,
        metadata=sample_workorder.metadata
    )
    
    test_repo.create_workorder(
        workorder=second_workorder,
        commit_message="Test commit 2",
        author="test-user"
    )
    
    # List workorders
    workorders = test_repo.list_workorders()
    
    # Check if both workorders are returned
    assert len(workorders) == 2
    assert any(p["id"] == "test-workorder" for p in workorders)
    assert any(p["id"] == "test-workorder-2" for p in workorders)

def test_get_workorder_history(test_repo, sample_workorder):
    """Test getting workorder history."""
    # Create workorder
    test_repo.create_workorder(
        workorder=sample_workorder,
        commit_message="Initial commit",
        author="test-user"
    )
    
    # Make multiple updates
    for i in range(3):
        updated_workorder = WorkOrder(
            id=sample_workorder.id,
            template=WorkOrderTemplate(
                text=f"Updated text {i} with {{param1}}",
                parameters=sample_workorder.template.parameters,
                config=sample_workorder.template.config
            ),
            metadata=WorkOrderMetadata(
                author="test-user",
                description=f"Update {i}",
                tags=["test"],
                version=f"1.0.{i+1}"
            )
        )
        
        test_repo.update_workorder(
            workorder=updated_workorder,
            commit_message=f"Update {i}",
            author="test-user"
        )
    
    # Get history
    history = test_repo.get_workorder_history(sample_workorder.id)
    
    # Check if history contains all versions
    assert len(history) == 4
    
    # Check if history is ordered by timestamp (newest first)
    assert history[0].workorder.metadata.version == "1.0.3"
    assert history[3].workorder.metadata.version == "1.0.0"

def test_render_workorder(test_repo, sample_workorder):
    """Test rendering a workorder with parameters."""
    # Create workorder
    test_repo.create_workorder(
        workorder=sample_workorder,
        commit_message="Test commit",
        author="test-user"
    )
    
    # Get workorder
    workorder = test_repo.get_workorder(sample_workorder.id)
    
    # Render with parameters
    rendered = workorder.render({"param1": "test value"})
    
    # Check rendered text
    assert rendered == "This is a test workorder with parameter test value"
    
    # Test with default value
    rendered = workorder.render({})
    assert rendered == "This is a test workorder with parameter default value"
    
    # Test with missing required parameter
    with pytest.raises(ValueError):
        workorder.template.parameters[0].default = None
        workorder.render({})