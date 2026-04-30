import { readFile } from "node:fs/promises";
import path from "node:path";

async function loadPrompt(fileName) {
  return readFile(path.join(process.cwd(), "prompts", fileName), "utf8");
}

export default async function handler(req, res) {
  try {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Metodo non consentito" });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OPENAI_API_KEY mancante su Vercel" });
    }

    const systemPrompt = await loadPrompt("system.txt");
    const palazzoCusaniPrompt = await loadPrompt("palazzo-cusani.txt");
    const instructions = `${systemPrompt}\n\n${palazzoCusaniPrompt}`;

    const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: "gpt-realtime-mini",
          output_modalities: ["audio"],
          instructions,
          audio: {
            input: {
              transcription: {
                model: "gpt-4o-mini-transcribe",
              },
              turn_detection: {
                type: "server_vad",
                create_response: false,
              },
            },
            output: {
              voice: "marin",
            },
          },
        },
      }),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
