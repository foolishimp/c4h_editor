# File: backend/services/prompt_repository.py
"""
Git-based repository for storing and versioning prompts.
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
from backend.models.prompt import Prompt, PromptVersion, PromptMetadata, PromptTemplate, PromptConfig

logger = logging.getLogger(__name__)

class PromptRepository:
    """
    Git-based repository for storing and versioning prompts.
    
    Each prompt is stored as a JSON file in a git repository,
    allowing for version control and history tracking.
    """
    
    def __init__(self, repo_path: str):
        """
        Initialize the prompt repository.
        
        Args:
            repo_path: Path to the git repository
        """
        self.repo_path = Path(repo_path)
        self._init_repo()
        logger.info(f"Prompt repository initialized at {repo_path}")
    
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
                f.write("# Prompt Repository\n\nGit-based storage for prompt templates.\n")
            
            self.repo.git.add(str(readme_path))
            self.repo.git.commit("-m", "Initial commit")
            logger.info(f"New git repository created at {str(self.repo_path)}")
    
    def _get_prompt_path(self, prompt_id: str) -> Path:
        """Get the file path for a prompt."""
        return self.repo_path / f"{prompt_id}.json"
    
    def _serialize_prompt(self, prompt: Prompt) -> Dict[str, Any]:
        """Serialize a prompt to a dictionary."""
        return json.loads(prompt.json())
    
    def _deserialize_prompt(self, data: Dict[str, Any]) -> Prompt:
        """Deserialize a dictionary to a prompt."""
        try:
            return Prompt(**data)
        except ValidationError as e:
            logger.error(f"Error deserializing prompt data: {str(e)}")
            raise ValueError(f"Invalid prompt data: {str(e)}")
    
    def create_prompt(self, prompt: Prompt, commit_message: str, author: str) -> str:
        """
        Create a new prompt in the repository.
        
        Args:
            prompt: The prompt to create
            commit_message: Commit message
            author: Author of the commit
            
        Returns:
            commit_hash: The hash of the commit
        """
        prompt_path = self._get_prompt_path(prompt.id)
        
        # Check if prompt already exists
        if prompt_path.exists():
            logger.error(f"Failed to create prompt: Prompt with ID '{prompt.id}' already exists")
            raise ValueError(f"Prompt with ID '{prompt.id}' already exists")
        
        # Update metadata timestamps
        prompt.metadata.created_at = datetime.utcnow()
        prompt.metadata.updated_at = datetime.utcnow()
        
        # Write prompt to file
        serialized = self._serialize_prompt(prompt)
        with open(prompt_path, "w") as f:
            json.dump(serialized, f, indent=2)
        
        # Commit to git
        self.repo.git.add(str(prompt_path))
        commit = self.repo.git.commit(
            "-m", commit_message,
            "--author", f"{author} <{author}@example.com>"
        )
        
        logger.info(f"Prompt '{prompt.id}' created with commit {commit}")
        
        return commit
    
    def get_prompt(self, prompt_id: str, version: Optional[str] = None) -> Prompt:
        """
        Get a prompt from the repository.
        
        Args:
            prompt_id: ID of the prompt
            version: Optional version or commit reference
            
        Returns:
            The prompt
        """
        prompt_path = self._get_prompt_path(prompt_id)
        
        # Check if prompt exists
        if not prompt_path.exists():
            logger.error(f"Prompt with ID '{prompt_id}' not found")
            raise ValueError(f"Prompt with ID '{prompt_id}' not found")
        
        if version:
            try:
                # Get file content at specific commit
                content = self.repo.git.show(f"{version}:{prompt_path.relative_to(self.repo_path)}")
                data = json.loads(content)
            except git.exc.GitCommandError as e:
                logger.error(f"Version '{version}' for prompt '{prompt_id}' not found: {str(e)}")
                raise ValueError(f"Version '{version}' for prompt '{prompt_id}' not found")
        else:
            # Get current version
            with open(prompt_path, "r") as f:
                data = json.load(f)
        
        prompt = self._deserialize_prompt(data)
        logger.info(f"Prompt '{prompt_id}' retrieved, version: {version or 'latest'}")
        
        return prompt
    
    def update_prompt(self, prompt: Prompt, commit_message: str, author: str) -> str:
        """
        Update an existing prompt.
        
        Args:
            prompt: The updated prompt
            commit_message: Commit message
            author: Author of the commit
            
        Returns:
            commit_hash: The hash of the commit
        """
        prompt_path = self._get_prompt_path(prompt.id)
        
        # Check if prompt exists
        if not prompt_path.exists():
            logger.error(f"Failed to update: Prompt with ID '{prompt.id}' not found")
            raise ValueError(f"Prompt with ID '{prompt.id}' not found")
        
        # Update metadata timestamp
        prompt.metadata.updated_at = datetime.utcnow()
        
        # Write prompt to file
        serialized = self._serialize_prompt(prompt)
        with open(prompt_path, "w") as f:
            json.dump(serialized, f, indent=2)
        
        # Commit to git
        self.repo.git.add(str(prompt_path))
        commit = self.repo.git.commit(
            "-m", commit_message,
            "--author", f"{author} <{author}@example.com>"
        )
        
        logger.info(f"Prompt '{prompt.id}' updated with commit {commit}")
        
        return commit
    
    def delete_prompt(self, prompt_id: str, commit_message: str, author: str) -> str:
        """
        Delete a prompt from the repository.
        
        Args:
            prompt_id: ID of the prompt to delete
            commit_message: Commit message
            author: Author of the commit
            
        Returns:
            commit_hash: The hash of the commit
        """
        prompt_path = self._get_prompt_path(prompt_id)
        
        # Check if prompt exists
        if not prompt_path.exists():
            logger.error(f"Failed to delete: Prompt with ID '{prompt_id}' not found")
            raise ValueError(f"Prompt with ID '{prompt_id}' not found")
        
        # Remove file
        self.repo.git.rm(str(prompt_path))
        
        # Commit to git
        commit = self.repo.git.commit(
            "-m", commit_message,
            "--author", f"{author} <{author}@example.com>"
        )
        
        logger.info(f"Prompt '{prompt_id}' deleted with commit {commit}")
        
        return commit
    
    def list_prompts(self) -> List[Dict[str, Any]]:
        """
        List all prompts in the repository.
        
        Returns:
            List of prompt metadata
        """
        prompts = []
        
        # Find all JSON files in repository
        for path in self.repo_path.glob("*.json"):
            if path.name == "config.json" or not path.is_file():
                continue
                
            prompt_id = path.stem
            
            try:
                # Get prompt data
                with open(path, "r") as f:
                    data = json.load(f)
                
                # Get last commit for this file
                commits = list(self.repo.iter_commits(paths=str(path), max_count=1))
                if not commits:
                    continue
                    
                last_commit = commits[0]
                
                # Extract basic metadata
                prompts.append({
                    "id": prompt_id,
                    "version": data.get("metadata", {}).get("version", "unknown"),
                    "title": data.get("metadata", {}).get("description", prompt_id),
                    "author": data.get("metadata", {}).get("author", "unknown"),
                    "updated_at": data.get("metadata", {}).get("updated_at", datetime.utcnow().isoformat()),
                    "last_commit": last_commit.hexsha,
                    "last_commit_message": last_commit.message
                })
            except Exception as e:
                logger.error(f"Error listing prompt '{prompt_id}': {str(e)}")
                # Skip invalid prompts
                continue
        
        logger.info(f"Listed {len(prompts)} prompts")
        return prompts
    
    def get_prompt_history(self, prompt_id: str) -> List[PromptVersion]:
        """
        Get the history of a prompt.
        
        Args:
            prompt_id: ID of the prompt
            
        Returns:
            List of prompt versions
        """
        prompt_path = self._get_prompt_path(prompt_id)
        
        # Check if prompt exists
        if not prompt_path.exists():
            logger.error(f"Failed to get history: Prompt with ID '{prompt_id}' not found")
            raise ValueError(f"Prompt with ID '{prompt_id}' not found")
        
        # Get commit history for file
        commits = list(self.repo.iter_commits(paths=str(prompt_path)))
        
        versions = []
        for commit in commits:
            try:
                # Get file content at commit
                content = self.repo.git.show(f"{commit.hexsha}:{prompt_path.relative_to(self.repo_path)}")
                data = json.loads(content)
                prompt = self._deserialize_prompt(data)
                
                # Create version info
                version = PromptVersion(
                    prompt_id=prompt_id,
                    version=prompt.metadata.version,
                    commit_hash=commit.hexsha,
                    created_at=datetime.fromtimestamp(commit.committed_date),
                    author=commit.author.name,
                    message=commit.message,
                    prompt=prompt
                )
                
                versions.append(version)
            except Exception as e:
                logger.error(f"Error getting version {commit.hexsha} for prompt '{prompt_id}': {str(e)}")
                # Skip invalid versions
                continue
        
        logger.info(f"Retrieved {len(versions)} versions for prompt '{prompt_id}'")
        
        return versions
    
    def get_diff(self, prompt_id: str, from_version: str, to_version: str) -> str:
        """
        Get the diff between two versions of a prompt.
        
        Args:
            prompt_id: ID of the prompt
            from_version: Source version or commit reference
            to_version: Target version or commit reference
            
        Returns:
            Diff as a string
        """
        prompt_path = self._get_prompt_path(prompt_id)
        rel_path = prompt_path.relative_to(self.repo_path)
        
        # Check if prompt exists
        if not prompt_path.exists():
            logger.error(f"Failed to get diff: Prompt with ID '{prompt_id}' not found")
            raise ValueError(f"Prompt with ID '{prompt_id}' not found")
        
        try:
            # Get diff between commits
            diff = self.repo.git.diff(
                f"{from_version}:{rel_path}",
                f"{to_version}:{rel_path}"
            )
            
            logger.info(f"Retrieved diff for prompt '{prompt_id}' from {from_version} to {to_version}")
            
            return diff
        except git.exc.GitCommandError as e:
            logger.error(f"Failed to get diff for prompt '{prompt_id}': {str(e)}")
            raise ValueError(f"Failed to get diff: {str(e)}")