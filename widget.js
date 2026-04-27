let pc;
let stream;

const btn = document.createElement("button");

btn.innerText = "🎙️ Parla con Palazzo Cusani";
btn.style.position = "fixed";
btn.style.top = "50%";
btn.style.left = "50%";
btn.style.transform = "translate(-50%, -50%)";
btn.style.padding = "20px";
btn.style.borderRadius = "50px";
btn.style.background = "#000";
btn.style.color = "#fff";

document.body.appendChild(btn);

btn.onclick = async () => {
  try {
    btn.innerText = "Connessione...";

    pc = new RTCPeerConnection();

    const audio = document.createElement("audio");
    audio.autoplay = true;
    document.body.appendChild(audio);

    pc.ontrack = (event) => {
      audio.srcObject = event.streams[0];
    };

    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const sdpRes = await fetch("/api/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/sdp"
      },
      body: offer.sdp
    });

    const answer = await sdpRes.text();

    await pc.setRemoteDescription({
      type: "answer",
      sdp: answer
    });

    btn.innerText = "🎙️ In ascolto...";
  } catch (e) {
    console.error(e);
    btn.innerText = "Errore";
  }
};
