let pc = null;
let stream = null;
let dc = null;
let active = false;

const style = document.createElement("style");
style.innerHTML = `
  body {
    min-height: 100vh;
    background: #ffffff;
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
    z-index: 9999;
    background: transparent;
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

  #voiceStatus {
    position: fixed;
    top: calc(50% + 135px);
    left: 50%;
    transform: translateX(-50%);
    font-family: Arial, sans-serif;
    font-size: 13px;
    color: #555;
    z-index: 9999;
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
status.id = "voiceStatus";
status.innerText = "Tocca la bolla";
document.body.appendChild(status);

const audio = document.createElement("audio");
audio.autoplay = true;
audio.playsInline = true;
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
    status.innerText = "Connessione...";

    const tokenResponse = await fetch("/api/session", { method: "POST" });
    const data = await tokenResponse.json();

    const EPHEMERAL_KEY = data.value;

    if (!EPHEMERAL_KEY) {
      alert("Errore token: " + JSON.stringify(data));
      status.innerText = "Errore token";
      return;
    }

    pc = new RTCPeerConnection();

    pc.ontrack = async (event) => {
      audio.srcObject = event.streams[0];
      await audio.play().catch(() => {});
    };

    dc = pc.createDataChannel("oai-events");

    dc.onopen = () => {
      status.innerText = "Connesso. Parla ora.";
      dc.send(JSON.stringify({
        type: "response.create",
        response: {
          instructions: "Saluta subito l’utente in italiano. Di': Benvenuto a Palazzo Cusani, sono il tuo assistente vocale. Posso aiutarti con prenotazioni, orari, eventi e informazioni sul palazzo."
        }
      }));
    };

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

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      body: offer.sdp,
      headers: {
        "Authorization": `Bearer ${EPHEMERAL_KEY}`,
        "Content-Type": "application/sdp"
      }
    });

    if (!sdpResponse.ok) {
      alert("Errore Realtime: " + await sdpResponse.text());
      status.innerText = "Errore realtime";
      return;
    }

    const answerSdp = await sdpResponse.text();

    await pc.setRemoteDescription({
      type: "answer",
      sdp: answerSdp
    });

    active = true;
    orb.classList.add("listening");
    status.innerText = "In ascolto";
  } catch (error) {
    alert("Errore: " + error.message);
    status.innerText = "Errore";
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
