export default async function handler(req, res) {
  const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      session: {
        type: "realtime",
        model: "gpt-realtime-mini",
        instructions: "Sei l’assistente vocale ufficiale di Palazzo Cusani a Milano. Rispondi in italiano, in modo breve, elegante e professionale.",
        audio: { output: { voice: "marin" } }
      }
    })
  });

  const data = await response.json();
  res.status(response.status).json(data);
}
