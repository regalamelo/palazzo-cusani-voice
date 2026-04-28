const TO_EMAIL = process.env.LEAD_TO_EMAIL || "andreacavallaro.it@gmail.com";
const FROM_EMAIL = process.env.LEAD_FROM_EMAIL || "Palazzo Cusani <onboarding@resend.dev>";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({
      error: "RESEND_API_KEY mancante su Vercel",
    });
  }

  try {
    const { summary } = req.body || {};

    if (!summary || typeof summary !== "string") {
      return res.status(400).json({ error: "Riepilogo mancante" });
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [TO_EMAIL],
        subject: "Nuova richiesta dal voice agent Palazzo Cusani",
        text: summary,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.message || "Invio email non riuscito",
      });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
