from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import Interview
from schemas import InterviewCreate, InterviewResponse


router = APIRouter(prefix="/api/interviews", tags=["interviews"])


@router.post(
    "",
    response_model=InterviewResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_interview(
    interview_data: InterviewCreate,
    db: Session = Depends(get_db),
) -> Interview:
    interview = Interview(
        role=interview_data.role,
        experience=interview_data.experience,
        interview_type=interview_data.interview_type,
    )

    db.add(interview)
    db.commit()
    db.refresh(interview)

    return interview


@router.get("/{interview_id}", response_model=InterviewResponse)
def get_interview(
    interview_id: int,
    db: Session = Depends(get_db),
) -> Interview:
    interview = db.get(Interview, interview_id)

    if interview is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found",
        )

    return interview