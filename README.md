# TranscriptInsight

An AI-powered meeting intelligence tool that turns audio recordings or raw transcript text into structured insights — decisions made, action items with owners, risks and blockers, and user needs with source quotes.

Stateless and privacy-safe by design. Nothing is stored.

---

## Why I built this

Meetings are where decisions get made and immediately lost. This is a working prototype exploring what structured AI extraction could look like as a standalone tool or embedded product feature — covering the full pipeline from audio ingestion through prompt engineering to eval-driven output validation.

Built to learn and demonstrate:
- Audio-to-text pipeline (Whisper API)
- Structured JSON extraction from unstructured language (Claude)
- Prompt engineering for consistent, non-hallucinated output
- Eval harness design for AI output quality

---

## Architecture

Two separate deployments that communicate via REST API. The frontend owns the UI. The backend owns all the intelligence.

```
┌─────────────────────────────┐         ┌──────────────────────────────┐
│        Bolt Frontend        │         │       Replit Backend         │
│  React + Vite + Tailwind    │  ──────▶ │  Express.js + Node.js 24    │
│                             │         │                              │
│  • Browser audio recording  │         │  • OpenAI Whisper (audio)    │
│  • File upload (.mp3 etc.)  │         │  • Anthropic Claude          │
│  • Transcript paste         │         │  • Structured JSON output    │
│  • Results display          │         │  • Files deleted on exit     │
└─────────────────────────────┘         └──────────────────────────────┘
```

This split is intentional — the frontend can be rebuilt without touching the backend, and the backend can be swapped or extended independently.

---

## Two Input Paths

**Audio path:**
```
Browser record / file upload → POST /process-audio → Whisper → Claude → JSON
```

**Transcript path:**
```
Paste text / .txt upload → POST /analyse → Claude → JSON
```

Both paths return the same response shape. The frontend doesn't need to know which was used.

---

## Output Schema

```json
{
  "meeting_type": "string",
  "decisions": [
    { "decision": "string", "context": "string" }
  ],
  "action_items": [
    { "task": "string", "owner": "string", "due_date": "string" }
  ],
  "risks_and_blockers": [
    { "risk": "string", "severity": "high|medium|low" }
  ],
  "user_needs": [
    { "need": "string", "source_quote": "string" }
  ],
  "confidence": "high|medium|low",
  "summary": "string"
}
```

`source_quote` is near-verbatim from the transcript. `due_date` is only populated if explicitly stated. No fabricated tasks, no invented risks.

---

## API Reference

All endpoints at the root path. No `/api` prefix.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Returns `{ status: "ok", timestamp }` |
| `POST` | `/transcribe` | `multipart/form-data` with field `audio` (max 25MB). Returns `{ transcript }` |
| `POST` | `/analyse` | JSON body `{ transcript: string }`. Returns structured insights object |
| `POST` | `/process-audio` | `multipart/form-data` with field `audio`. Chains transcribe → analyse. Returns `{ transcript, insights }` |

---

## Stack

| Layer | Technology |
|-------|------------|
| Backend runtime | Node.js 24 (ESM) |
| Backend framework | Express 5 |
| Transcription | OpenAI Whisper (`whisper-1`) |
| Analysis | Anthropic Claude (`claude-sonnet-4-6`) |
| File handling | Multer |
| Frontend | React + Vite + Tailwind CSS |
| Deployment | Replit Autoscale (backend), Bolt.new (frontend) |

---

## Setup

### Backend (Replit)

1. Create a new Node.js Replit
2. Add secrets: `OPENAI_API_KEY` and `ANTHROPIC_API_KEY`
3. Run command: `cd transcript-insights-api && node index.js`
4. Server listens on port `8080` (Replit default)

The server checks for both API keys on startup and exits with an error if either is missing.

### Frontend (Bolt / local)

1. Set environment variable: `VITE_API_URL=https://your-replit-url.replit.app`
2. Run: `npm install && npm run dev`

---

## Eval Harness

The `evals/` directory contains 6 test cases covering representative transcript types:

- Clean stakeholder review
- User interview
- Messy standup
- Design review with disagreements
- Solo voice note
- Real-world client debrief

Run against local server:
```bash
node evals/run.js
```

Run against production:
```bash
API_URL=https://your-replit-url.replit.app node evals/run.js
```

Each test case posts to `/analyse` and runs assertion checks against the output — validating that decisions are grounded, action items aren't fabricated, severity ratings are appropriate, and source quotes are present when users were discussed. Results reported as pass/fail per case.

---

## Key Implementation Notes

- **File cleanup**: Multer temp files are deleted after transcription whether the request succeeds or fails
- **Extension handling**: Temp files are renamed with the correct extension before being sent to Whisper — the OpenAI SDK requires it to set the correct MIME type
- **JSON extraction**: `extractJSON()` helper strips markdown fences from Claude responses before parsing. System prompt instructs Claude to return raw JSON only
- **API keys**: Live in Replit Secrets only. Never in the frontend
- **CORS**: Locked to the Bolt domain in production

---

## Project Structure

```
transcript-insights-api/
├── index.js          # Main server — all routes and logic
└── package.json

evals/
├── test-cases.js     # 6 test transcripts with assertion checks
├── run.js            # Eval runner
└── package.json
```

---

## Status

Working prototype. Built as a proof-of-work project by [Andrew Locke](https://linkedin.com/in/andrew-b-locke) — Technical PM and founder of [Sabrulo](https://sabrulo.com), an AI product strategy and advisory firm.
