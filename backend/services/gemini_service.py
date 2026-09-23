import json
import os
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
) -> dict[str, list[dict[str, str | int]]]:
    """Generate and validate interview questions using Gemini."""
    if question_count < 1:
        raise ValueError("question_count must be at least 1")

    prompt = f"""
Generate exactly {question_count} interview questions for the following candidate:
- Role: {role}
- Experience level: {experience}
- Interview type: {interview_type}

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

    try:
        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=GeneratedQuestions,
            ),
        )
    except Exception as error:
        raise RuntimeError(f"Gemini question generation failed: {error}") from error

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