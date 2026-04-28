export default async function handler(req, res) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OPENAI_API_KEY mancante su Vercel" });
    }

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
          output_modalities: ["audio"],
          instructions: `
Sei l’assistente vocale ufficiale di Palazzo Cusani a Milano.
Parla sempre in italiano.
Rispondi sempre in modo SUPER BREVE: massimo 1 frase, massimo 8 secondi.
Non parlare a lungo. Non aggiungere spiegazioni non richieste.

Informazioni:
- Pranzo: dalla domenica al venerdì, 12:00-14:30. Prenotazione consigliata.
- Cena: solo su prenotazione.
- Prenotazioni: WhatsApp o telefono +39 333 652 3536.
- Dress code: casual-elegante.
- Eventi: meeting, feste di laurea, conviviali, Comunioni, feste aziendali.
- 6 saloni, fino a 60 persone per salone, totale 280 persone.
- Parcheggio: segreteriacircolo@cmemi.esercito.difesa.it.
- Cani: non ammessi.
- Indirizzo: Via Brera 15, Milano. Accesso pubblico da Via del Carmine 8.
- Menu completo: 40 euro bevande escluse.
- Antipasti: 9 euro. Primi: 11-15 euro. Secondi: 15-19 euro.

Se l’utente chiede di prenotare o contattare Palazzo Cusani, rispondi:
"Può usare il pulsante WhatsApp qui sotto per prenotare o chiedere informazioni."
Non inventare informazioni.
          `,
          audio: {
            output: {
              voice: "marin"
            }
          }
        }
      })
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
