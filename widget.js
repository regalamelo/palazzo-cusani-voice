let pc;
let stream;

const btn = document.createElement("button");

btn.innerText = "🎙️ Parla con Palazzo Cusani";
btn.style.position = "fixed";
btn.style.top = "50%";
btn.style.left = "50%";
btn.style.transform = "translate(-50%, -50%)";
btn.style.padding = "22px 28px";
btn.style.borderRadius = "999px";
btn.style.background = "#111";
btn.style.color = "#fff";
btn.style.fontSize = "16px";
btn.style.border = "0";
btn.style.cursor = "pointer";
btn.style.zIndex = "9999";

document.body.appendChild(btn);

btn.onclick = async () => {
  try {
    btn.innerText = "Connessione...";

    const tokenRes = await fetch("/api/session", {
      method: "POST"
    });

    const data = await tokenRes.json();

    console.log("RISPOSTA API SESSION:", data);

    if (!data.client_secret || !data.client_secret.value) {
      alert("Errore API session: " + JSON.stringify(data));
      btn.innerText = "Errore API";
      return;
    }

    const clientSecret = data.client_secret.value;

    pc = new RTCPeerConnection();

    const audio = document.createElement("audio");
    audio.autoplay = true;
    document.body.appendChild(audio);

    pc.ontrack = (event) => {
      audio.srcObject = event.streams[0];
    };

    const dc = pc.createDataChannel("oai-events");

    dc.onopen = () => {
      dc.send(JSON.stringify({
        type: "response.create",
        response: {
          instructions: "Saluta l’utente in italiano con tono elegante e chiedi come puoi aiutarlo con Palazzo Cusani."
        }
      }));
    };

    stream = await navigator.mediaDevices.getUserMedia({
      audio: true
    });

    stream.getTracks().forEach((track) => {
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
      const errorText = await sdpRes.text();
      alert("Errore connessione realtime: " + errorText);
      btn.innerText = "Errore Realtime";
      return;
    }

    const answer = await sdpRes.text();

    await pc.setRemoteDescription({
      type: "answer",
      sdp: answer
    });

    btn.innerText = "🎙️ In ascolto...";
  } catch (error) {
    console.error(error);
    alert("Errore generale: " + error.message);
    btn.innerText = "Errore";
  }
};
