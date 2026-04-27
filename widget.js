let pc, stream;

const btn = document.createElement("button");
btn.innerText = "🎙️ Parla con Palazzo Cusani";
btn.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);padding:22px 28px;border-radius:999px;background:#111;color:#fff;font-size:16px;border:0;cursor:pointer;";
document.body.appendChild(btn);

btn.onclick = async () => {
  try {
    btn.innerText = "Connessione...";

    const tokenRes = await fetch("/api/session", { method: "POST" });
    const data = await tokenRes.json();

    if (!tokenRes.ok) throw new Error(JSON.stringify(data));

    const token = data.client_secret.value;

    pc = new RTCPeerConnection();

    const audio = document.createElement("audio");
    audio.autoplay = true;
    document.body.appendChild(audio);

    pc.ontrack = (e) => {
      audio.srcObject = e.streams[0];
    };

    const dc = pc.createDataChannel("oai-events");

    dc.onopen = () => {
      dc.send(JSON.stringify({
        type: "response.create",
        response: {
          instructions: "Saluta l’utente e chiedi come puoi aiutarlo con Palazzo Cusani."
        }
      }));
    };

    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    pc.addTrack(stream.getTracks()[0]);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const sdpRes = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/sdp"
      },
      body: offer.sdp
    });

    if (!sdpRes.ok) throw new Error(await sdpRes.text());

    const answer = await sdpRes.text();
    await pc.setRemoteDescription({ type: "answer", sdp: answer });

    btn.innerText = "🎙️ In ascolto...";
  } catch (e) {
    console.error(e);
    btn.innerText = "Errore";
    alert(e.message);
  }
};
