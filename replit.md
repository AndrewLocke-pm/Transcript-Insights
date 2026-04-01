# Transcript Insights API

## Overview

Standalone Express.js backend API that transcribes audio and analyses meeting transcripts using OpenAI and Anthropic. No frontend. No monorepo.

## Stack

- **Runtime**: Node.js 24 (ESM — `"type": "module"`)
- **Framework**: Express 5
- **Transcription**: OpenAI Whisper (`whisper-1`)
- **Analysis**: Anthropic Claude (`claude-sonnet-4-6`, max_tokens 4096)
- **File uploads**: Multer (multipart/form-data)
- **Package manager**: npm (standalone, no pnpm workspace)

## Project Structure

```text
transcript-insights-api/
├── index.js          # Main server — all routes and logic
└── package.json      # Dependencies: express, multer, openai, @anthropic-ai/sdk

evals/
├── test-cases.js     # 6 test transcripts with assertion checks
├── run.js            # Eval runner — posts to /analyse and reports pass/fail
└── package.json      # { "type": "module" }
```

## API Endpoints

All endpoints are at the root path (no `/api` prefix):

- `GET /health` — Returns `{ status: "ok", timestamp }`
- `POST /transcribe` — Accepts `multipart/form-data` with field `audio` (max 25 MB). Sends to Whisper. Returns `{ transcript: string }`.
- `POST /analyse` — Accepts JSON `{ transcript: string }`. Sends to Claude. Returns structured JSON insights object.
- `POST /process-audio` — Accepts `multipart/form-data` with field `audio`. Chains transcribe → analyse. Returns `{ transcript, insights }`.

## Analyse Response Schema

```json
{
  "meeting_type": "string",
  "decisions": [{ "decision": "string", "context": "string" }],
  "action_items": [{ "task": "string", "owner": "string", "due_date": "string" }],
  "risks_and_blockers": [{ "risk": "string", "severity": "high|medium|low" }],
  "user_needs": [{ "need": "string", "source_quote": "string" }],
  "confidence": "high|medium|low",
  "summary": "string"
}
```

## Environment Secrets

Both must be set in Replit Secrets:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`

The server checks for both on startup and exits with an error if either is missing.

## Running Locally

The dev workflow runs: `cd transcript-insights-api && PORT=3001 node index.js`

Server listens on `PORT` env var, defaulting to `8080` (production uses 8080).

## Deployment

- **Target**: Replit Autoscale
- **Run command**: `cd transcript-insights-api && node index.js`
- **Port mapping**: external port 80 → local port 8080
- **Production URL**: `https://transcript-insights-andrew616.replit.app`

## Evals

Run against local server (default):
```bash
node evals/run.js
```

Run against production:
```bash
API_URL=https://transcript-insights-andrew616.replit.app node evals/run.js
```

6 test cases covering: clean stakeholder review, user interview, messy standup, design review with disagreements, solo voice note, and real-world mining client debrief.

## Key Implementation Details

- Multer temp files are renamed with the correct extension (`.webm`, `.mp4`, etc.) before being sent to Whisper — the OpenAI SDK requires the file extension to set the correct MIME type
- `extractJSON()` helper strips ` ```json ` fences from Claude responses before parsing
- System prompt instructs Claude to return only raw JSON with no markdown
- File is deleted from disk after transcription whether or not the request succeeds
