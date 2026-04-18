from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class AIConfigCreate(BaseModel):
    provider: str = Field(..., description="Provider: openai, gemini, or azure")
    api_key: str = Field(..., min_length=10, description="API key for the provider")
    model_name: str = Field(default="gpt-4-turbo", description="Model to use")
    auto_process_enabled: bool = Field(default=False, description="Enable automatic processing")
    temperature: float = Field(default=0.7, ge=0.0, le=1.0)
    max_tokens: int = Field(default=1000, ge=100, le=4000)
    monthly_quota: int = Field(default=10, ge=0)
    prompt_template: str = Field(default="", description="Custom prompt template")

    @field_validator("provider")
    @classmethod
    def validate_provider(cls, v: str) -> str:
        if v.lower() not in ["openai", "gemini", "azure"]:
            raise ValueError("Provider must be one of: openai, gemini, azure")
        return v.lower()


class AIConfigUpdate(BaseModel):
    provider: str | None = Field(None)
    api_key: str | None = Field(None, min_length=10)
    model_name: str | None = Field(None)
    auto_process_enabled: bool | None = Field(None)
    temperature: float | None = Field(None, ge=0.0, le=1.0)
    max_tokens: int | None = Field(None, ge=100, le=4000)
    monthly_quota: int | None = Field(None, ge=0)
    prompt_template: str | None = Field(None)

    @field_validator("provider")
    @classmethod
    def validate_provider(cls, v: str | None) -> str | None:
        if v and v.lower() not in ["openai", "gemini", "azure"]:
            raise ValueError("Provider must be one of: openai, gemini, azure")
        return v.lower() if v else None


class AIConfigOut(BaseModel):
    id: str
    tenant_id: str
    provider: str
    model_name: str
    auto_process_enabled: bool
    temperature: float
    max_tokens: int
    monthly_quota: int
    monthly_usage: int
    # Don't expose full API key, only show masked version
    api_key_masked: str = Field(default="")
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @field_validator("api_key_masked", mode="before")
    @classmethod
    def mask_api_key(cls, v, info):
        api_key = info.data.get("api_key", "")
        if api_key:
            return f"{api_key[:4]}{'*' * (len(api_key) - 8)}{api_key[-4:]}"
        return ""


class AIProcessingLogOut(BaseModel):
    id: str
    tenant_id: str
    one_on_one_id: str
    provider: str
    model_used: str
    status: str
    input_type: str
    input_source: str
    extracted_summary: str
    extracted_next_steps: str
    extracted_mood_score: int
    extracted_risk_signal: str
    input_tokens: int
    output_tokens: int
    estimated_cost: float
    error_message: str
    retry_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProcessOneOnOneRequest(BaseModel):
    one_on_one_id: str = Field(..., description="ID of the 1:1 meeting to process")
    transcription: str = Field(..., description="Transcription or meeting notes to process")
    input_type: str = Field(
        default="transcription", description="Type of input: transcription, audio_url, manual_text"
    )

    @field_validator("transcription")
    @classmethod
    def validate_transcription(cls, v: str) -> str:
        if len(v) < 10:
            raise ValueError("Transcription must be at least 10 characters")
        if len(v) > 50000:
            raise ValueError("Transcription must be less than 50000 characters")
        return v


class ProcessOneOnOneResponse(BaseModel):
    log_id: str
    status: str
    extracted_summary: str
    extracted_next_steps: str
    extracted_mood_score: int
    extracted_risk_signal: str
    input_tokens: int
    output_tokens: int
    estimated_cost: float
