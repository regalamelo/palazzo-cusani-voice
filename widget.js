let pc;
let stream;
let isActive = false;

const btn = document.createElement("div");
btn.style.position = "fixed";
btn.style.top = "50%";
btn.style.left = "50%";
btn.style.transform = "translate(-50%, -50%)";
btn.style.width = "120px";
btn.style.height = "120px";
btn.style.borderRadius = "50%";
btn.style.background = "radial-gradient(circle at 30% 30%, #7cf, #0af, #90f)";
btn.style.cursor = "pointer";
btn.style.zIndex = "9999";
document.body.appendChild(btn);

const whatsapp = document.createElement("a");
whatsapp.href = "https://wa.me/393336523536?text=Buongiorno,%20vorrei%20prenotare%20o%20ricevere%20informazioni%20su%20Palazzo%20Cusani.";
whatsapp.target = "_blank";
whatsapp.innerText = "WhatsApp";
whatsapp.style.position = "fixed";
whatsapp.style.top = "calc(50% + 95px)";
whatsapp.style.left = "50%";
whatsapp.style.transform = "translateX(-50%)";
whatsapp.style.padding = "12px 22px";
whatsapp.style.borderRadius = "999px";
whatsapp.style.background = "#25D366";
whatsapp.style.color = "#fff";
whatsapp.style.textDecoration = "none";
whatsapp.style.fontFamily = "Arial, sans-serif";
whatsapp.style.fontSize = "14px";
whatsapp.style.zIndex = "9999";
whatsapp.style.display = "none";
document.body.appendChild(whatsapp);

const style = document.createElement("style");
style.innerHTML = `
@keyframes pulse {
  0% { transform: translate(-50%, -50%) scale(1); }
  50% { transform: translate(-50%, -50%) scale(1.15); }
  100% { transform: translate(-50%, -50%) scale(1); }
}`;
document.head.appendChild(style);

function animate(active) {
  btn.style.animation = active ? "pulse 1.2s infinite" : "none";
}

btn.onclick = async () => {
  if (isActive) {
    pc?.close();
    stream?.getTracks().forEach(t => t.stop());
    isActive = false;
    animate(false);
    whatsapp.style.display = "none";
    return;
  }

  try {
    animate(true);

    const tokenRes = await fetch("/api/session", { method: "POST" });
    const data = await tokenRes.json();
    const clientSecret = data.value;

    pc = new RTCPeerConnection();

    const audio = document.createElement("audio");
    audio.autoplay = true;
    audio.playsInline = true;
    document.body.appendChild(audio);

    pc.ontrack = (event) => {
      audio.srcObject = event.streams[0];
    };

    pc.createDataChannel("oai-events");

    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const sdpRes = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${clientSecret}`,
        "Content-Type": "application/sdp"
      },
      body: offer.sdp
    });

    if (!sdpRes.ok) {
      alert("Errore Realtime: " + await sdpRes.text());
      animate(false);
      return;
    }

    const answer = await sdpRes.text();

    await pc.setRemoteDescription({
      type: "answer",
      sdp: answer
    });

    isActive = true;
    whatsapp.style.display = "block";

  } catch (err) {
    console.error(err);
    alert("Errore: " + err.message);
    animate(false);
  }
};
