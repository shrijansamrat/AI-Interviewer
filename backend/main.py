from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="AI-Interviewer Backend")

# Allow the Vite development server to call this backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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
