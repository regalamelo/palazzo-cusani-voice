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
btn.style.filter = "blur(0px)";
btn.style.cursor = "pointer";
btn.style.zIndex = "9999";
btn.style.transition = "all 0.3s ease";

document.body.appendChild(btn);

function animate(active) {
  if (active) {
    btn.style.animation = "pulse 1.2s infinite";
  } else {
    btn.style.animation = "none";
  }
}

const style = document.createElement("style");
style.innerHTML = `
@keyframes pulse {
  0% { transform: translate(-50%, -50%) scale(1); }
  50% { transform: translate(-50%, -50%) scale(1.15); }
  100% { transform: translate(-50%, -50%) scale(1); }
}`;
document.head.appendChild(style);

btn.onclick = async () => {
  if (isActive) {
    // STOP
    pc?.close();
    stream?.getTracks().forEach(t => t.stop());
    isActive = false;
    animate(false);
    return;
  }

  try {
    animate(true);

    const tokenRes = await fetch("/api/session", {
      method: "POST"
    });

    const data = await tokenRes.json();

    const clientSecret = data.value;

    pc = new RTCPeerConnection();

    const audio = document.createElement("audio");
    audio.autoplay = true;
    document.body.appendChild(audio);

    pc.ontrack = (event) => {
      audio.srcObject = event.streams[0];
    };

    const dc = pc.createDataChannel("oai-events");

    // ✅ QUI LA FIX
    dc.onopen = () => {
      dc.send(JSON.stringify({
        type: "response.create"
      }));
    };

    stream = await navigator.mediaDevices.getUserMedia({
      audio: true
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

    const answer = await sdpRes.text();

    await pc.setRemoteDescription({
      type: "answer",
      sdp: answer
    });

    isActive = true;

  } catch (err) {
    console.error(err);
    alert("Errore: " + err.message);
    animate(false);
  }
};
