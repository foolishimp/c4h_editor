# File: backend/services/workorder_repository.py
"""
Git-based repository for storing and versioning workorders.
Follows the Agent Design Principles with minimal processing and clear responsibility.
"""

import os
import json
import shutil
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
import logging
from pathlib import Path

import git
from pydantic import ValidationError

# Fix imports to use absolute paths
from backend.models.workorder import WorkOrder, WorkOrderVersion, WorkOrderMetadata, WorkOrderTemplate, WorkOrderConfig

logger = logging.getLogger(__name__)

class WorkOrderRepository:
    """
    Git-based repository for storing and versioning workorders.
    
    Each workorder is stored as a JSON file in a git repository,
    allowing for version control and history tracking.
    """
    
    def __init__(self, repo_path: str):
        """
        Initialize the workorder repository.
        
        Args:
            repo_path: Path to the git repository
        """
        self.repo_path = Path(repo_path).resolve()  # Use absolute path
        self._init_repo()
        logger.info(f"WorkOrder repository initialized at {repo_path}")
    
    def _init_repo(self):
        """Initialize the git repository if it doesn't exist."""
        self.repo_path.mkdir(parents=True, exist_ok=True)
        
        try:
            # Try to load existing repo
            self.repo = git.Repo(self.repo_path)
            logger.info(f"Existing git repository loaded from {str(self.repo_path)}")
        except git.exc.InvalidGitRepositoryError:
            # Create new repo
            self.repo = git.Repo.init(self.repo_path)
            
            # Create initial commit (required for some git operations)
            readme_path = self.repo_path / "README.md"
            with open(readme_path, "w") as f:
                f.write("# WorkOrder Repository\n\nGit-based storage for workorder templates.\n")
            
            self.repo.git.add(str(readme_path))
            self.repo.git.commit("-m", "Initial commit")
            logger.info(f"New git repository created at {str(self.repo_path)}")
    
    def _get_workorder_path(self, workorder_id: str) -> Path:
        """Get the file path for a workorder."""
        return self.repo_path / f"{workorder_id}.json"
    
    def _serialize_workorder(self, workorder: WorkOrder) -> Dict[str, Any]:
        """Serialize a workorder to a dictionary."""
        return json.loads(workorder.json())
    
    def _deserialize_workorder(self, data: Dict[str, Any]) -> WorkOrder:
        """Deserialize a dictionary to a workorder."""
        try:
            return WorkOrder(**data)
        except ValidationError as e:
            logger.error(f"Error deserializing workorder data: {str(e)}")
            raise ValueError(f"Invalid workorder data: {str(e)}")
    
    def create_workorder(self, workorder: WorkOrder, commit_message: str, author: str) -> str:
        """
        Create a new workorder in the repository.
        
        Args:
            workorder: The workorder to create
            commit_message: Commit message
            author: Author of the commit
            
        Returns:
            commit_hash: The hash of the commit
        """
        workorder_path = self._get_workorder_path(workorder.id)
        
        # Check if workorder already exists
        if workorder_path.exists():
            logger.error(f"Failed to create workorder: WorkOrder with ID '{workorder.id}' already exists")
            raise ValueError(f"WorkOrder with ID '{workorder.id}' already exists")
        
        # Update metadata timestamps
        workorder.metadata.created_at = datetime.utcnow()
        workorder.metadata.updated_at = datetime.utcnow()
        
        # Write workorder to file
        serialized = self._serialize_workorder(workorder)
        
        # Log the path for debugging
        logger.info(f"Writing workorder to file: {str(workorder_path)}")
        
        # Ensure parent directory exists
        workorder_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Write the file
        with open(workorder_path, "w") as f:
            json.dump(serialized, f, indent=2)
        
        # Verify file exists before git operations
        if not workorder_path.exists():
            logger.error(f"Failed to write workorder file: {str(workorder_path)}")
            raise IOError(f"Failed to write workorder file: {str(workorder_path)}")
            
        logger.info(f"File written successfully: {str(workorder_path)}")
        
        # Use absolute path for git operations
        abs_path = str(workorder_path.resolve())
        logger.info(f"Adding file to git: {abs_path}")
        
        try:
            # Commit to git - use relative path from repo root
            rel_path = workorder_path.relative_to(self.repo_path)
            logger.info(f"Using relative path for git add: {rel_path}")
            
            self.repo.git.add(str(rel_path))
            commit = self.repo.git.commit("-m", commit_message, "--author", f"{author} <{author}@example.com>")
            
            logger.info(f"WorkOrder '{workorder.id}' created with commit {commit}")
            
            return commit
        except Exception as e:
            logger.error(f"Git error: {str(e)}")
            # Try again with full path as fallback
            try:
                self.repo.git.add(abs_path)
                commit = self.repo.git.commit("-m", commit_message, "--author", f"{author} <{author}@example.com>")
                logger.info(f"WorkOrder '{workorder.id}' created with commit {commit} (using absolute path)")
                return commit
            except Exception as e2:
                logger.error(f"Git error with absolute path: {str(e2)}")
                # File exists but git operation failed
                # We'll leave the file on disk but log the error
                logger.error(f"Failed to commit workorder to git, but file was written to disk: {str(workorder_path)}")
                raise
    
    def get_workorder(self, workorder_id: str, version: Optional[str] = None) -> WorkOrder:
        """
        Get a workorder from the repository.
        
        Args:
            workorder_id: ID of the workorder
            version: Optional version or commit reference
            
        Returns:
            The workorder
        """
        workorder_path = self._get_workorder_path(workorder_id)
        
        # Check if workorder exists
        if not workorder_path.exists():
            logger.error(f"WorkOrder with ID '{workorder_id}' not found")
            raise ValueError(f"WorkOrder with ID '{workorder_id}' not found")
        
        if version:
            try:
                # Get file content at specific commit
                rel_path = workorder_path.relative_to(self.repo_path)
                content = self.repo.git.show(f"{version}:{rel_path}")
                data = json.loads(content)
            except git.exc.GitCommandError as e:
                logger.error(f"Version '{version}' for workorder '{workorder_id}' not found: {str(e)}")
                raise ValueError(f"Version '{version}' for workorder '{workorder_id}' not found")
        else:
            # Get current version
            with open(workorder_path, "r") as f:
                data = json.load(f)
        
        workorder = self._deserialize_workorder(data)
        logger.info(f"WorkOrder '{workorder_id}' retrieved, version: {version or 'latest'}")
        
        return workorder
    
    def update_workorder(self, workorder: WorkOrder, commit_message: str, author: str) -> str:
        """
        Update an existing workorder.
        
        Args:
            workorder: The updated workorder
            commit_message: Commit message
            author: Author of the commit
            
        Returns:
            commit_hash: The hash of the commit
        """
        workorder_path = self._get_workorder_path(workorder.id)
        
        # Check if workorder exists
        if not workorder_path.exists():
            logger.error(f"Failed to update: WorkOrder with ID '{workorder.id}' not found")
            raise ValueError(f"WorkOrder with ID '{workorder.id}' not found")
        
        # Update metadata timestamp
        workorder.metadata.updated_at = datetime.utcnow()
        
        # Write workorder to file
        serialized = self._serialize_workorder(workorder)
        with open(workorder_path, "w") as f:
            json.dump(serialized, f, indent=2)
        
        try:
            # Commit to git - use relative path from repo root
            rel_path = workorder_path.relative_to(self.repo_path)
            
            self.repo.git.add(str(rel_path))
            commit = self.repo.git.commit("-m", commit_message, "--author", f"{author} <{author}@example.com>")
            
            logger.info(f"WorkOrder '{workorder.id}' updated with commit {commit}")
            
            return commit
        except Exception as e:
            logger.error(f"Git error: {str(e)}")
            # Try again with full path as fallback
            abs_path = str(workorder_path.resolve())
            self.repo.git.add(abs_path)
            commit = self.repo.git.commit("-m", commit_message, "--author", f"{author} <{author}@example.com>")
            logger.info(f"WorkOrder '{workorder.id}' updated with commit {commit} (using absolute path)")
            return commit
    
    def delete_workorder(self, workorder_id: str, commit_message: str, author: str) -> str:
        """
        Delete a workorder from the repository.
        
        Args:
            workorder_id: ID of the workorder to delete
            commit_message: Commit message
            author: Author of the commit
            
        Returns:
            commit_hash: The hash of the commit
        """
        workorder_path = self._get_workorder_path(workorder_id)
        
        # Check if workorder exists
        if not workorder_path.exists():
            logger.error(f"Failed to delete: WorkOrder with ID '{workorder_id}' not found")
            raise ValueError(f"WorkOrder with ID '{workorder_id}' not found")
        
        try:
            # Remove file using relative path
            rel_path = workorder_path.relative_to(self.repo_path)
            self.repo.git.rm(str(rel_path))
            
            # Commit to git
            commit = self.repo.git.commit("-m", commit_message, "--author", f"{author} <{author}@example.com>")
            
            logger.info(f"WorkOrder '{workorder_id}' deleted with commit {commit}")
            
            return commit
        except Exception as e:
            logger.error(f"Git error: {str(e)}")
            # Try again with full path as fallback
            abs_path = str(workorder_path.resolve())
            self.repo.git.rm(abs_path)
            
            # Commit to git
            commit = self.repo.git.commit("-m", commit_message, "--author", f"{author} <{author}@example.com>")
            
            logger.info(f"WorkOrder '{workorder_id}' deleted with commit {commit} (using absolute path)")
            
            return commit
    
    def list_workorders(self) -> List[Dict[str, Any]]:
        """
        List all workorders in the repository.
        
        Returns:
            List of workorder metadata
        """
        workorders = []
        
        # Find all JSON files in repository
        for path in self.repo_path.glob("*.json"):
            if path.name == "config.json" or not path.is_file():
                continue
                
            workorder_id = path.stem
            
            try:
                # Get workorder data
                with open(path, "r") as f:
                    data = json.load(f)
                
                # Get last commit for this file
                commits = list(self.repo.iter_commits(paths=str(path), max_count=1))
                if not commits:
                    continue
                    
                last_commit = commits[0]
                
                # Extract basic metadata
                workorders.append({
                    "id": workorder_id,
                    "version": data.get("metadata", {}).get("version", "unknown"),
                    "title": data.get("metadata", {}).get("description", workorder_id),
                    "author": data.get("metadata", {}).get("author", "unknown"),
                    "updated_at": data.get("metadata", {}).get("updated_at", datetime.utcnow().isoformat()),
                    "last_commit": last_commit.hexsha,
                    "last_commit_message": last_commit.message
                })
            except Exception as e:
                logger.error(f"Error listing workorder '{workorder_id}': {str(e)}")
                # Skip invalid workorders
                continue
        
        logger.info(f"Listed {len(workorders)} workorders")
        return workorders
    
    def get_workorder_history(self, workorder_id: str) -> List[WorkOrderVersion]:
        """
        Get the history of a workorder.
        
        Args:
            workorder_id: ID of the workorder
            
        Returns:
            List of workorder versions
        """
        workorder_path = self._get_workorder_path(workorder_id)
        
        # Check if workorder exists
        if not workorder_path.exists():
            logger.error(f"Failed to get history: WorkOrder with ID '{workorder_id}' not found")
            raise ValueError(f"WorkOrder with ID '{workorder_id}' not found")
        
        # Get commit history for file
        rel_path = workorder_path.relative_to(self.repo_path)
        commits = list(self.repo.iter_commits(paths=str(rel_path)))
        
        versions = []
        for commit in commits:
            try:
                # Get file content at commit
                content = self.repo.git.show(f"{commit.hexsha}:{rel_path}")
                data = json.loads(content)
                workorder = self._deserialize_workorder(data)
                
                # Create version info
                version = WorkOrderVersion(
                    workorder_id=workorder_id,
                    version=workorder.metadata.version,
                    commit_hash=commit.hexsha,
                    created_at=datetime.fromtimestamp(commit.committed_date),
                    author=commit.author.name,
                    message=commit.message,
                    workorder=workorder
                )
                
                versions.append(version)
            except Exception as e:
                logger.error(f"Error getting version {commit.hexsha} for workorder '{workorder_id}': {str(e)}")
                # Skip invalid versions
                continue
        
        logger.info(f"Retrieved {len(versions)} versions for workorder '{workorder_id}'")
        
        return versions
    
    def get_diff(self, workorder_id: str, from_version: str, to_version: str) -> str:
        """
        Get the diff between two versions of a workorder.
        
        Args:
            workorder_id: ID of the workorder
            from_version: Source version or commit reference
            to_version: Target version or commit reference
            
        Returns:
            Diff as a string
        """
        workorder_path = self._get_workorder_path(workorder_id)
        
        # Check if workorder exists
        if not workorder_path.exists():
            logger.error(f"Failed to get diff: WorkOrder with ID '{workorder_id}' not found")
            raise ValueError(f"WorkOrder with ID '{workorder_id}' not found")
        
        try:
            # Get diff between commits using relative path
            rel_path = workorder_path.relative_to(self.repo_path)
            
            diff = self.repo.git.diff(
                f"{from_version}:{rel_path}",
                f"{to_version}:{rel_path}"
            )
            
            logger.info(f"Retrieved diff for workorder '{workorder_id}' from {from_version} to {to_version}")
            
            return diff
        except git.exc.GitCommandError as e:
            logger.error(f"Failed to get diff for workorder '{workorder_id}': {str(e)}")
            raise ValueError(f"Failed to get diff: {str(e)}")