from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from services.document_parser import extract_text
from services.gemini_service import (
    GeneratedQuestions,
    generate_interview_questions,
    parse_document_context,
)
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user
from models import Answer, Interview, Question, User
from schemas import (
    AnswerCreate,
    GenerateQuestionsRequest,
    InterviewCreate,
    InterviewResponse,
)
from services.gemini_service import (
    GeneratedQuestions,
    evaluate_answer,
    generate_interview_questions,
)


router = APIRouter(prefix="/api/interviews", tags=["interviews"])


@router.post(
    "",
    response_model=InterviewResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_interview(
    interview_data: InterviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Interview:
    interview = Interview(
        user_id=current_user.id,
        role=interview_data.role,
        experience=interview_data.experience,
        interview_type=interview_data.interview_type,
    )

    db.add(interview)
    db.commit()
    db.refresh(interview)

    return interview

@router.get("/", response_model=list[InterviewResponse])
def get_interview_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[InterviewResponse]:
    interviews = db.scalars(
        select(Interview)
        .where(Interview.user_id == current_user.id)
        .order_by(Interview.created_at.desc())
    ).all()

    return list(interviews)

@router.get("/{interview_id}", response_model=InterviewResponse)
def get_interview(
    interview_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Interview:
    interview = db.scalar(
        select(Interview).where(
            Interview.id == interview_id,
            Interview.user_id == current_user.id,
        )
    )

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
    request: GenerateQuestionsRequest | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GeneratedQuestions:
    interview = db.scalar(
        select(Interview).where(
            Interview.id == interview_id,
            Interview.user_id == current_user.id,
        )
    )

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
        document_context=request.document_context if request else None,
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

@router.get("/{interview_id}/questions")
def get_interview_questions(
    interview_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    interview = db.scalar(
    select(Interview).where(
        Interview.id == interview_id,
        Interview.user_id == current_user.id,
    )
)

    if interview is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found",
        )

    questions = db.scalars(
        select(Question)
        .where(Question.interview_id == interview_id)
        .order_by(Question.order_number)
    ).all()

    if not questions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No questions found for this interview",
        )

    return [
        {
            "id": question.id,
            "question_text": question.question_text,
            "question_type": question.question_type,
            "difficulty": question.difficulty,
            "order_number": question.order_number,
        }
        for question in questions
    ]

@router.post("/questions/{question_id}/answer")
def submit_answer(
    question_id: int,
    answer_data: AnswerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    question = db.scalar(
    select(Question)
    .join(Interview, Question.interview_id == Interview.id)
    .where(
        Question.id == question_id,
        Interview.user_id == current_user.id,
    )
)

    if question is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found",
        )

    if not answer_data.answer_text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Answer cannot be empty",
        )

    answer = Answer(
        question_id=question_id,
        answer_text=answer_data.answer_text.strip(),
    )

    db.add(answer)
    db.flush()

    interview = db.get(Interview, question.interview_id)

    try:
        evaluation_data = evaluate_answer(
            question=question.question_text,
            answer=answer.answer_text,
            role=interview.role,
        )
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Answer evaluation failed",
        ) from error

    from models import Evaluation

    evaluation = Evaluation(
        answer_id=answer.id,
        correctness=evaluation_data["correctness"],
        relevance=evaluation_data["relevance"],
        clarity=evaluation_data["clarity"],
        depth=evaluation_data["depth"],
        overall_score=evaluation_data["overall_score"],
        feedback=evaluation_data["feedback"],
    )

    db.add(evaluation)
    db.commit()
    db.refresh(answer)
    db.refresh(evaluation)

    return {
        "answer": {
            "id": answer.id,
            "question_id": answer.question_id,
            "answer_text": answer.answer_text,
            "submitted_at": answer.submitted_at,
        },
        "evaluation": evaluation_data,
    }
@router.get("/{interview_id}/results")
def get_interview_results(
    interview_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    interview = db.scalar(
    select(Interview).where(
        Interview.id == interview_id,
        Interview.user_id == current_user.id,
    )
)
    if interview is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found",
        )

    questions = db.scalars(
        select(Question)
        .where(Question.interview_id == interview_id)
        .order_by(Question.order_number)
    ).all()

    results = []

    for question in questions:
        answer = db.scalar(
            select(Answer)
            .where(Answer.question_id == question.id)
            .order_by(Answer.id.desc())
            .limit(1)
        )

        evaluation = None

        if answer:
            from models import Evaluation

            evaluation = db.scalar(
                select(Evaluation)
                .where(Evaluation.answer_id == answer.id)
            )

        results.append(
            {
                "question_id": question.id,
                "question": question.question_text,
                "question_type": question.question_type,
                "difficulty": question.difficulty,
                "answer": answer.answer_text if answer else None,
                "evaluation": (
                    {
                        "correctness": evaluation.correctness,
                        "relevance": evaluation.relevance,
                        "clarity": evaluation.clarity,
                        "depth": evaluation.depth,
                        "overall_score": evaluation.overall_score,
                        "feedback": evaluation.feedback,
                    }
                    if evaluation
                    else None
                ),
            }
        )

    evaluated_scores = [
        item["evaluation"]["overall_score"]
        for item in results
        if item["evaluation"] is not None
    ]

    overall_score = (
        round(sum(evaluated_scores) / len(evaluated_scores), 2)
        if evaluated_scores
        else None
    )

    strengths = []
    gaps = []

    for item in results:
        evaluation = item["evaluation"]

        if not evaluation:
            continue

        if evaluation["overall_score"] >= 8:
            strengths.append(item["question"])

        if evaluation["overall_score"] < 6:
            gaps.append(item["question"])

    interview.overall_score = overall_score

    if all(item["evaluation"] is not None for item in results) and results:
        interview.status = "completed"

    db.commit()

    return {
        "interview_id": interview.id,
        "role": interview.role,
        "experience": interview.experience,
        "interview_type": interview.interview_type,
        "status": interview.status,
        "overall_score": overall_score,
        "strengths": strengths,
        "gaps": gaps,
        "questions": results,
    }

@router.post("/documents/parse")
async def parse_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    MAX_FILE_SIZE = 5 * 1024 * 1024

    allowed_extensions = {".pdf", ".docx", ".txt"}

    filename = file.filename or ""
    extension = filename.lower().rsplit(".", 1)[-1]

    if f".{extension}" not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type. Please upload a PDF, DOCX, or TXT file.",
        )

    file_bytes = await file.read()

    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File is too large. Maximum size is 5 MB.",
        )

    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    try:
        document_text = extract_text(filename, file_bytes)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not extract text from the uploaded document.",
        ) from error

    if not document_text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No readable text was found in the uploaded document.",
        )

    document_type_hint = (
        "resume"
        if "resume" in filename.lower() or "cv" in filename.lower()
        else "job_description"
        if "jd" in filename.lower() or "job" in filename.lower()
        else "unknown"
    )

    try:
        parsed_context = parse_document_context(
            document_text=document_text,
            document_type_hint=document_type_hint,
        )
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI document parsing failed.",
        ) from error

    return {
        "filename": filename,
        "parsed_context": parsed_context,
    }