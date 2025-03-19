#!/usr/bin/env python
# Script to create generic configuration repository

import os
import sys
from pathlib import Path

# Ensure backend directory exists
backend_dir = Path("backend")
if not backend_dir.exists():
    print("Error: backend directory not found")
    sys.exit(1)

# Ensure services directory exists
services_dir = backend_dir / "services"
if not services_dir.exists():
    print("Error: services directory not found")
    sys.exit(1)

# Create config_repository.py
config_repo_path = services_dir / "config_repository.py"
with open(config_repo_path, "w") as f:
    f.write("""# backend/services/config_repository.py
\"\"\"
Generic repository for storing and versioning configurations.
This base class can be used for all configuration types.
\"\"\"

import os
import json
import shutil
from datetime import datetime
from typing import Dict, List, Optional, Any, Type, cast
import logging
from pathlib import Path

import git
from pydantic import ValidationError

from backend.models.configuration import Configuration, ConfigurationVersion, ConfigurationMetadata
from backend.config.config_types import get_config_type, get_repo_path, validate_config_type

logger = logging.getLogger(__name__)

class ConfigRepository:
    \"\"\"
    Git-based repository for storing and versioning configurations.
    
    Each configuration is stored as a JSON file in a git repository,
    allowing for version control and history tracking.
    \"\"\"
    
    def __init__(self, config_type: str, repo_path: Optional[str] = None):
        \"\"\"
        Initialize the configuration repository.
        
        Args:
            config_type: Type of configuration to store
            repo_path: Path to the git repository (optional)
        \"\"\"
        # Validate config type
        validate_config_type(config_type)
        self.config_type = config_type
        
        # Use provided path or get from config
        if repo_path:
            self.repo_path = Path(repo_path).resolve()
        else:
            self.repo_path = Path(get_repo_path(config_type)).resolve()
            
        self._init_repo()
        logger.info(f"{config_type} repository initialized at {self.repo_path}")
    
    def _init_repo(self):
        \"\"\"Initialize the git repository if it doesn't exist.\"\"\"
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
                f.write(f"# {self.config_type.capitalize()} Repository\\n\\nGit-based storage for {self.config_type} configurations.\\n")
            
            self.repo.git.add(str(readme_path))
            self.repo.git.commit("-m", "Initial commit")
            logger.info(f"New git repository created at {str(self.repo_path)}")
    
    def _get_config_path(self, config_id: str) -> Path:
        \"\"\"Get the file path for a configuration.\"\"\"
        return self.repo_path / f"{config_id}.json"
    
    def _serialize_config(self, config: Configuration) -> Dict[str, Any]:
        \"\"\"Serialize a configuration to a dictionary.\"\"\"
        return json.loads(config.json())
    
    def _deserialize_config(self, data: Dict[str, Any], model_cls: Type[Configuration] = Configuration) -> Configuration:
        \"\"\"Deserialize a dictionary to a configuration.\"\"\"
        try:
            return model_cls(**data)
        except ValidationError as e:
            logger.error(f"Error deserializing {self.config_type} data: {str(e)}")
            raise ValueError(f"Invalid {self.config_type} data: {str(e)}")
    
    def create_config(self, config: Configuration, commit_message: str, author: str) -> str:
        \"\"\"
        Create a new configuration in the repository.
        
        Args:
            config: The configuration to create
            commit_message: Commit message
            author: Author of the commit
            
        Returns:
            commit_hash: The hash of the commit
        \"\"\"
        # Ensure config type matches repository type
        if config.config_type != self.config_type:
            raise ValueError(f"Configuration type mismatch: expected {self.config_type}, got {config.config_type}")
            
        config_path = self._get_config_path(config.id)
        
        # Check if config already exists
        if config_path.exists():
            logger.error(f"Failed to create {self.config_type}: Configuration with ID '{config.id}' already exists")
            raise ValueError(f"Configuration with ID '{config.id}' already exists")
        
        # Update metadata timestamps
        config.metadata.created_at = datetime.utcnow()
        config.metadata.updated_at = datetime.utcnow()
        
        # Write config to file
        serialized = self._serialize_config(config)
        
        # Log the path for debugging
        logger.info(f"Writing {self.config_type} to file: {str(config_path)}")
        
        # Ensure parent directory exists
        config_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Write the file
        with open(config_path, "w") as f:
            json.dump(serialized, f, indent=2)
        
        # Verify file exists before git operations
        if not config_path.exists():
            logger.error(f"Failed to write {self.config_type} file: {str(config_path)}")
            raise IOError(f"Failed to write {self.config_type} file: {str(config_path)}")
            
        logger.info(f"File written successfully: {str(config_path)}")
        
        try:
            # Commit to git - use relative path from repo root
            rel_path = config_path.relative_to(self.repo_path)
            logger.info(f"Using relative path for git add: {rel_path}")
            
            self.repo.git.add(str(rel_path))
            commit = self.repo.git.commit("-m", commit_message, "--author", f"{author} <{author}@example.com>")
            
            logger.info(f"{self.config_type.capitalize()} '{config.id}' created with commit {commit}")
            
            return commit
        except Exception as e:
            logger.error(f"Git error: {str(e)}")
            # Try again with full path as fallback
            try:
                abs_path = str(config_path.resolve())
                self.repo.git.add(abs_path)
                commit = self.repo.git.commit("-m", commit_message, "--author", f"{author} <{author}@example.com>")
                logger.info(f"{self.config_type.capitalize()} '{config.id}' created with commit {commit} (using absolute path)")
                return commit
            except Exception as e2:
                logger.error(f"Git error with absolute path: {str(e2)}")
                # File exists but git operation failed
                logger.error(f"Failed to commit {self.config_type} to git, but file was written to disk: {str(config_path)}")
                raise
    
    def get_config(self, config_id: str, version: Optional[str] = None, model_cls: Type[Configuration] = Configuration) -> Configuration:
        \"\"\"
        Get a configuration from the repository.
        
        Args:
            config_id: ID of the configuration
            version: Optional version or commit reference
            model_cls: Optional model class for deserialization
            
        Returns:
            The configuration
        \"\"\"
        config_path = self._get_config_path(config_id)
        
        # Check if config exists
        if not config_path.exists():
            logger.error(f"{self.config_type.capitalize()} with ID '{config_id}' not found")
            raise ValueError(f"{self.config_type.capitalize()} with ID '{config_id}' not found")
        
        if version:
            try:
                # Get file content at specific commit
                rel_path = config_path.relative_to(self.repo_path)
                content = self.repo.git.show(f"{version}:{rel_path}")
                data = json.loads(content)
            except git.exc.GitCommandError as e:
                logger.error(f"Version '{version}' for {self.config_type} '{config_id}' not found: {str(e)}")
                raise ValueError(f"Version '{version}' for {self.config_type} '{config_id}' not found")
        else:
            # Get current version
            with open(config_path, "r") as f:
                data = json.load(f)
        
        config = self._deserialize_config(data, model_cls)
        logger.info(f"{self.config_type.capitalize()} '{config_id}' retrieved, version: {version or 'latest'}")
        
        return config
    
    def update_config(self, config: Configuration, commit_message: str, author: str) -> str:
        \"\"\"
        Update an existing configuration.
        
        Args:
            config: The updated configuration
            commit_message: Commit message
            author: Author of the commit
            
        Returns:
            commit_hash: The hash of the commit
        \"\"\"
        # Ensure config type matches repository type
        if config.config_type != self.config_type:
            raise ValueError(f"Configuration type mismatch: expected {self.config_type}, got {config.config_type}")
            
        config_path = self._get_config_path(config.id)
        
        # Check if config exists
        if not config_path.exists():
            logger.error(f"Failed to update: {self.config_type.capitalize()} with ID '{config.id}' not found")
            raise ValueError(f"{self.config_type.capitalize()} with ID '{config.id}' not found")
        
        # Update metadata timestamp
        config.metadata.updated_at = datetime.utcnow()
        
        # Write config to file
        serialized = self._serialize_config(config)
        with open(config_path, "w") as f:
            json.dump(serialized, f, indent=2)
        
        try:
            # Commit to git - use relative path from repo root
            rel_path = config_path.relative_to(self.repo_path)
            
            self.repo.git.add(str(rel_path))
            commit = self.repo.git.commit("-m", commit_message, "--author", f"{author} <{author}@example.com>")
            
            logger.info(f"{self.config_type.capitalize()} '{config.id}' updated with commit {commit}")
            
            return commit
        except Exception as e:
            logger.error(f"Git error: {str(e)}")
            # Try again with full path as fallback
            abs_path = str(config_path.resolve())
            self.repo.git.add(abs_path)
            commit = self.repo.git.commit("-m", commit_message, "--author", f"{author} <{author}@example.com>")
            logger.info(f"{self.config_type.capitalize()} '{config.id}' updated with commit {commit} (using absolute path)")
            return commit
    
    def delete_config(self, config_id: str, commit_message: str, author: str) -> str:
        \"\"\"
        Delete a configuration from the repository.
        
        Args:
            config_id: ID of the configuration to delete
            commit_message: Commit message
            author: Author of the commit
            
        Returns:
            commit_hash: The hash of the commit
        \"\"\"
        config_path = self._get_config_path(config_id)
        
        # Check if config exists
        if not config_path.exists():
            logger.error(f"Failed to delete: {self.config_type.capitalize()} with ID '{config_id}' not found")
            raise ValueError(f"{self.config_type.capitalize()} with ID '{config_id}' not found")
        
        try:
            # Remove file using relative path
            rel_path = config_path.relative_to(self.repo_path)
            self.repo.git.rm(str(rel_path))
            
            # Commit to git
            commit = self.repo.git.commit("-m", commit_message, "--author", f"{author} <{author}@example.com>")
            
            logger.info(f"{self.config_type.capitalize()} '{config_id}' deleted with commit {commit}")
            
            return commit
        except Exception as e:
            logger.error(f"Git error: {str(e)}")
            # Try again with full path as fallback
            abs_path = str(config_path.resolve())
            self.repo.git.rm(abs_path)
            
            # Commit to git
            commit = self.repo.git.commit("-m", commit_message, "--author", f"{author} <{author}@example.com>")
            
            logger.info(f"{self.config_type.capitalize()} '{config_id}' deleted with commit {commit} (using absolute path)")
            
            return commit
    
    def list_configs(self) -> List[Dict[str, Any]]:
        \"\"\"
        List all configurations in the repository.
        
        Returns:
            List of configuration metadata
        \"\"\"
        configs = []
        
        # Find all JSON files in repository
        for path in self.repo_path.glob("*.json"):
            if path.name == "config.json" or not path.is_file():
                continue
                
            config_id = path.stem
            
            try:
                # Get config data
                with open(path, "r") as f:
                    data = json.load(f)
                
                # Get last commit for this file
                commits = list(self.repo.iter_commits(paths=str(path), max_count=1))
                if not commits:
                    continue
                    
                last_commit = commits[0]
                
                # Extract basic metadata
                configs.append({
                    "id": config_id,
                    "version": data.get("metadata", {}).get("version", "unknown"),
                    "title": data.get("metadata", {}).get("description", config_id),
                    "author": data.get("metadata", {}).get("author", "unknown"),
                    "updated_at": data.get("metadata", {}).get("updated_at", datetime.utcnow().isoformat()),
                    "config_type": self.config_type,
                    "last_commit": last_commit.hexsha,
                    "last_commit_message": last_commit.message
                })
            except Exception as e:
                logger.error(f"Error listing {self.config_type} '{config_id}': {str(e)}")
                # Skip invalid configs
                continue
        
        logger.info(f"Listed {len(configs)} {self.config_type} configurations")
        return configs
    
    def get_config_history(self, config_id: str, model_cls: Type[Configuration] = Configuration) -> List[ConfigurationVersion]:
        \"\"\"
        Get the history of a configuration.
        
        Args:
            config_id: ID of the configuration
            model_cls: Optional model class for deserialization
            
        Returns:
            List of configuration versions
        \"\"\"
        config_path = self._get_config_path(config_id)
        
        # Check if config exists
        if not config_path.exists():
            logger.error(f"Failed to get history: {self.config_type.capitalize()} with ID '{config_id}' not found")
            raise ValueError(f"{self.config_type.capitalize()} with ID '{config_id}' not found")
        
        # Get commit history for file
        rel_path = config_path.relative_to(self.repo_path)
        commits = list(self.repo.iter_commits(paths=str(rel_path)))
        
        versions = []
        for commit in commits:
            try:
                # Get file content at commit
                content = self.repo.git.show(f"{commit.hexsha}:{rel_path}")
                data = json.loads(content)
                config = self._deserialize_config(data, model_cls)
                
                # Create version info
                version = ConfigurationVersion(
                    config_id=config_id,
                    config_type=self.config_type,
                    version=config.metadata.version,
                    commit_hash=commit.hexsha,
                    created_at=datetime.fromtimestamp(commit.committed_date),
                    author=commit.author.name,
                    message=commit.message,
                    configuration=config
                )
                
                versions.append(version)
            except Exception as e:
                logger.error(f"Error getting version {commit.hexsha} for {self.config_type} '{config_id}': {str(e)}")
                # Skip invalid versions
                continue
        
        logger.info(f"Retrieved {len(versions)} versions for {self.config_type} '{config_id}'")
        
        return versions
    
    def get_diff(self, config_id: str, from_version: str, to_version: str) -> str:
        \"\"\"
        Get the diff between two versions of a configuration.
        
        Args:
            config_id: ID of the configuration
            from_version: Source version or commit reference
            to_version: Target version or commit reference
            
        Returns:
            Diff as a string
        \"\"\"
        config_path = self._get_config_path(config_id)
        
        # Check if config exists
        if not config_path.exists():
            logger.error(f"Failed to get diff: {self.config_type.capitalize()} with ID '{config_id}' not found")
            raise ValueError(f"{self.config_type.capitalize()} with ID '{config_id}' not found")
        
        try:
            # Get diff between commits using relative path
            rel_path = config_path.relative_to(self.repo_path)
            
            diff = self.repo.git.diff(
                f"{from_version}:{rel_path}",
                f"{to_version}:{rel_path}"
            )
            
            logger.info(f"Retrieved diff for {self.config_type} '{config_id}' from {from_version} to {to_version}")
            
            return diff
        except git.exc.GitCommandError as e:
            logger.error(f"Failed to get diff for {self.config_type} '{config_id}': {str(e)}")
            raise ValueError(f"Failed to get diff: {str(e)}")
            
    def archive_config(self, config_id: str, author: str) -> str:
        \"\"\"
        Archive a configuration.
        
        Args:
            config_id: ID of the configuration
            author: Author of the commit
            
        Returns:
            commit_hash: The hash of the commit
        \"\"\"
        config = self.get_config(config_id)
        
        # Update archived status
        config.metadata.archived = True
        
        # Update in repository
        return self.update_config(
            config=config,
            commit_message=f"Archive {self.config_type} {config_id}",
            author=author
        )
        
    def unarchive_config(self, config_id: str, author: str) -> str:
        \"\"\"
        Unarchive a configuration.
        
        Args:
            config_id: ID of the configuration
            author: Author of the commit
            
        Returns:
            commit_hash: The hash of the commit
        \"\"\"
        config = self.get_config(config_id)
        
        # Update archived status
        config.metadata.archived = False
        
        # Update in repository
        return self.update_config(
            config=config,
            commit_message=f"Unarchive {self.config_type} {config_id}",
            author=author
        )

    def clone_config(self, config_id: str, new_id: str, author: str) -> str:
        \"\"\"
        Clone a configuration to create a new one.
        
        Args:
            config_id: ID of the source configuration
            new_id: ID for the new configuration
            author: Author of the commit
            
        Returns:
            commit_hash: The hash of the commit
        \"\"\"
        # Get source config
        source_config = self.get_config(config_id)
        
        # Create clone with new ID and updated lineage
        clone_data = json.loads(source_config.json())
        clone_data["id"] = new_id
        clone_data["parent_id"] = config_id
        
        # Update lineage
        if "lineage" in clone_data and isinstance(clone_data["lineage"], list):
            clone_data["lineage"].append(config_id)
        else:
            clone_data["lineage"] = [config_id]
            
        # Update metadata
        if "metadata" in clone_data:
            clone_data["metadata"]["author"] = author
            clone_data["metadata"]["created_at"] = datetime.utcnow().isoformat()
            clone_data["metadata"]["updated_at"] = datetime.utcnow().isoformat()
            clone_data["metadata"]["version"] = "1.0.0"
            
            # Add "cloned from" to description
            desc = clone_data["metadata"].get("description", "")
            clone_data["metadata"]["description"] = f"Cloned from {config_id}" + (f": {desc}" if desc else "")
        
        # Create new config
        clone_config = self._deserialize_config(clone_data)
        
        # Save to repository
        return self.create_config(
            config=clone_config,
            commit_message=f"Clone {self.config_type} from {config_id}",
            author=author
        )

    def get_repository_info(self) -> Dict[str, Any]:
        \"\"\"
        Get information about the repository.
        
        Returns:
            Repository information
        \"\"\"
        # Get HEAD commit
        try:
            head_commit = self.repo.head.commit
            head_info = {
                "hash": head_commit.hexsha,
                "author": head_commit.author.name,
                "email": head_commit.author.email,
                "date": datetime.fromtimestamp(head_commit.committed_date).isoformat(),
                "message": head_commit.message,
            }
        except:
            head_info = None
            
        # Count configurations
        config_count = len(list(self.repo_path.glob("*.json")))
        
        return {
            "config_type": self.config_type,
            "repo_path": str(self.repo_path),
            "head": head_info,
            "config_count": config_count
        }

# Factory function to get repository for a specific configuration type
def get_config_repository(config_type: str) -> ConfigRepository:
    \"\"\"
    Get a repository for a specific configuration type.
    
    Args:
        config_type: Configuration type
        
    Returns:
        Configuration repository
    \"\"\"
    return ConfigRepository(config_type)
""")

print(f"Created {config_repo_path}")

print("Generic Configuration Repository created successfully.")