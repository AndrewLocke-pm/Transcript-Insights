import { Router, type IRouter } from "express";
import Anthropic from "@anthropic-ai/sdk";

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
}`;

const router: IRouter = Router();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

router.post("/analyse", async (req, res) => {
  const { transcript } = req.body as { transcript?: string };

  if (!transcript || typeof transcript !== "string") {
    res.status(400).json({ error: "Missing or invalid transcript in request body" });
    return;
  }

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: transcript }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      res.status(500).json({ error: "Unexpected response type from Claude" });
      return;
    }

    const parsed = JSON.parse(content.text);
    res.json(parsed);
  } catch (err) {
    if (err instanceof SyntaxError) {
      res.status(500).json({ error: "Claude returned invalid JSON" });
      return;
    }
    const message = err instanceof Error ? err.message : "Analysis failed";
    res.status(500).json({ error: message });
  }
});

export default router;
