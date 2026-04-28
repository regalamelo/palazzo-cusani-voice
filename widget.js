let pc;
let stream;
let audio;
let isActive = false;

const PHONE_NUMBER = "393336523536";
const GENERAL_EMAIL = "palazzocusani@allegroitalia.it";
const PARKING_EMAIL = "segreteriacircolo@cmemi.esercito.difesa.it";

const SCRIPT_URL = document.currentScript?.src || window.location.href;
const BASE_URL = new URL("./", SCRIPT_URL);
const SESSION_URL = new URL("api/session", BASE_URL).toString();
const LEAD_URL = new URL("api/lead", BASE_URL).toString();
const BUTTON_IMAGE_URL = new URL("adriana-voice.svg", BASE_URL).toString();

const notes = [];
const contacts = {
  emails: new Set(),
  phones: new Set(),
  names: new Set(),
};
let latestSummary = "";

const widget = document.createElement("div");
widget.className = "pc-voice-widget";
document.body.appendChild(widget);

const btn = document.createElement("button");
btn.className = "pc-voice-button";
btn.type = "button";
btn.setAttribute("aria-label", "Clicca per parlare");
widget.appendChild(btn);

const visual = document.createElement("span");
visual.className = "pc-voice-button-visual";
visual.style.backgroundImage = `url("${BUTTON_IMAGE_URL}")`;
btn.appendChild(visual);

const label = document.createElement("span");
label.className = "pc-voice-button-label";
label.innerText = "clicca per parlare";
btn.appendChild(label);

const statusText = document.createElement("div");
statusText.className = "pc-voice-status";
statusText.style.display = "none";
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

const generalEmail = document.createElement("a");
generalEmail.href =
  "mailto:" +
  GENERAL_EMAIL +
  "?subject=Richiesta%20informazioni%20Palazzo%20Cusani";
generalEmail.innerText = GENERAL_EMAIL;
generalEmail.className = "pc-voice-action pc-voice-email";
generalEmail.style.display = "none";
actions.appendChild(generalEmail);

const parkingEmail = document.createElement("a");
parkingEmail.href =
  "mailto:" +
  PARKING_EMAIL +
  "?subject=Richiesta%20parcheggio%20Palazzo%20Cusani";
parkingEmail.innerText = PARKING_EMAIL;
parkingEmail.className = "pc-voice-action pc-voice-email";
parkingEmail.style.display = "none";
actions.appendChild(parkingEmail);

const recap = document.createElement("details");
recap.className = "pc-voice-recap";
recap.style.display = "none";
recap.innerHTML = `
  <summary>Riepilogo richiesta</summary>
  <div class="pc-voice-recap-body" data-recap-body></div>
  <button class="pc-voice-action pc-voice-email pc-voice-send" data-recap-email type="button">
    Invia richiesta via email
  </button>
`;
actions.appendChild(recap);

const recapBody = recap.querySelector("[data-recap-body]");
const recapEmail = recap.querySelector("[data-recap-email]");

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
    gap: 10px;
    font-family: Arial, sans-serif;
  }

  .pc-voice-button {
    position: relative;
    width: 156px;
    height: 170px;
    padding: 0;
    border: 0;
    cursor: pointer;
    color: #172033;
    background: transparent;
  }

  .pc-voice-button-visual {
    position: absolute;
    left: 50%;
    top: 0;
    width: 150px;
    height: 150px;
    transform: translateX(-50%);
    background-size: contain;
    background-position: center;
    background-repeat: no-repeat;
    filter: drop-shadow(0 16px 30px rgba(92, 130, 245, 0.26));
  }

  .pc-voice-button-label {
    position: absolute;
    left: 50%;
    bottom: 0;
    transform: translateX(-50%);
    min-width: 126px;
    padding: 6px 10px;
    color: #172033;
    background: rgba(255, 255, 255, 0.94);
    border: 1px solid rgba(23, 32, 51, 0.12);
    border-radius: 999px;
    box-shadow: 0 8px 22px rgba(23, 32, 51, 0.12);
    font-size: 12px;
    font-weight: 700;
    line-height: 1.15;
    text-align: center;
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
    max-width: min(340px, calc(100vw - 32px));
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

  .pc-voice-recap {
    width: min(340px, calc(100vw - 32px));
    color: #182236;
    background: rgba(255, 255, 255, 0.96);
    border: 1px solid rgba(24, 34, 54, 0.14);
    border-radius: 8px;
    box-shadow: 0 12px 32px rgba(24, 34, 54, 0.16);
    font-size: 13px;
  }

  .pc-voice-recap summary {
    cursor: pointer;
    padding: 11px 14px;
    font-weight: 700;
  }

  .pc-voice-recap-body {
    padding: 0 14px 12px;
    line-height: 1.45;
    white-space: pre-wrap;
  }

  .pc-voice-recap .pc-voice-action {
    display: block;
    margin: 0 12px 12px;
    border: 0;
    cursor: pointer;
    font-family: inherit;
  }

  .pc-voice-widget.is-active .pc-voice-button-visual {
    animation: pcVoiceFloat 1.4s ease-in-out infinite;
  }

  @keyframes pcVoiceFloat {
    0% { transform: translateX(-50%) scale(1); }
    50% { transform: translateX(-50%) scale(1.08); }
    100% { transform: translateX(-50%) scale(1); }
  }
`;
document.head.appendChild(style);

function showStatus(message) {
  statusText.innerText = message;
  statusText.style.display = "block";
}

function hideStatus() {
  statusText.style.display = "none";
}

function showWhatsApp() {
  whatsapp.style.display = "block";
}

function showGeneralEmail() {
  generalEmail.style.display = "block";
}

function showParkingEmail() {
  parkingEmail.style.display = "block";
}

function hideActionButtons() {
  whatsapp.style.display = "none";
  generalEmail.style.display = "none";
  parkingEmail.style.display = "none";
  recap.style.display = "none";
}

function setActive(active) {
  isActive = active;
  widget.classList.toggle("is-active", active);
  label.innerText = active ? "clicca per chiudere" : "clicca per parlare";
  btn.setAttribute("aria-label", active ? "Clicca per chiudere" : "Clicca per parlare");

  if (!active) {
    hideStatus();
  }
}

function stopCall() {
  pc?.close();
  stream?.getTracks().forEach((track) => track.stop());
  audio?.remove();
  pc = null;
  stream = null;
  audio = null;
  setActive(false);
  hideActionButtons();
}

function rememberUserText(text) {
  const cleaned = text.trim();
  if (!cleaned || notes.includes(cleaned)) return;

  notes.push(cleaned);

  const emailMatches = cleaned.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
  emailMatches.forEach((item) => contacts.emails.add(item));

  const phoneMatches = cleaned.match(/(?:\+?\d[\s.-]?){7,}/g) || [];
  phoneMatches.forEach((item) => contacts.phones.add(item.trim()));

  const nameMatch = cleaned.match(/\b(?:mi chiamo|sono)\s+([a-zA-ZÀ-ÿ' ]{2,40})/i);
  if (nameMatch?.[1]) {
    contacts.names.add(nameMatch[1].trim());
  }

  updateRecap();
}

function updateRecap() {
  if (!notes.length) return;

  const names = Array.from(contacts.names).join(", ") || "non rilevato";
  const phones = Array.from(contacts.phones).join(", ") || "non rilevato";
  const emails = Array.from(contacts.emails).join(", ") || "non rilevato";
  const transcript = notes.map((note) => `- ${note}`).join("\n");
  const body =
    `Nome: ${names}\nTelefono: ${phones}\nEmail: ${emails}\n\nRichiesta:\n${transcript}`;

  latestSummary = body;
  recapBody.textContent = body;
  recap.style.display = "block";
}

async function sendSummaryByEmail() {
  if (!latestSummary) {
    alert("Non c'e ancora un riepilogo da inviare.");
    return;
  }

  recapEmail.disabled = true;
  recapEmail.innerText = "Invio in corso...";

  try {
    const response = await fetch(LEAD_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: latestSummary,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Invio non riuscito");
    }

    recapEmail.innerText = "Richiesta inviata";
  } catch (error) {
    alert("Errore invio email: " + error.message);
    recapEmail.innerText = "Invia richiesta via email";
  } finally {
    recapEmail.disabled = false;
  }
}

recapEmail.addEventListener("click", sendSummaryByEmail);

function textLooksLikeEmailRequest(text) {
  const normalized = text.toLowerCase();
  return (
    normalized.includes("email") ||
    normalized.includes("e-mail") ||
    normalized.includes("mail") ||
    normalized.includes("indirizzo di posta") ||
    normalized.includes("contatto email")
  );
}

function textLooksLikeParkingRequest(text) {
  const normalized = text.toLowerCase();
  return normalized.includes("parcheggio") || normalized.includes("parcheggiare");
}

function textLooksLikeBookingRequest(text) {
  const normalized = text.toLowerCase();
  return (
    normalized.includes("prenot") ||
    normalized.includes("whatsapp") ||
    normalized.includes("telefono") ||
    normalized.includes("contatt")
  );
}

function getEventText(event) {
  if (event?.type?.includes("input_audio_transcription") && event.transcript) {
    rememberUserText(event.transcript);
    return event.transcript;
  }

  const textParts = [];

  function collect(value) {
    if (!value) return;

    if (typeof value === "string") {
      textParts.push(value);
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(collect);
      return;
    }

    if (typeof value === "object") {
      collect(value.transcript);
      collect(value.text);
      collect(value.output_text);
      collect(value.content);
      collect(value.part);
      collect(value.item);
    }
  }

  collect(event);
  return textParts.join(" ");
}

function handleRealtimeEvent(message) {
  let event;

  try {
    event = JSON.parse(message.data);
  } catch {
    return;
  }

  const text = getEventText(event);

  if (textLooksLikeEmailRequest(text)) {
    showGeneralEmail();
  }

  if (textLooksLikeParkingRequest(text)) {
    showParkingEmail();
  }

  if (textLooksLikeBookingRequest(text)) {
    showWhatsApp();
  }
}

btn.onclick = async () => {
  if (isActive) {
    stopCall();
    return;
  }

  try {
    widget.classList.add("is-active");
    showStatus("Richiesta microfono...");

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
        hideStatus();
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

    showStatus("Connessione...");

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
