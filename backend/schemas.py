from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class InterviewCreate(BaseModel):
    role: str
    experience: str
    interview_type: str


class InterviewResponse(BaseModel):
    id: int
    role: str
    experience: str
    interview_type: str
    status: str
    overall_score: Optional[float] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AnswerCreate(BaseModel):
    answer_text: str    
class GenerateQuestionsRequest(BaseModel):
    document_context: Optional[dict] = None

class UserRegister(BaseModel):
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"