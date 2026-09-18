# AI-Interviewer Backend

This is the minimal FastAPI backend for AI-Interviewer. It currently provides a root endpoint and a health-check endpoint. Database, authentication, and AI functionality will be added later.

## Setup

From the repository root, create and activate a virtual environment:

### Windows PowerShell

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### macOS or Linux

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
```

Install the backend dependencies:

```bash
python -m pip install -r requirements.txt
```

## Run the server

```bash
uvicorn main:app --reload
```

The server runs at `http://127.0.0.1:8000` by default.

## Health check

Open [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health) in a browser or call it with a tool such as `curl`.

The endpoint returns:

```json
{
  "status": "ok",
  "message": "AI-Interviewer backend is running"
}
```
