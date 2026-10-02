import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.auth import router as auth_router

from routes.interviews import router as interviews_router

app = FastAPI(title="AI-Interviewer Backend")
frontend_url = os.getenv("FRONTEND_URL")

allowed_origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]

if frontend_url:
    allowed_origins.append(frontend_url.rstrip("/"))

app.include_router(interviews_router)
app.include_router(auth_router)

# Allow the Vite development server to call this backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins = allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "AI-Interviewer backend is running"}


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "message": "AI-Interviewer backend is running",
    }
