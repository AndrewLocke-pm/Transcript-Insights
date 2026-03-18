import express from 'express'
import cors from 'cors'
import multer from 'multer'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import 'dotenv/config'

if (!process.env.OPENAI_API_KEY) console.error('MISSING: OPENAI_API_KEY')
if (!process.env.ANTHROPIC_API_KEY) console.error('MISSING: ANTHROPIC_API_KEY')

const stripCodeFences = (text) =>
  text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

const app = express()
const upload = multer({ dest: 'uploads/', limits: { fileSize: 25 * 1024 * 1024 } })
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

app.use(cors({ origin: '*' }))
app.use(express.json())

const SYSTEM_PROMPT = `You are a Product Intelligence Analyst. You extract structured insights from meeting transcripts for product managers.

## STAGE 1 — INTERPRET
Read the transcript carefully. Identify the meeting type (stakeholder review, user interview, team standup, design review, etc.) and the main participants if discernible.

## STAGE 2 — REASON
Extract only what is explicitly stated or clearly implied. Do not invent, infer beyond the text, or hallucinate details. For each category, find direct evidence in the transcript.

## STAGE 3 — VALIDATE
Before formatting, check:
- Every action item has an owner (use "Unassigned" if unclear)
- Every risk is a real concern raised, not a generic warning
- User needs are verbatim or near-verbatim from the transcript
- Decisions are things that were actually agreed, not just discussed

## STAGE 4 — FORMAT
Return ONLY a valid JSON object. No preamble, no explanation. No markdown code fences. Raw JSON only.

{
  "meeting_type": "string",
  "decisions": [
    { "decision": "string", "context": "string" }
  ],
  "action_items": [
    { "owner": "string", "task": "string", "due": "string or null" }
  ],
  "risks_and_blockers": [
    { "risk": "string", "raised_by": "string or null", "severity": "high|medium|low" }
  ],
  "user_needs": [
    { "need": "string", "source_quote": "string" }
  ],
  "confidence": "high|medium|low",
  "notes": "string or null"
}`

// GET /health
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// POST /transcribe
app.post('/transcribe', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file provided' })
  }

  const filePath = req.file.path

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'whisper-1',
    })
    res.json({ transcript: transcription.text })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Transcription failed' })
  } finally {
    fs.unlink(filePath, () => {})
  }
})

// POST /analyse
app.post('/analyse', async (req, res) => {
  const { transcript } = req.body

  if (!transcript || typeof transcript !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid transcript in request body' })
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: transcript }],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return res.status(500).json({ error: 'Unexpected response type from Claude' })
    }

    const parsed = JSON.parse(stripCodeFences(content.text))
    res.json(parsed)
  } catch (err) {
    if (err instanceof SyntaxError) {
      return res.status(500).json({ error: 'Claude returned invalid JSON' })
    }
    res.status(500).json({ error: err.message || 'Analysis failed' })
  }
})

// POST /process-audio
app.post('/process-audio', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file provided' })
  }

  const filePath = req.file.path

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'whisper-1',
    })

    const transcript = transcription.text

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: transcript }],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return res.status(500).json({ error: 'Unexpected response type from Claude' })
    }

    const insights = JSON.parse(stripCodeFences(content.text))
    res.json({ transcript, insights })
  } catch (err) {
    if (err instanceof SyntaxError) {
      return res.status(500).json({ error: 'Claude returned invalid JSON' })
    }
    res.status(500).json({ error: err.message || 'Processing failed' })
  } finally {
    fs.unlink(filePath, () => {})
  }
})

const PORT = process.env.PORT || 8080
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})
