#!/usr/bin/env python
"""
Migration script to convert existing workorders to new configuration format.
This script should be run once during the transition to the new architecture.
"""

import os
import json
import sys
import logging
from pathlib import Path
import shutil
from datetime import datetime

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Add the project root to the path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.models.workorder import WorkOrder as LegacyWorkOrder
from backend.models.workorder import WorkOrderTemplate, WorkOrderMetadata, WorkOrderConfig
from backend.models.configuration import Configuration, ConfigurationMetadata
from backend.services.workorder_repository import WorkOrderRepository as LegacyRepository
from backend.services.config_repository import ConfigRepository

def migrate_workorders(source_path: str, dest_path: str = None):
    """
    Migrate workorders from the legacy format to the new configuration format.
    
    Args:
        source_path: Path to legacy workorder repository
        dest_path: Path to new workorder repository (optional)
    """
    # Initialize repositories
    legacy_repo = LegacyRepository(source_path)
    
    if not dest_path:
        # Use default path based on config types
        from backend.config.config_types import get_repo_path
        dest_path = get_repo_path("workorder")
    
    # Ensure destination directory exists
    dest_dir = Path(dest_path)
    dest_dir.mkdir(parents=True, exist_ok=True)
    
    # Create new repository
    new_repo = ConfigRepository("workorder", dest_path)
    
    # Get all legacy workorders
    legacy_workorders = legacy_repo.list_workorders()
    
    logger.info(f"Found {len(legacy_workorders)} workorders to migrate")
    
    # Counters for statistics
    migrated = 0
    failed = 0
    
    # Process each workorder
    for workorder_info in legacy_workorders:
        workorder_id = workorder_info["id"]
        
        try:
            # Get the full workorder
            legacy_workorder = legacy_repo.get_workorder(workorder_id)
            
            # Create WorkOrderContent from legacy template
            content = {
                "template": legacy_workorder.template.dict()
            }
            
            # Create new configuration
            new_config = Configuration(
                id=workorder_id,
                config_type="workorder",
                content=content,
                metadata=legacy_workorder.metadata.dict(),
                parent_id=legacy_workorder.parent_id,
                lineage=legacy_workorder.lineage
            )
            
            # Save to new repository
            new_repo.create_config(
                config=new_config,
                commit_message=f"Migrated from legacy workorder: {workorder_id}",
                author="migration-script"
            )
            
            logger.info(f"Successfully migrated workorder: {workorder_id}")
            migrated += 1
            
        except Exception as e:
            logger.error(f"Failed to migrate workorder {workorder_id}: {str(e)}")
            failed += 1
    
    logger.info(f"Migration complete: {migrated} migrated, {failed} failed")

def create_backup(path: str):
    """Create a backup of the repository."""
    source_path = Path(path)
    if not source_path.exists():
        logger.warning(f"Source path does not exist: {path}")
        return
        
    # Create backup directory
    backup_dir = source_path.parent / f"{source_path.name}_backup_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    # Copy files
    shutil.copytree(source_path, backup_dir)
    
    logger.info(f"Created backup at {backup_dir}")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Migrate workorders to new configuration format")
    parser.add_argument("--source", help="Path to legacy workorder repository", default="./data/workorder_repository")
    parser.add_argument("--dest", help="Path to new workorder configuration repository")
    parser.add_argument("--backup", help="Create a backup before migration", action="store_true")
    
    args = parser.parse_args()
    
    if args.backup:
        create_backup(args.source)
    
    migrate_workorders(args.source, args.dest)
