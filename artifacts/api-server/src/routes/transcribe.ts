import { Router, type IRouter } from "express";
import multer from "multer";
import fs from "fs";
import OpenAI from "openai";

const router: IRouter = Router();

const upload = multer({
  dest: "/tmp/",
  limits: { fileSize: 25 * 1024 * 1024 },
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post("/transcribe", upload.single("audio"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No audio file provided" });
    return;
  }

  const filePath = req.file.path;

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-1",
    });

    res.json({ transcript: transcription.text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transcription failed";
    res.status(500).json({ error: message });
  } finally {
    fs.unlink(filePath, () => {});
  }
});

export default router;
