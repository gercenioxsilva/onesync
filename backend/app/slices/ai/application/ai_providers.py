import json
import logging
from typing import Optional
import httpx
import re

logger = logging.getLogger(__name__)


class AIProvider:
    """Base class for AI providers"""
    
    def __init__(self, api_key: str, model: str, temperature: float = 0.7, max_tokens: int = 1000):
        self.api_key = api_key
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens
    
    async def process_transcription(self, prompt: str) -> dict:
        """
        Process transcription and return extracted data
        Returns: {
            "summary": str,
            "next_steps": str,
            "mood_score": int (0-10),
            "risk_signal": str (RISCO|NEUTRO|OPORTUNIDADE),
            "key_points": list,
            "input_tokens": int,
            "output_tokens": int,
            "cost": float
        }
        """
        raise NotImplementedError


class OpenAIProvider(AIProvider):
    """OpenAI GPT-4 provider"""
    
    BASE_URL = "https://api.openai.com/v1"
    
    async def process_transcription(self, prompt: str) -> dict:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.BASE_URL}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.model,
                        "messages": [
                            {
                                "role": "user",
                                "content": prompt
                            }
                        ],
                        "temperature": self.temperature,
                        "max_tokens": self.max_tokens,
                        "response_format": {"type": "json_object"}
                    },
                    timeout=120.0
                )
                
                if response.status_code != 200:
                    error_msg = response.text
                    logger.error(f"OpenAI API error: {error_msg}")
                    raise Exception(f"OpenAI API error: {error_msg}")
                
                data = response.json()
                
                # Extract usage info for cost calculation
                input_tokens = data.get("usage", {}).get("prompt_tokens", 0)
                output_tokens = data.get("usage", {}).get("completion_tokens", 0)
                
                # Calculate approximate cost (GPT-4-turbo: $0.01 per 1K input, $0.03 per 1K output)
                cost = (input_tokens / 1000 * 0.01) + (output_tokens / 1000 * 0.03)
                
                # Extract response content
                content = data["choices"][0]["message"]["content"]
                
                # Parse JSON response
                extracted = json.loads(content)
                
                # Validate and normalize extracted data
                result = {
                    "summary": str(extracted.get("summary", ""))[:500],
                    "next_steps": str(extracted.get("next_steps", ""))[:500],
                    "mood_score": self._validate_mood_score(extracted.get("mood_score", 5)),
                    "risk_signal": self._validate_risk_signal(extracted.get("risk_signal", "NEUTRO")),
                    "key_points": extracted.get("key_points", [])[:10],
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "cost": round(cost, 4),
                    "raw_response": content
                }
                
                return result
        
        except Exception as e:
            logger.error(f"OpenAI processing error: {str(e)}")
            raise
    
    @staticmethod
    def _validate_mood_score(score: any) -> int:
        """Validate and normalize mood score to 0-10"""
        try:
            mood = int(score)
            return max(0, min(10, mood))  # Clamp to 0-10
        except (ValueError, TypeError):
            return 5  # Default to neutral
    
    @staticmethod
    def _validate_risk_signal(signal: str) -> str:
        """Validate risk signal"""
        valid_signals = ["RISCO", "NEUTRO", "OPORTUNIDADE"]
        signal_upper = str(signal).upper().strip()
        if signal_upper in valid_signals:
            return signal_upper
        return "NEUTRO"  # Default


class GeminiProvider(AIProvider):
    """Google Gemini provider"""
    
    BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"
    
    async def process_transcription(self, prompt: str) -> dict:
        try:
            async with httpx.AsyncClient() as client:
                model_id = self.model or "gemini-1.5-flash"
                response = await client.post(
                    f"{self.BASE_URL}/{model_id}:generateContent",
                    params={"key": self.api_key},
                    json={
                        "contents": [
                            {
                                "parts": [
                                    {
                                        "text": prompt
                                    }
                                ]
                            }
                        ],
                        "generationConfig": {
                            "temperature": self.temperature,
                            "maxOutputTokens": self.max_tokens
                        }
                    },
                    timeout=120.0
                )
                
                if response.status_code != 200:
                    error_msg = response.text
                    logger.error(f"Gemini API error: {error_msg}")
                    raise Exception(f"Gemini API error: {error_msg}")
                
                data = response.json()
                
                # Extract generated text
                content = data["candidates"][0]["content"]["parts"][0]["text"]
                
                # Extract JSON from response (Gemini might return markdown)
                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                if json_match:
                    extracted = json.loads(json_match.group())
                else:
                    extracted = json.loads(content)
                
                # Gemini doesn't return token usage in free tier, estimate based on word count
                input_tokens = len(prompt.split()) * 1.3  # ~1.3 tokens per word
                output_tokens = len(content.split()) * 1.3
                
                # Gemini pricing: $0.075 per 1M input tokens, $0.3 per 1M output tokens
                cost = (input_tokens / 1000000 * 0.075) + (output_tokens / 1000000 * 0.3)
                
                result = {
                    "summary": str(extracted.get("summary", ""))[:500],
                    "next_steps": str(extracted.get("next_steps", ""))[:500],
                    "mood_score": OpenAIProvider._validate_mood_score(extracted.get("mood_score", 5)),
                    "risk_signal": OpenAIProvider._validate_risk_signal(extracted.get("risk_signal", "NEUTRO")),
                    "key_points": extracted.get("key_points", [])[:10],
                    "input_tokens": int(input_tokens),
                    "output_tokens": int(output_tokens),
                    "cost": round(cost, 6),
                    "raw_response": content
                }
                
                return result
        
        except Exception as e:
            logger.error(f"Gemini processing error: {str(e)}")
            raise


def get_provider(provider_name: str, api_key: str, model: str, 
                temperature: float = 0.7, max_tokens: int = 1000) -> AIProvider:
    """Factory function to get the appropriate AI provider"""
    provider_lower = provider_name.lower()
    
    if provider_lower == "openai":
        return OpenAIProvider(api_key, model, temperature, max_tokens)
    elif provider_lower == "gemini":
        return GeminiProvider(api_key, model, temperature, max_tokens)
    else:
        raise ValueError(f"Unknown provider: {provider_name}")
