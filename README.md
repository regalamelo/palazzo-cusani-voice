# Palazzo Cusani Voice Widget

Widget embeddabile per il voice agent di Palazzo Cusani via OpenAI Realtime API e WebRTC.

## Deploy su Vercel

In Vercel vai su Project Settings > Environment Variables e aggiungi:

```text
OPENAI_API_KEY=sk-proj-...
```

Poi fai redeploy.

## Embed come script

Dopo il deploy, se puoi inserire uno script nella pagina, usa:

```html
<script src="https://TUO-PROGETTO.vercel.app/widget.js?v=168"></script>
```

## Embed come iframe

Se invece il cliente vuole incorporarlo come iframe, usa questo codice:

```html
<iframe
  src="https://TUO-PROGETTO.vercel.app/"
  allow="microphone; autoplay"
  style="width: 100%; height: 720px; border: 0;"
></iframe>
```

Senza `allow="microphone"` il browser puo bloccare il microfono dentro l'iframe.
La API key resta solo nel backend Vercel. Il browser riceve solo un client secret temporaneo.
