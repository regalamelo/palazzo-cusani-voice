let pc;
let stream;
let dc;

const btn = document.createElement("button");
btn.innerText = "🎙️ Parla con Palazzo Cusani";
btn.style.cssText = `
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 22px 28px;
  border-radius: 999px;
  background: #111;
  color: #fff;
  font-size: 16px;
  border: 0;
  cursor: pointer;
  z-index: 9999;
`;

const stopBtn = document.createElement("button");
stopBtn.innerText = "Termina";
stopBtn.style.cssText = `
  position: fixed;
  top: calc(50% + 70px);
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 20px;
  border-radius: 999px;
  background: #ddd;
  color: #111;
  font-size: 14px;
  border: 0;
  cursor: pointer;
  z-index: 9999;
  display: none;
`;

document.body.appendChild(btn);
document.body.appendChild(stopBtn);

const audio = document.createElement("audio");
audio.autoplay = true;
audio.playsInline = true;
document.body.appendChild(audio);

btn.onclick = async () => {
  try {
    btn.innerText = "Connessione...";

    const tokenRes = await fetch("/api/session", { method: "POST" });
    const data = await tokenRes.json();

    const clientSecret = data.value;

    if (!clientSecret) {
      alert("Errore API session: " + JSON.stringify(data));
      btn.innerText = "Errore API";
      return;
    }

    pc = new RTCPeerConnection();

    pc.ontrack = async (event) => {
      audio.srcObject = event.streams[0];
      try {
        await audio.play();
      } catch (e) {
        console.log("Autoplay bloccato:", e);
      }
    };

    dc = pc.createDataChannel("oai-events");

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
      btn.innerText = "Errore Realtime";
      return;
    }

    const answer = await sdpRes.text();

    await pc.setRemoteDescription({
      type: "answer",
      sdp: answer
    });

    btn.innerText = "🎙️ In ascolto...";
    stopBtn.style.display = "block";

    setTimeout(() => {
      if (dc && dc.readyState === "open") {
        dc.send(JSON.stringify({
          type: "response.create",
          response: {
            modalities: ["audio"],
            instructions: "Saluta l’utente in italiano con tono elegante e professionale. Presentati come assistente vocale di Palazzo Cusani e chiedi come puoi aiutare."
          }
        }));
      }
    }, 1200);

  } catch (error) {
    console.error(error);
    alert("Errore: " + error.message);
    btn.innerText = "Errore";
  }
};

stopBtn.onclick = () => {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }

  if (dc) {
    dc.close();
  }

  if (pc) {
    pc.close();
  }

  stream = null;
  dc = null;
  pc = null;

  btn.innerText = "🎙️ Parla con Palazzo Cusani";
  stopBtn.style.display = "none";
};
