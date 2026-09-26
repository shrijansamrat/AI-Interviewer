from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from models import Interview, Question
from schemas import InterviewCreate, InterviewResponse
from services.gemini_service import GeneratedQuestions, generate_interview_questions


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


@router.post(
    "/{interview_id}/generate-questions",
    response_model=GeneratedQuestions,
    status_code=status.HTTP_201_CREATED,
)
def generate_questions(
    interview_id: int,
    db: Session = Depends(get_db),
) -> GeneratedQuestions:
    interview = db.get(Interview, interview_id)

    if interview is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found",
        )

    existing_question = db.scalar(
        select(Question.id).where(Question.interview_id == interview_id).limit(1)
    )
    if existing_question is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Questions have already been generated for this interview",
        )

    try:
        generated_questions = generate_interview_questions(
            role=interview.role,
            experience=interview.experience,
            interview_type=interview.interview_type,
            question_count=5,
        )
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Question generation failed",
        ) from error

    questions = [
        Question(
            interview_id=interview_id,
            question_text=question["question_text"],
            question_type=question["question_type"],
            difficulty=question["difficulty"],
            order_number=question["order_number"],
        )
        for question in generated_questions["questions"]
    ]

    try:
        db.add_all(questions)
        db.commit()
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save generated questions",
        ) from error

    return GeneratedQuestions.model_validate(generated_questions)