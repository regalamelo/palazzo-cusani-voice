let pc = null;
let stream = null;
let dc = null;
let active = false;

document.body.innerHTML = "";

const style = document.createElement("style");
style.innerHTML = `
  body {
    min-height: 100vh;
    background: #fff;
    margin: 0;
    font-family: Arial, sans-serif;
  }

  #voiceOrb {
    position: fixed;
    top: 50%;
    left: 50%;
    width: 210px;
    height: 210px;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    border: none;
    cursor: pointer;
    background: transparent;
    z-index: 10;
  }

  #voiceOrb::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 45% 55% 60% 40%;
    background:
      radial-gradient(circle at 72% 28%, rgba(70,230,255,.95), transparent 42%),
      radial-gradient(circle at 38% 48%, rgba(80,130,255,.9), transparent 45%),
      radial-gradient(circle at 30% 78%, rgba(240,0,255,.9), transparent 42%),
      radial-gradient(circle at 58% 60%, rgba(160,255,230,.85), transparent 35%);
    filter: blur(18px);
    animation: blobMove 5s ease-in-out infinite alternate;
  }

  #voiceOrb.listening::before {
    animation: blobMove 2s ease-in-out infinite alternate, activePulse 1.4s ease-in-out infinite;
  }

  #status {
    position: fixed;
    top: calc(50% + 140px);
    left: 50%;
    transform: translateX(-50%);
    color: #444;
    font-size: 14px;
    text-align: center;
    max-width: 90%;
  }

  @keyframes blobMove {
    0% { transform: scale(.9) rotate(0deg); }
    50% { transform: scale(1.05) rotate(18deg); }
    100% { transform: scale(.96) rotate(-14deg); }
  }

  @keyframes activePulse {
    0%,100% { filter: blur(18px) saturate(1.1); }
    50% { filter: blur(24px) saturate(1.7); }
  }
`;
document.head.appendChild(style);

const orb = document.createElement("button");
orb.id = "voiceOrb";
document.body.appendChild(orb);

const status = document.createElement("div");
status.id = "status";
status.innerText = "Tocca la bolla";
document.body.appendChild(status);

const audio = document.createElement("audio");
audio.autoplay = true;
audio.playsInline = true;
audio.controls = false;
audio.volume = 1;
document.body.appendChild(audio);

orb.onclick = async () => {
  if (active) {
    stopCall();
  } else {
    await startCall();
  }
};

async function startCall() {
  try {
    status.innerText = "Creo sessione OpenAI...";

    const tokenResponse = await fetch("/api/session", { method: "POST" });
    const data = await tokenResponse.json();

    if (!data.value) {
      status.innerText = "Errore token";
      alert(JSON.stringify(data));
      return;
    }

    const EPHEMERAL_KEY = data.value;

    status.innerText = "Attivo microfono...";

    pc = new RTCPeerConnection();

    pc.onconnectionstatechange = () => {
      status.innerText = "Stato connessione: " + pc.connectionState;
    };

    pc.ontrack = async (event) => {
      status.innerText = "Audio ricevuto da OpenAI";
      audio.srcObject = event.streams[0];

      try {
        await audio.play();
        status.innerText = "Sto parlando / ascoltando";
      } catch (e) {
        status.innerText = "Audio bloccato dal browser: clicca di nuovo la bolla";
      }
    };

    pc.addTransceiver("audio", { direction: "recvonly" });

    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    dc = pc.createDataChannel("oai-events");

    dc.onopen = () => {
      status.innerText = "Canale AI aperto. Invio richiesta voce...";

      dc.send(JSON.stringify({
        type: "response.create",
        response: {
          modalities: ["audio", "text"],
          instructions: "Rispondi SOLO con audio. Saluta subito in italiano dicendo: Benvenuto a Palazzo Cusani, sono il tuo assistente vocale. Posso aiutarti con prenotazioni, orari, eventi e informazioni sul palazzo."
        }
      }));
    };

    dc.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      console.log("OPENAI EVENT:", msg);

      if (msg.type === "error") {
        status.innerText = "Errore OpenAI: " + msg.error.message;
        alert("Errore OpenAI: " + msg.error.message);
      }

      if (msg.type === "response.done") {
        if (msg.response && msg.response.status === "failed") {
          status.innerText = "Risposta fallita";
          alert(JSON.stringify(msg.response.status_details || msg.response));
        }
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    status.innerText = "Connessione WebRTC...";

    const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      body: offer.sdp,
      headers: {
        "Authorization": `Bearer ${EPHEMERAL_KEY}`,
        "Content-Type": "application/sdp"
      }
    });

    if (!sdpResponse.ok) {
      const err = await sdpResponse.text();
      status.innerText = "Errore Realtime";
      alert(err);
      return;
    }

    const answerSdp = await sdpResponse.text();

    await pc.setRemoteDescription({
      type: "answer",
      sdp: answerSdp
    });

    active = true;
    orb.classList.add("listening");
    status.innerText = "Connesso. Attendi la voce o parla tu.";

  } catch (error) {
    status.innerText = "Errore: " + error.message;
    alert("Errore: " + error.message);
  }
}

function stopCall() {
  if (stream) stream.getTracks().forEach(track => track.stop());
  if (dc) dc.close();
  if (pc) pc.close();

  pc = null;
  stream = null;
  dc = null;
  active = false;

  audio.srcObject = null;
  orb.classList.remove("listening");
  status.innerText = "Tocca la bolla";
}
