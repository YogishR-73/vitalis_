# VITALIS AI

The future of AI-powered healthcare intelligence. A high-fidelity, cinematic medical operating system built with Next.js, Framer Motion, and Three.js. Triage chat is powered by **OpenRouter** through a FastAPI backend.

## Run locally

1. **Backend** (from repo root):

   ```bash
   cd backend
   python -m venv .venv
   .venv\Scripts\activate   # Windows
   pip install -r requirements.txt
   copy .env.example .env   # then set OPENROUTER_API_KEY
   uvicorn main:app --reload --port 8000
   ```

2. **Frontend** (separate terminal):

   ```bash
   cd frontend
   copy .env.example .env.local
   # Ensure NEXT_PUBLIC_API_URL matches the backend (default http://localhost:8000)
   npm install
   npm run dev
   ```

3. Open `http://localhost:3000`, complete the boot flow, then use the triage chat.

## Environment

| Variable | Where | Purpose |
|----------|--------|---------|
| `OPENROUTER_API_KEY` | `backend/.env` | Bearer token for OpenRouter |
| `OPENROUTER_MODEL` | `backend/.env` | Model id (default: `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`) |
| `NEXT_PUBLIC_API_URL` | `frontend/.env.local` | FastAPI base URL |
| `NEXT_PUBLIC_AI_MODEL_LABEL` | `frontend/.env.local` | Optional UI label for the model badge |

## Deployment

Vercel experimental services are described in `vercel.json` (Next.js frontend + Python backend entrypoint). Configure the same environment variables in your host’s dashboard.
