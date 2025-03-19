# File: backend/services/llm_service.py
"""
Service for interacting with Language Model providers.
This service is used for testing configurations by sending prompts to LLM providers.
"""

import os
import time
import json
import logging
from typing import Dict, Any, Optional, List
import httpx
from pydantic import BaseModel

# Fix import to use the correct path
from backend.config import load_config

logger = logging.getLogger(__name__)

class ModelResponse(BaseModel):
    """Response from a model."""
    text: str
    model: str
    provider: str
    usage: Dict[str, Any]
    raw_response: Dict[str, Any]
    latency: float


class LLMService:
    """
    Service for interacting with Language Model providers.
    Supports Anthropic and OpenAI providers.
    
    This service is used for testing configuration templates by rendering
    them and sending them to LLM providers for evaluation.
    """
    
    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize the LLM service.
        
        Args:
            config_path: Path to configuration file
        """
        self.config = load_config(config_path)
        self.llm_config = self.config.get("llm", {})
        
        # Default provider and model
        self.default_provider = self.llm_config.get("provider", "anthropic")
        self.default_model = self.llm_config.get("model", "claude-3-opus-20240229")
        
        # Initialize HTTP client
        self.http_client = httpx.AsyncClient(timeout=60.0)
        
        logger.info(f"LLM service initialized with default provider: {self.default_provider}, default model: {self.default_model}")
    
    async def _call_anthropic(
        self, 
        prompt: str, 
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 1000,
    ) -> ModelResponse:
        """
        Call the Anthropic API.
        
        Args:
            prompt: The prompt to send
            model: The model to use
            temperature: Temperature for generation
            max_tokens: Maximum tokens to generate
            
        Returns:
            Model response
        """
        # Get API key from environment
        api_key_env = self.llm_config.get("api_key_env", "ANTHROPIC_API_KEY")
        api_key = os.environ.get(api_key_env)
        
        if not api_key:
            logger.error(f"Anthropic API key not found in environment variable: {api_key_env}")
            raise ValueError(f"Anthropic API key not found in environment variable: {api_key_env}")
        
        # Prepare request
        url = "https://api.anthropic.com/v1/messages"
        
        headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": max_tokens,
            "temperature": temperature
        }
        
        # Log request
        logger.info(f"Sending request to Anthropic API, model: {model}, temperature: {temperature}, max_tokens: {max_tokens}")
        
        # Send request and time it
        start_time = time.time()
        response = await self.http_client.post(url, headers=headers, json=payload)
        latency = time.time() - start_time
        
        # Handle errors
        if response.status_code != 200:
            logger.error(f"Anthropic API error: status_code={response.status_code}, response={response.text}")
            raise ValueError(f"Anthropic API error: {response.text}")
        
        # Parse response
        response_data = response.json()
        
        # Log response
        logger.info(f"Received response from Anthropic API, model: {model}, latency: {latency:.2f}s")
        
        # Extract text from response
        content = response_data.get("content", [])
        text = "".join([block.get("text", "") for block in content]) if isinstance(content, list) else ""
        
        return ModelResponse(
            text=text,
            model=model,
            provider="anthropic",
            usage=response_data.get("usage", {}),
            raw_response=response_data,
            latency=latency
        )
    
    async def _call_openai(
        self, 
        prompt: str, 
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 1000,
    ) -> ModelResponse:
        """
        Call the OpenAI API.
        
        Args:
            prompt: The prompt to send
            model: The model to use
            temperature: Temperature for generation
            max_tokens: Maximum tokens to generate
            
        Returns:
            Model response
        """
        # Get API key from environment - check for dedicated OpenAI key config or fallback to general config
        api_key_env = self.llm_config.get("openai_api_key_env", "OPENAI_API_KEY")
        api_key = os.environ.get(api_key_env)
        
        if not api_key:
            logger.error(f"OpenAI API key not found in environment variable: {api_key_env}")
            raise ValueError(f"OpenAI API key not found in environment variable: {api_key_env}")
        
        # Prepare request
        url = "https://api.openai.com/v1/chat/completions"
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": model,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "max_tokens": max_tokens,
            "temperature": temperature
        }
        
        # Log request
        logger.info(f"Sending request to OpenAI API, model: {model}, temperature: {temperature}, max_tokens: {max_tokens}")
        
        # Send request and time it
        start_time = time.time()
        response = await self.http_client.post(url, headers=headers, json=payload)
        latency = time.time() - start_time
        
        # Handle errors
        if response.status_code != 200:
            logger.error(f"OpenAI API error: status_code={response.status_code}, response={response.text}")
            raise ValueError(f"OpenAI API error: {response.text}")
        
        # Parse response
        response_data = response.json()
        
        # Log response
        logger.info(f"Received response from OpenAI API, model: {model}, latency: {latency:.2f}s")
        
        # Extract text from response
        text = response_data.get("choices", [{}])[0].get("message", {}).get("content", "")
        
        return ModelResponse(
            text=text,
            model=model,
            provider="openai",
            usage=response_data.get("usage", {}),
            raw_response=response_data,
            latency=latency
        )
    
    async def generate(
        self,
        prompt: str,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1000,
    ) -> ModelResponse:
        """
        Generate text from a prompt.
        
        Args:
            prompt: The prompt to send
            provider: Provider to use (anthropic or openai)
            model: Model to use
            temperature: Temperature for generation
            max_tokens: Maximum tokens to generate
            
        Returns:
            Model response
        """
        # Use default provider and model if not specified
        provider = provider or self.default_provider
        model = model or self.default_model
        
        # Call appropriate provider
        if provider == "anthropic":
            return await self._call_anthropic(
                prompt=prompt,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens
            )
        elif provider == "openai":
            return await self._call_openai(
                prompt=prompt,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens
            )
        else:
            logger.error(f"Unknown provider: {provider}")
            raise ValueError(f"Unknown provider: {provider}")
    
    async def close(self):
        """Close the HTTP client."""
        await self.http_client.aclose()
        logger.info("LLM service closed")