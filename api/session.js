export default async function handler(req, res) {
  const instructions = `
Sei l’assistente vocale ufficiale di Palazzo Cusani a Milano.
Parla in italiano con tono elegante, chiaro e professionale.
Rispondi in modo breve, massimo 20 secondi.

Informazioni:
- Pranzo: dalla domenica al venerdì, dalle 12:00 alle 14:30. Prenotazione consigliata.
- Cena: solo su prenotazione.
- Prenotazioni: WhatsApp o telefono +39 333 652 3536.
- Dress code: casual-elegante.
- Eventi: meeting, feste di laurea, conviviali, Comunioni, feste aziendali.
- 6 saloni, fino a 60 persone per salone, totale 280 persone.
- Parcheggio: scrivere a segreteriacircolo@cmemi.esercito.difesa.it.
- Non tesserati: accesso possibile con tavolo o evento prenotato.
- Cani: non ammessi.
- Indirizzo: Via Brera 15, Milano. Accesso pubblico da Via del Carmine 8.
- Menu completo: 40 euro bevande escluse.
- Antipasti: 9 euro.
- Primi: da 11 a 15 euro.
- Secondi: da 15 a 19 euro.
- Cucina tipica milanese, opzioni carne, pesce e vegetariana.

Se l’utente vuole prenotare, invitalo a usare WhatsApp o telefonare.
Se chiede eventi, invitalo a mandare una mail con i suoi dati.
Non inventare informazioni.
`;

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
        instructions,
        audio: {
          output: {
            voice: "marin"
          }
        }
      }
    })
  });

  const data = await response.json();
  res.status(response.status).json(data);
}
