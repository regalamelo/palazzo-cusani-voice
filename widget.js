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
    overflow: visible;
  }

  #voiceOrb::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 45% 55% 60% 40% / 45% 45% 55% 55%;
    background:
      radial-gradient(circle at 72% 28%, rgba(70, 230, 255, 0.95), transparent 42%),
      radial-gradient(circle at 78% 62%, rgba(130, 220, 255, 0.85), transparent 42%),
      radial-gradient(circle at 38% 48%, rgba(80, 130, 255, 0.9), transparent 45%),
      radial-gradient(circle at 30% 78%, rgba(240, 0, 255, 0.9), transparent 42%),
      radial-gradient(circle at 58% 60%, rgba(160, 255, 230, 0.85), transparent 35%);
    filter: blur(18px);
    animation: blobMove 5s ease-in-out infinite alternate;
  }

  #voiceOrb::after {
    content: "";
    position: absolute;
    inset: -48px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(120, 220, 255, 0.16), transparent 65%);
    filter: blur(20px);
    animation: haloPulse 3s ease-in-out infinite;
  }

  #voiceOrb.connecting::before {
    animation: blobMove 1.2s ease-in-out infinite alternate;
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
    0% {
      transform: scale(0.9) rotate(0deg);
      border-radius: 45% 55% 60% 40% / 45% 45% 55% 55%;
    }
    50% {
      transform: scale(1.04) rotate(18deg);
      border-radius: 55% 45% 42% 58% / 52% 60% 40% 48%;
    }
    100% {
      transform: scale(0.96) rotate(-14deg);
      border-radius: 38% 62% 55% 45% / 60% 42% 58% 40%;
    }
  }

  @keyframes haloPulse {
    0%, 100% {
      opacity: 0.35;
      transform: scale(0.95);
    }
    50% {
      opacity: 0.75;
      transform: scale(1.15);
    }
  }

  @keyframes activePulse {
    0%, 100% {
      filter: blur(18px) saturate(1.1);
    }
    50% {
      filter: blur(22px) saturate(1.6);
    }
  }
`;
document.head.appendChild(style);

const orb = document.createElement("button");
orb.id = "voiceOrb";
orb.setAttribute("aria-label", "Avvia o termina assistente vocale");
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
    orb.classList.add("connecting");

    const tokenResponse = await fetch("/api/session", {
      method: "POST"
    });

    const data = await tokenResponse.json();

    if (!data.value) {
      alert("Errore token: " + JSON.stringify(data));
      status.innerText = "Errore token";
      orb.classList.remove("connecting");
      return;
    }

    const EPHEMERAL_KEY = data.value;

    pc = new RTCPeerConnection();

    pc.ontrack = async (event) => {
      audio.srcObject = event.streams[0];
      try {
        await audio.play();
      } catch (e) {
        console.log("Audio bloccato:", e);
      }
    };

    dc = pc.createDataChannel("oai-events");

    dc.onopen = () => {
      console.log("Data channel aperto");

      setTimeout(() => {
        dc.send(JSON.stringify({
          type: "response.create",
          response: {
            modalities: ["audio"],
            instructions: "Saluta subito l’utente in italiano. Di': Benvenuto a Palazzo Cusani, sono il tuo assistente vocale. Posso aiutarti con prenotazioni, orari, eventi e informazioni sul palazzo."
          }
        }));
      }, 1000);
    };

    dc.onmessage = (event) => {
      console.log("Evento OpenAI:", event.data);
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
      const errorText = await sdpResponse.text();
      alert("Errore Realtime: " + errorText);
      status.innerText = "Errore realtime";
      orb.classList.remove("connecting");
      return;
    }

    const answer = {
      type: "answer",
      sdp: await sdpResponse.text()
    };

    await pc.setRemoteDescription(answer);

    active = true;
    status.innerText = "In ascolto";
    orb.classList.remove("connecting");
    orb.classList.add("listening");
  } catch (error) {
    console.error(error);
    alert("Errore generale: " + error.message);
    status.innerText = "Errore";
    orb.classList.remove("connecting");
  }
}

function stopCall() {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }

  if (dc) {
    dc.close();
  }

  if (pc) {
    pc.close();
  }

  pc = null;
  stream = null;
  dc = null;
  active = false;

  audio.srcObject = null;
  status.innerText = "Tocca la bolla";
  orb.classList.remove("connecting");
  orb.classList.remove("listening");
}
