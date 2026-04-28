let pc = null;
let stream = null;
let isActive = false;

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
    animation: blobMove 1.4s ease-in-out infinite alternate;
  }

  #voiceOrb.listening::before {
    animation: blobMove 2.2s ease-in-out infinite alternate, activePulse 1.4s ease-in-out infinite;
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

const btn = document.createElement("button");
btn.id = "voiceOrb";
btn.setAttribute("aria-label", "Avvia o termina assistente vocale");
document.body.appendChild(btn);

const audio = document.createElement("audio");
audio.autoplay = true;
audio.playsInline = true;
document.body.appendChild(audio);

btn.onclick = async () => {
  if (isActive) {
    stopCall();
  } else {
    await startCall();
  }
};

async function startCall() {
  try {
    btn.classList.add("connecting");

    const tokenResponse = await fetch("/api/session", { method: "POST" });
    const data = await tokenResponse.json();

    const EPHEMERAL_KEY = data.value;

    if (!EPHEMERAL_KEY) {
      alert("Errore token OpenAI: " + JSON.stringify(data));
      btn.classList.remove("connecting");
      return;
    }

    pc = new RTCPeerConnection();

    pc.ontrack = (event) => {
      audio.srcObject = event.streams[0];
      audio.play().catch(() => {});
    };

    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    pc.addTrack(stream.getTracks()[0]);

    const dc = pc.createDataChannel("oai-events");

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${EPHEMERAL_KEY}`,
        "Content-Type": "application/sdp"
      }
    });

    if (!sdpResponse.ok) {
      alert("Errore Realtime: " + await sdpResponse.text());
      btn.classList.remove("connecting");
      return;
    }

    const answer = {
      type: "answer",
      sdp: await sdpResponse.text()
    };

    await pc.setRemoteDescription(answer);

    isActive = true;
    btn.classList.remove("connecting");
    btn.classList.add("listening");

  } catch (error) {
    console.error(error);
    alert("Errore generale: " + error.message);
    btn.classList.remove("connecting");
  }
}

function stopCall() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }

  if (pc) {
    pc.close();
  }

  pc = null;
  stream = null;
  isActive = false;

  audio.srcObject = null;
  btn.classList.remove("connecting");
  btn.classList.remove("listening");
}
