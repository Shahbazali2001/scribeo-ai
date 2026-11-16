from datetime import datetime
from typing import Dict, List, Literal, Optional
from pydantic import BaseModel, Field

SummaryStyleLiteral = Literal["short", "bullets", "detailed"]


class UserSettingsSchema(BaseModel):
    theme: Literal["system", "light", "dark"] = "system"
    speechSpeed: float = 1.0
    consentForTraining: bool = False


class ProfileResponse(BaseModel):
    id: str
    email: str
    displayName: str
    settings: UserSettingsSchema
    createdAt: datetime


class UpdateMeRequest(BaseModel):
    displayName: Optional[str] = Field(default=None, max_length=120)
    settings: Optional[Dict[str, object]] = None


class UsageStatsResponse(BaseModel):
    day: str
    scansUsed: int
    scansLimit: int
    summariesUsed: int
    summariesLimit: int
    resetsAt: str


class SummaryResponse(BaseModel):
    id: str
    scanId: str
    style: SummaryStyleLiteral
    text: str
    textVersion: int
    summaryModel: str
    createdAt: datetime


class ScanResponse(BaseModel):
    id: str
    userId: str
    imageUrl: str
    imageWidth: int
    imageHeight: int
    text: Optional[str] = None
    textVersion: int = 1
    wordCount: int = 0
    confidence: Optional[float] = None
    ocrModelVersion: Optional[str] = None
    language: Optional[str] = None
    languageConfidence: Optional[float] = None
    status: Literal["processing", "done", "failed"]
    errorCode: Optional[str] = None
    errorMessage: Optional[str] = None
    idempotencyKey: str
    summaries: Dict[str, SummaryResponse] = Field(default_factory=dict)
    createdAt: datetime
    updatedAt: datetime


class MeResponse(BaseModel):
    profile: ProfileResponse
    usage: UsageStatsResponse
    recentScans: List[ScanResponse]


class UpdateScanTextRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=25000)
    textVersion: int = Field(..., ge=1)


class CreateSummaryRequest(BaseModel):
    style: SummaryStyleLiteral = "short"


class FeedbackRequest(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    correctedText: Optional[str] = None
    consentForTraining: bool = False
