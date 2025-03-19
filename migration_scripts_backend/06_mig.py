#!/usr/bin/env python
# Script to create specialized repository implementations

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

# Create workorder_repository_v2.py
workorder_repo_path = services_dir / "workorder_repository_v2.py"
with open(workorder_repo_path, "w") as f:
    f.write("""# backend/services/workorder_repository_v2.py
\"\"\"
Specialized repository for WorkOrder configurations.
Extends the base ConfigRepository with WorkOrder-specific functionality.
\"\"\"

import logging
from typing import Dict, List, Optional, Any, cast

from backend.models.workorder import WorkOrder, WorkOrderVersion
from backend.models.configuration import Configuration
from backend.services.config_repository import ConfigRepository

logger = logging.getLogger(__name__)

class WorkOrderRepository(ConfigRepository):
    \"\"\"Repository for WorkOrder configurations.\"\"\"
    
    def __init__(self, repo_path: Optional[str] = None):
        \"\"\"Initialize repository for workorder configurations.\"\"\"
        super().__init__("workorder", repo_path)
    
    def get_workorder(self, workorder_id: str, version: Optional[str] = None) -> WorkOrder:
        \"\"\"
        Get a workorder by ID and optional version.
        This is a strongly-typed version of get_config.
        
        Args:
            workorder_id: Workorder ID
            version: Optional version or commit hash
            
        Returns:
            WorkOrder instance
        \"\"\"
        config = super().get_config(workorder_id, version, WorkOrder)
        return cast(WorkOrder, config)
    
    def create_workorder(self, workorder: WorkOrder, commit_message: str, author: str) -> str:
        \"\"\"
        Create a new workorder in the repository.
        This is a strongly-typed version of create_config.
        
        Args:
            workorder: The workorder to create
            commit_message: Commit message
            author: Author of the commit
            
        Returns:
            Commit hash
        \"\"\"
        return super().create_config(workorder, commit_message, author)
    
    def update_workorder(self, workorder: WorkOrder, commit_message: str, author: str) -> str:
        \"\"\"
        Update an existing workorder.
        This is a strongly-typed version of update_config.
        
        Args:
            workorder: The updated workorder
            commit_message: Commit message
            author: Author of the commit
            
        Returns:
            Commit hash
        \"\"\"
        return super().update_config(workorder, commit_message, author)
    
    def delete_workorder(self, workorder_id: str, commit_message: str, author: str) -> str:
        \"\"\"
        Delete a workorder.
        This is a strongly-typed version of delete_config.
        
        Args:
            workorder_id: ID of the workorder to delete
            commit_message: Commit message
            author: Author of the commit
            
        Returns:
            Commit hash
        \"\"\"
        return super().delete_config(workorder_id, commit_message, author)
    
    def list_workorders(self) -> List[Dict[str, Any]]:
        \"\"\"
        List all workorders.
        This is a strongly-typed version of list_configs.
        
        Returns:
            List of workorder metadata
        \"\"\"
        return super().list_configs()
    
    def get_workorder_history(self, workorder_id: str) -> List[WorkOrderVersion]:
        \"\"\"
        Get the version history of a workorder.
        This is a strongly-typed version of get_config_history.
        
        Args:
            workorder_id: ID of the workorder
            
        Returns:
            List of workorder versions
        \"\"\"
        versions = super().get_config_history(workorder_id, WorkOrder)
        return [WorkOrderVersion(
            workorder_id=v.config_id,
            version=v.version,
            commit_hash=v.commit_hash,
            created_at=v.created_at,
            author=v.author,
            message=v.message,
            workorder=cast(WorkOrder, v.configuration)
        ) for v in versions]
""")

print(f"Created {workorder_repo_path}")

# Create teamconfig_repository.py
teamconfig_repo_path = services_dir / "teamconfig_repository.py"
with open(teamconfig_repo_path, "w") as f:
    f.write("""# backend/services/teamconfig_repository.py
\"\"\"
Specialized repository for TeamConfig configurations.
Extends the base ConfigRepository with TeamConfig-specific functionality.
\"\"\"

import logging
from typing import Dict, List, Optional, Any, cast

from backend.models.teamconfig import TeamConfig, TeamConfigVersion
from backend.models.configuration import Configuration
from backend.services.config_repository import ConfigRepository

logger = logging.getLogger(__name__)

class TeamConfigRepository(ConfigRepository):
    \"\"\"Repository for TeamConfig configurations.\"\"\"
    
    def __init__(self, repo_path: Optional[str] = None):
        \"\"\"Initialize repository for team configurations.\"\"\"
        super().__init__("teamconfig", repo_path)
    
    def get_teamconfig(self, teamconfig_id: str, version: Optional[str] = None) -> TeamConfig:
        \"\"\"
        Get a team configuration by ID and optional version.
        This is a strongly-typed version of get_config.
        
        Args:
            teamconfig_id: TeamConfig ID
            version: Optional version or commit hash
            
        Returns:
            TeamConfig instance
        \"\"\"
        config = super().get_config(teamconfig_id, version, TeamConfig)
        return cast(TeamConfig, config)
    
    def create_teamconfig(self, teamconfig: TeamConfig, commit_message: str, author: str) -> str:
        \"\"\"
        Create a new team configuration in the repository.
        This is a strongly-typed version of create_config.
        
        Args:
            teamconfig: The team configuration to create
            commit_message: Commit message
            author: Author of the commit
            
        Returns:
            Commit hash
        \"\"\"
        return super().create_config(teamconfig, commit_message, author)
    
    def update_teamconfig(self, teamconfig: TeamConfig, commit_message: str, author: str) -> str:
        \"\"\"
        Update an existing team configuration.
        This is a strongly-typed version of update_config.
        
        Args:
            teamconfig: The updated team configuration
            commit_message: Commit message
            author: Author of the commit
            
        Returns:
            Commit hash
        \"\"\"
        return super().update_config(teamconfig, commit_message, author)
    
    def delete_teamconfig(self, teamconfig_id: str, commit_message: str, author: str) -> str:
        \"\"\"
        Delete a team configuration.
        This is a strongly-typed version of delete_config.
        
        Args:
            teamconfig_id: ID of the team configuration to delete
            commit_message: Commit message
            author: Author of the commit
            
        Returns:
            Commit hash
        \"\"\"
        return super().delete_config(teamconfig_id, commit_message, author)
    
    def list_teamconfigs(self) -> List[Dict[str, Any]]:
        \"\"\"
        List all team configurations.
        This is a strongly-typed version of list_configs.
        
        Returns:
            List of team configuration metadata
        \"\"\"
        return super().list_configs()
    
    def get_teamconfig_history(self, teamconfig_id: str) -> List[TeamConfigVersion]:
        \"\"\"
        Get the version history of a team configuration.
        This is a strongly-typed version of get_config_history.
        
        Args:
            teamconfig_id: ID of the team configuration
            
        Returns:
            List of team configuration versions
        \"\"\"
        versions = super().get_config_history(teamconfig_id, TeamConfig)
        return [TeamConfigVersion(
            config_id=v.config_id,
            config_type=v.config_type,
            version=v.version,
            commit_hash=v.commit_hash,
            created_at=v.created_at,
            author=v.author,
            message=v.message,
            configuration=cast(TeamConfig, v.configuration)
        ) for v in versions]
""")

print(f"Created {teamconfig_repo_path}")

# Create runtimeconfig_repository.py
runtimeconfig_repo_path = services_dir / "runtimeconfig_repository.py"
with open(runtimeconfig_repo_path, "w") as f:
    f.write("""# backend/services/runtimeconfig_repository.py
\"\"\"
Specialized repository for RuntimeConfig configurations.
Extends the base ConfigRepository with RuntimeConfig-specific functionality.
\"\"\"

import logging
from typing import Dict, List, Optional, Any, cast

from backend.models.runtimeconfig import RuntimeConfig, RuntimeConfigVersion
from backend.models.configuration import Configuration
from backend.services.config_repository import ConfigRepository

logger = logging.getLogger(__name__)

class RuntimeConfigRepository(ConfigRepository):
    \"\"\"Repository for RuntimeConfig configurations.\"\"\"
    
    def __init__(self, repo_path: Optional[str] = None):
        \"\"\"Initialize repository for runtime configurations.\"\"\"
        super().__init__("runtimeconfig", repo_path)
    
    def get_runtimeconfig(self, runtimeconfig_id: str, version: Optional[str] = None) -> RuntimeConfig:
        \"\"\"
        Get a runtime configuration by ID and optional version.
        This is a strongly-typed version of get_config.
        
        Args:
            runtimeconfig_id: RuntimeConfig ID
            version: Optional version or commit hash
            
        Returns:
            RuntimeConfig instance
        \"\"\"
        config = super().get_config(runtimeconfig_id, version, RuntimeConfig)
        return cast(RuntimeConfig, config)
    
    def create_runtimeconfig(self, runtimeconfig: RuntimeConfig, commit_message: str, author: str) -> str:
        \"\"\"
        Create a new runtime configuration in the repository.
        This is a strongly-typed version of create_config.
        
        Args:
            runtimeconfig: The runtime configuration to create
            commit_message: Commit message
            author: Author of the commit
            
        Returns:
            Commit hash
        \"\"\"
        return super().create_config(runtimeconfig, commit_message, author)
    
    def update_runtimeconfig(self, runtimeconfig: RuntimeConfig, commit_message: str, author: str) -> str:
        \"\"\"
        Update an existing runtime configuration.
        This is a strongly-typed version of update_config.
        
        Args:
            runtimeconfig: The updated runtime configuration
            commit_message: Commit message
            author: Author of the commit
            
        Returns:
            Commit hash
        \"\"\"
        return super().update_config(runtimeconfig, commit_message, author)
    
    def delete_runtimeconfig(self, runtimeconfig_id: str, commit_message: str, author: str) -> str:
        \"\"\"
        Delete a runtime configuration.
        This is a strongly-typed version of delete_config.
        
        Args:
            runtimeconfig_id: ID of the runtime configuration to delete
            commit_message: Commit message
            author: Author of the commit
            
        Returns:
            Commit hash
        \"\"\"
        return super().delete_config(runtimeconfig_id, commit_message, author)
    
    def list_runtimeconfigs(self) -> List[Dict[str, Any]]:
        \"\"\"
        List all runtime configurations.
        This is a strongly-typed version of list_configs.
        
        Returns:
            List of runtime configuration metadata
        \"\"\"
        return super().list_configs()
    
    def get_runtimeconfig_history(self, runtimeconfig_id: str) -> List[RuntimeConfigVersion]:
        \"\"\"
        Get the version history of a runtime configuration.
        This is a strongly-typed version of get_config_history.
        
        Args:
            runtimeconfig_id: ID of the runtime configuration
            
        Returns:
            List of runtime configuration versions
        \"\"\"
        versions = super().get_config_history(runtimeconfig_id, RuntimeConfig)
        return [RuntimeConfigVersion(
            config_id=v.config_id,
            config_type=v.config_type,
            version=v.version,
            commit_hash=v.commit_hash,
            created_at=v.created_at,
            author=v.author,
            message=v.message,
            configuration=cast(RuntimeConfig, v.configuration)
        ) for v in versions]
""")

print(f"Created {runtimeconfig_repo_path}")

print("Specialized Repository Implementations created successfully.")