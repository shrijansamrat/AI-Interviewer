import json
import os
import time
from typing import Literal

from dotenv import load_dotenv
from google import genai
from pydantic import BaseModel, Field, ValidationError
from google.genai import types


load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is not set in backend/.env")


client = genai.Client(api_key=GEMINI_API_KEY)


class GeneratedQuestion(BaseModel):
    question_text: str = Field(min_length=1)
    question_type: Literal["technical", "behavioral", "hr", "situational"]
    difficulty: Literal["easy", "medium", "hard"]
    order_number: int = Field(ge=1)


class GeneratedQuestions(BaseModel):
    questions: list[GeneratedQuestion]


def generate_interview_questions(
    role: str,
    experience: str,
    interview_type: str,
    question_count: int = 5,
    document_context: dict | None = None,
) -> dict[str, list[dict[str, str | int]]]:
    """Generate and validate interview questions using Gemini."""
    if question_count < 1:
        raise ValueError("question_count must be at least 1")
    context_text = ""

    if document_context:
        context_text = f"""
Additional candidate context extracted from the candidate's resume or job description:
- Document type: {document_context.get("document_type", "")}
- Target role: {document_context.get("role", "")}
- Experience: {document_context.get("experience", "")}
- Skills: {", ".join(document_context.get("skills", []))}
- Responsibilities: {", ".join(document_context.get("responsibilities", []))}
- Requirements: {", ".join(document_context.get("requirements", []))}
- Education: {", ".join(document_context.get("education", []))}
- Projects: {", ".join(document_context.get("projects", []))}
- Summary: {document_context.get("summary", "")}

Use this context to personalize the interview questions.
Do not invent facts that are not present in the candidate context.
""".strip()

    prompt = f"""
Generate exactly {question_count} interview questions for the following candidate:
- Role: {role}
- Experience level: {experience}
- Interview type: {interview_type}
{context_text}

Make the questions appropriate for the role, experience level, and interview type.
Use a suitable mixture of question types for the interview type. For a Technical
interview, prioritize technical questions relevant to the role.

Return only valid JSON with this exact structure:
{{
  "questions": [
    {{
      "question_text": "...",
      "question_type": "technical",
      "difficulty": "medium",
      "order_number": 1
    }}
  ]
}}

The questions array must contain exactly {question_count} items. Number them from
1 through {question_count} in order. Do not include any extra fields or commentary.
""".strip()

    
    last_error = None

    for attempt in range(3):
        try:
            response = client.models.generate_content(
                model="gemini-flash-lite-latest",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=GeneratedQuestions,
                ),
            )
            break
        except Exception as error:
            last_error = error

            if attempt < 2:
                time.sleep(2 ** attempt)
            else:
                raise RuntimeError(
                    f"Gemini question generation failed: {last_error}"
                ) from last_error

    response_text = response.text
    if not response_text:
        raise RuntimeError("Gemini returned an empty response")

    try:
        response_data = json.loads(response_text)
        validated_questions = GeneratedQuestions.model_validate(response_data)
    except (json.JSONDecodeError, ValidationError, TypeError) as error:
        raise RuntimeError("Gemini returned invalid question data") from error

    questions = validated_questions.questions
    if len(questions) != question_count:
        raise RuntimeError(
            f"Gemini returned {len(questions)} questions; expected {question_count}"
        )

    expected_order = list(range(1, question_count + 1))
    actual_order = [question.order_number for question in questions]
    if actual_order != expected_order:
        raise RuntimeError("Gemini returned questions with invalid order numbers")

    return validated_questions.model_dump()
class EvaluationResult(BaseModel):
    correctness: float = Field(ge=0, le=10)
    relevance: float = Field(ge=0, le=10)
    clarity: float = Field(ge=0, le=10)
    depth: float = Field(ge=0, le=10)
    overall_score: float = Field(ge=0, le=10)
    feedback: str = Field(min_length=1)


def evaluate_answer(
    question: str,
    answer: str,
    role: str,
) -> dict:
    prompt = f"""
Evaluate a candidate's interview answer.

Candidate role: {role}

Interview question:
{question}

Candidate answer:
{answer}

Evaluate the answer on a scale of 0 to 10 for:
- correctness
- relevance
- clarity
- depth

Then provide an overall score from 0 to 10 and concise, actionable feedback.

Return only valid JSON using exactly this structure:
{{
  "correctness": 0,
  "relevance": 0,
  "clarity": 0,
  "depth": 0,
  "overall_score": 0,
  "feedback": "..."
}}
""".strip()

    try:
        response = client.models.generate_content(
            model="gemini-flash-lite-latest",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=EvaluationResult,
            ),
        )
    except Exception as error:
        raise RuntimeError(
            f"Gemini answer evaluation failed: {error}"
        ) from error

    response_text = response.text

    if not response_text:
        raise RuntimeError("Gemini returned an empty evaluation")

    try:
        response_data = json.loads(response_text)
        evaluation = EvaluationResult.model_validate(response_data)
    except (json.JSONDecodeError, ValidationError, TypeError) as error:
        raise RuntimeError(
            "Gemini returned invalid evaluation data"
        ) from error

    return evaluation.model_dump()
class ParsedDocumentContext(BaseModel):
    document_type: Literal["resume", "job_description", "unknown"]
    role: str = ""
    experience: str = ""
    skills: list[str] = []
    responsibilities: list[str] = []
    requirements: list[str] = []
    education: list[str] = []
    projects: list[str] = []
    summary: str = ""


def parse_document_context(
    document_text: str,
    document_type_hint: str = "unknown",
) -> dict:
    """Extract structured resume/JD context using Gemini."""

    if not document_text.strip():
        raise ValueError("Document text cannot be empty")

    prompt = f"""
Analyze the following resume or job description.

Document type hint: {document_type_hint}

Extract useful information that can be used to personalize a technical or HR
interview.

Return ONLY valid JSON with exactly this structure:

{{
  "document_type": "resume",
  "role": "",
  "experience": "",
  "skills": [],
  "responsibilities": [],
  "requirements": [],
  "education": [],
  "projects": [],
  "summary": ""
}}

Rules:
- document_type must be exactly one of:
  "resume", "job_description", "unknown"
- Identify the most likely target role.
- Extract important technical and professional skills.
- For a job description, extract responsibilities and requirements.
- For a resume, extract education, projects, experience and skills when available.
- Do not invent information that is not present.
- Keep extracted information concise and useful for interview generation.

Document:

{document_text}
""".strip()

    try:
        response = client.models.generate_content(
            model="gemini-flash-lite-latest",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=ParsedDocumentContext,
            ),
        )
    except Exception as error:
        raise RuntimeError(
            f"Gemini document parsing failed: {error}"
        ) from error

    response_text = response.text

    if not response_text:
        raise RuntimeError("Gemini returned an empty document parsing response")

    try:
        response_data = json.loads(response_text)
        parsed_context = ParsedDocumentContext.model_validate(response_data)
    except (json.JSONDecodeError, ValidationError, TypeError) as error:
        raise RuntimeError(
            "Gemini returned invalid document context"
        ) from error

    return parsed_context.model_dump()    