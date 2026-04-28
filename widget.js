let pc;
let stream;
let audio;
let isActive = false;

const PHONE_NUMBER = "393336523536";
const EMAIL_ADDRESS = "segreteriacircolo@cmemi.esercito.difesa.it";

const SCRIPT_URL = document.currentScript?.src || window.location.href;
const BASE_URL = new URL("./", SCRIPT_URL);
const SESSION_URL = new URL("api/session", BASE_URL).toString();
const BUTTON_IMAGE_URL = new URL("adriana-voice.svg", BASE_URL).toString();

const widget = document.createElement("div");
widget.className = "pc-voice-widget";
document.body.appendChild(widget);

const btn = document.createElement("button");
btn.className = "pc-voice-button";
btn.type = "button";
btn.setAttribute("aria-label", "Clicca per chiamare Adriana");
widget.appendChild(btn);

const visual = document.createElement("span");
visual.className = "pc-voice-button-visual";
visual.style.backgroundImage = `url("${BUTTON_IMAGE_URL}")`;
btn.appendChild(visual);

const label = document.createElement("span");
label.className = "pc-voice-button-label";
label.innerText = "clicca per chiamare";
btn.appendChild(label);

const statusText = document.createElement("div");
statusText.className = "pc-voice-status";
statusText.innerText = "Adriana di Palazzo Cusani";
widget.appendChild(statusText);

const actions = document.createElement("div");
actions.className = "pc-voice-actions";
widget.appendChild(actions);

const whatsapp = document.createElement("a");
whatsapp.href =
  "https://wa.me/" +
  PHONE_NUMBER +
  "?text=Buongiorno,%20vorrei%20prenotare%20o%20ricevere%20informazioni%20su%20Palazzo%20Cusani.";
whatsapp.target = "_blank";
whatsapp.rel = "noopener";
whatsapp.innerText = "WhatsApp";
whatsapp.className = "pc-voice-action pc-voice-whatsapp";
whatsapp.style.display = "none";
actions.appendChild(whatsapp);

const email = document.createElement("a");
email.href =
  "mailto:" +
  EMAIL_ADDRESS +
  "?subject=Richiesta%20informazioni%20Palazzo%20Cusani";
email.innerText = EMAIL_ADDRESS;
email.className = "pc-voice-action pc-voice-email";
email.style.display = "none";
actions.appendChild(email);

const style = document.createElement("style");
style.innerHTML = `
  .pc-voice-widget {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 9999;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    font-family: Arial, sans-serif;
  }

  .pc-voice-button {
    position: relative;
    width: 132px;
    height: 132px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    cursor: pointer;
    background: #fff;
    overflow: hidden;
    box-shadow: 0 18px 45px rgba(30, 18, 60, 0.28);
  }

  .pc-voice-button-visual {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
  }

  .pc-voice-button-label {
    position: absolute;
    left: 50%;
    bottom: 16px;
    transform: translateX(-50%);
    width: 96px;
    color: #ffffff;
    font-size: 11px;
    font-weight: 700;
    line-height: 1.15;
    text-align: center;
    text-shadow: 0 1px 7px rgba(0, 0, 0, 0.45);
    pointer-events: none;
  }

  .pc-voice-status {
    max-width: 240px;
    padding: 7px 12px;
    color: #2d2438;
    background: rgba(255, 255, 255, 0.94);
    border: 1px solid rgba(30, 18, 60, 0.12);
    border-radius: 999px;
    box-shadow: 0 8px 24px rgba(30, 18, 60, 0.12);
    font-size: 12px;
    text-align: center;
  }

  .pc-voice-actions {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .pc-voice-action {
    max-width: min(310px, calc(100vw - 32px));
    padding: 12px 18px;
    border-radius: 999px;
    color: #fff;
    text-decoration: none;
    font-size: 14px;
    font-weight: 700;
    text-align: center;
    box-shadow: 0 10px 26px rgba(0, 0, 0, 0.16);
  }

  .pc-voice-whatsapp {
    background: #25D366;
  }

  .pc-voice-email {
    background: #1f5f8f;
  }

  .pc-voice-widget.is-active .pc-voice-button {
    animation: pcVoicePulse 1.2s infinite;
  }

  @keyframes pcVoicePulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.12); }
    100% { transform: scale(1); }
  }
`;
document.head.appendChild(style);

function showWhatsApp() {
  whatsapp.style.display = "block";
}

function showEmail() {
  email.style.display = "block";
}

function hideButtons() {
  whatsapp.style.display = "none";
  email.style.display = "none";
}

function setActive(active) {
  isActive = active;
  widget.classList.toggle("is-active", active);
  label.innerText = active ? "clicca per chiudere" : "clicca per chiamare";
  statusText.innerText = active ? "In ascolto..." : "Adriana di Palazzo Cusani";
}

function stopCall() {
  pc?.close();
  stream?.getTracks().forEach((track) => track.stop());
  audio?.remove();

  pc = null;
  stream = null;
  audio = null;

  setActive(false);
  hideButtons();
}

function checkTextForButtons(text) {
  const t = text.toLowerCase();

  if (
    t.includes("email") ||
    t.includes("e-mail") ||
    t.includes("mail") ||
    t.includes("indirizzo di posta")
  ) {
    showEmail();
  }

  if (
    t.includes("prenot") ||
    t.includes("whatsapp") ||
    t.includes("telefono") ||
    t.includes("contatt")
  ) {
    showWhatsApp();
  }
}

function handleRealtimeEvent(message) {
  try {
    const event = JSON.parse(message.data);
    checkTextForButtons(JSON.stringify(event));
  } catch {
    // Ignora eventi non leggibili.
  }
}

btn.onclick = async () => {
  if (isActive) {
    stopCall();
    return;
  }

  try {
    widget.classList.add("is-active");
    statusText.innerText = "Richiesta microfono...";

    const tokenRes = await fetch(SESSION_URL, { method: "POST" });
    const data = await tokenRes.json();

    if (!tokenRes.ok) {
      throw new Error(data.error || "Errore nella creazione della sessione");
    }

    const clientSecret = data.value || data.client_secret?.value;

    if (!clientSecret) {
      throw new Error("Client secret non ricevuto da OpenAI");
    }

    pc = new RTCPeerConnection();

    audio = document.createElement("audio");
    audio.autoplay = true;
    audio.playsInline = true;
    document.body.appendChild(audio);

    pc.ontrack = (event) => {
      audio.srcObject = event.streams[0];
    };

    pc.onconnectionstatechange = () => {
      if (pc?.connectionState === "connected") {
        setActive(true);
        showWhatsApp();
      }

      if (["failed", "disconnected", "closed"].includes(pc?.connectionState)) {
        stopCall();
      }
    };

    const eventsChannel = pc.createDataChannel("oai-events");
    eventsChannel.addEventListener("message", handleRealtimeEvent);

    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    statusText.innerText = "Connessione ad Adriana...";

    const sdpRes = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clientSecret}`,
        "Content-Type": "application/sdp",
      },
      body: offer.sdp,
    });

    if (!sdpRes.ok) {
      throw new Error(await sdpRes.text());
    }

    const answer = await sdpRes.text();

    await pc.setRemoteDescription({
      type: "answer",
      sdp: answer,
    });
  } catch (err) {
    console.error(err);
    alert("Errore: " + err.message);
    stopCall();
  }
};
