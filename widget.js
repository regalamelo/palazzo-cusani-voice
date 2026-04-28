let pc;
let stream;
let dc;
let isActive = false;

const style = document.createElement("style");
style.innerHTML = `
  #voiceOrb {
    position: fixed;
    top: 50%;
    left: 50%;
    width: 96px;
    height: 96px;
    transform: translate(-50%, -50%);
    border-radius: 999px;
    border: none;
    cursor: pointer;
    z-index: 9999;
    background: radial-gradient(circle at 30% 25%, #ffffff, #d8c7ae 28%, #8b7358 58%, #111 100%);
    box-shadow:
      0 0 0 0 rgba(139, 115, 88, 0.45),
      0 24px 70px rgba(0, 0, 0, 0.28);
    transition: transform 0.25s ease, box-shadow 0.25s ease, opacity 0.25s ease;
  }

  #voiceOrb:hover {
    transform: translate(-50%, -50%) scale(1.05);
  }

  #voiceOrb.listening {
    animation: voicePulse 1.4s infinite ease-in-out;
  }

  #voiceOrb.connecting {
    opacity: 0.65;
    animation: voiceSpin 1.2s infinite linear;
  }

  @keyframes voicePulse {
    0% {
      box-shadow:
        0 0 0 0 rgba(139, 115, 88, 0.48),
        0 24px 70px rgba(0, 0, 0, 0.28);
    }
    70% {
      box-shadow:
        0 0 0 28px rgba(139, 115, 88, 0),
        0 24px 70px rgba(0, 0, 0, 0.28);
    }
    100% {
      box-shadow:
        0 0 0 0 rgba(139, 115, 88, 0),
        0 24px 70px rgba(0, 0, 0, 0.28);
    }
  }

  @keyframes voiceSpin {
    from {
      filter: hue-rotate(0deg);
    }
    to {
      filter: hue-rotate(360deg);
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

    const tokenRes = await fetch("/api/session", { method: "POST" });
    const data = await tokenRes.json();

    const clientSecret = data.value;

    if (!clientSecret) {
      alert("Errore API session: " + JSON.stringify(data));
      btn.classList.remove("connecting");
      return;
    }

    pc = new RTCPeerConnection();

    pc.ontrack = async (event) => {
      audio.srcObject = event.streams[0];
      try {
        await audio.play();
      } catch (e) {
        console.log("Audio play bloccato:", e);
      }
    };

    pc.addTransceiver("audio", { direction: "recvonly" });

    dc = pc.createDataChannel("oai-events");

    dc.onopen = () => {
      dc.send(JSON.stringify({
        type: "response.create",
        response: {
          modalities: ["audio"],
          instructions: "Saluta subito l’utente in italiano. Di': Benvenuto a Palazzo Cusani, sono il tuo assistente vocale. Posso aiutarti con prenotazioni, orari, eventi e informazioni sul palazzo."
        }
      }));
    };

    stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const sdpRes = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clientSecret}`,
        "Content-Type": "application/sdp"
      },
      body: offer.sdp
    });

    if (!sdpRes.ok) {
      const errorText = await sdpRes.text();
      alert("Errore realtime: " + errorText);
      btn.classList.remove("connecting");
      return;
    }

    const answer = await sdpRes.text();

    await pc.setRemoteDescription({
      type: "answer",
      sdp: answer
    });

    isActive = true;
    btn.classList.remove("connecting");
    btn.classList.add("listening");
  } catch (error) {
    console.error(error);
    alert("Errore: " + error.message);
    btn.classList.remove("connecting");
  }
}

function stopCall() {
  if (stream) stream.getTracks().forEach(track => track.stop());
  if (dc) dc.close();
  if (pc) pc.close();

  stream = null;
  dc = null;
  pc = null;
  isActive = false;

  btn.classList.remove("connecting");
  btn.classList.remove("listening");
}
