#!/usr/bin/env python3
# migration_script_03h.py
#
# This script creates the JobCreator component

import os
from pathlib import Path

BASE_DIR = Path("c4h-micro")

def create_directory(path):
    if not path.exists():
        print(f"Creating directory: {path}")
        path.mkdir(parents=True, exist_ok=True)

def write_file(path, content):
    print(f"Writing file: {path}")
    with open(path, "w") as file:
        file.write(content)

def create_job_creator():
    job_management_dir = BASE_DIR / "packages" / "job-management"
    components_dir = job_management_dir / "src" / "components"
    create_directory(components_dir)
    
    # Create JobCreator.tsx
    job_creator = """// File: packages/job-management/src/components/JobCreator.tsx
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Card, 
  CardContent, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  CircularProgress,
  Alert
} from '@mui/material';
import { useJobContext } from '../contexts/JobContext';
import { configTypes } from 'shared';
import { api } from 'shared';

interface ConfigOption {
  id: string;
  description: string;
}

const JobCreator: React.FC = () => {
  const { submitJob, loading, error } = useJobContext();
  
  // State for selected config IDs
  const [selectedConfigs, setSelectedConfigs] = useState<Record<string, string>>({});
  
  // State for available configs by type
  const [configOptions, setConfigOptions] = useState<Record<string, ConfigOption[]>>({});
  
  // State for form validity
  const [isFormValid, setIsFormValid] = useState<boolean>(false);
  
  // Load available configs for each type
  useEffect(() => {
    const loadConfigOptions = async () => {
      const options: Record<string, ConfigOption[]> = {};
      
      for (const [configType, config] of Object.entries(configTypes)) {
        try {
          const response = await api.get(config.apiEndpoints.list);
          
          // Map response data to ConfigOption array
          options[configType] = response.data.map((item: any) => ({
            id: item.id,
            description: item.metadata?.description || 'No description'
          }));
        } catch (err) {
          console.error(`Error loading ${configType} options:`, err);
          options[configType] = [];
        }
      }
      
      setConfigOptions(options);
    };
    
    loadConfigOptions();
  }, []);
  
  // Validate form
  useEffect(() => {
    // Check if all required config types have a selection
    const requiredTypes = Object.keys(configTypes);
    const isValid = requiredTypes.every(type => selectedConfigs[type]);
    
    setIsFormValid(isValid);
  }, [selectedConfigs]);
  
  // Handle config selection
  const handleConfigSelect = (configType: string, configId: string) => {
    setSelectedConfigs(prev => ({
      ...prev,
      [configType]: configId
    }));
  };
  
  // Handle form submission
  const handleSubmit = () => {
    if (isFormValid) {
      submitJob(selectedConfigs);
    }
  };
  
  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Create New Job
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box>
          {Object.entries(configTypes).map(([configType, config]) => (
            <FormControl 
              key={configType} 
              fullWidth 
              sx={{ mb: 2 }}
              disabled={loading}
            >
              <InputLabel id={`${configType}-label`}>
                {config.name}
              </InputLabel>
              <Select
                labelId={`${configType}-label`}
                value={selectedConfigs[configType] || ''}
                label={config.name}
                onChange={(e) => handleConfigSelect(configType, e.target.value as string)}
              >
                <MenuItem value="">
                  <em>Select a {config.name.toLowerCase()}</em>
                </MenuItem>
                {configOptions[configType]?.map((option) => (
                  <MenuItem key={option.id} value={option.id}>
                    {option.id} - {option.description}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ))}
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!isFormValid || loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Submit Job'}
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default JobCreator;
"""
    
    write_file(components_dir / "JobCreator.tsx", job_creator)
    
    print("JobCreator component created successfully!")

if __name__ == "__main__":
    create_job_creator()