let pc;
let stream;
let audio;
let isActive = false;
let leadSent = false;
let callTranscriptSent = false;

const PALAZZO_WHATSAPP = "393336523536";
const GENERAL_EMAIL = "palazzocusani@allegroitalia.it";
const PARKING_EMAIL = "segreteriacircolo@cmemi.esercito.difesa.it";

const SCRIPT_URL = document.currentScript?.src || window.location.href;
const BASE_URL = new URL("./", SCRIPT_URL);
const SESSION_URL = new URL("api/session", BASE_URL).toString();
const LEAD_URL = new URL("api/lead", BASE_URL).toString();
const BUTTON_IMAGE_URL = new URL("adriana-voice.svg", BASE_URL).toString();

const notes = [];
const lead = {
  name: "",
  phone: "",
  email: "",
  day: "",
  time: "",
  people: "",
  intent: "",
};

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
whatsapp.target = "_blank";
whatsapp.rel = "noopener";
whatsapp.innerText = "Conferma su WhatsApp";
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
    max-width: 260px;
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
  sendCallTranscript();
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
  updateLeadFromText(cleaned);
  updateWhatsAppButton();
  maybeSendLead();
}

function updateLeadFromText(text) {
  const normalized = text.toLowerCase();

  if (textLooksLikeBookingRequest(text)) {
    lead.intent = "prenotazione";
  } else if (!lead.intent && normalized.length > 8) {
    lead.intent = "informazioni";
  }

  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (emailMatch) {
    lead.email = emailMatch[0];
  }

  const phoneMatch = text.match(/(?:\+?\d[\s.-]?){8,}/);
  if (phoneMatch) {
    lead.phone = phoneMatch[0].trim();
  }

  const nameMatch = text.match(/\b(?:mi chiamo|sono|nome e)\s+([a-zA-ZÀ-ÿ' ]{2,40})/i);
  if (nameMatch?.[1]) {
    lead.name = cleanCapturedValue(nameMatch[1]);
  }

  const peopleMatch = text.match(/\b(\d{1,3})\s*(?:persone|ospiti|coperti)\b/i);
  if (peopleMatch) {
    lead.people = peopleMatch[1];
  }

  const timeMatch = text.match(/\b(?:alle|ore)?\s*([01]?\d|2[0-3])[:., ]?([0-5]\d)?\b/i);
  if (timeMatch && normalized.match(/\b(alle|ore|orario|pranzo|cena|sera|mezzogiorno)\b/)) {
    lead.time = timeMatch[2] ? `${timeMatch[1]}:${timeMatch[2]}` : timeMatch[1];
  }

  const datePatterns = [
    /\b(oggi|domani|dopodomani|stasera|questa sera|a pranzo|a cena)\b/i,
    /\b(lunedi|martedi|mercoledi|giovedi|venerdi|sabato|domenica)\b/i,
    /\b(\d{1,2}\s+(?:gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre))\b/i,
    /\b(\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)\b/i,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      lead.day = match[1];
      break;
    }
  }
}

function cleanCapturedValue(value) {
  return value
    .replace(/\b(?:e|il mio|la mia|telefono|whatsapp|per|vorrei|prenotare).*$/i, "")
    .trim();
}

function getLeadSummary() {
  const transcript = notes.map((note) => `- ${note}`).join("\n");

  return [
    "Nuova richiesta dal voice agent Palazzo Cusani",
    "",
    `Obiettivo: ${lead.intent || "non rilevato"}`,
    `Nome: ${lead.name || "non rilevato"}`,
    `WhatsApp/telefono cliente: ${lead.phone || "non rilevato"}`,
    `Email cliente: ${lead.email || "non rilevato"}`,
    `Giorno: ${lead.day || "non rilevato"}`,
    `Ora: ${lead.time || "non rilevato"}`,
    `Persone: ${lead.people || "non rilevato"}`,
    "",
    "Trascrizione:",
    transcript || "non disponibile",
  ].join("\n");
}

function hasBookingDetails() {
  return lead.intent === "prenotazione" && lead.day && lead.time;
}

function updateWhatsAppButton() {
  if (!hasBookingDetails()) return;

  const message = [
    "Buongiorno, vorrei confermare questa richiesta per Palazzo Cusani:",
    lead.name ? `Nome: ${lead.name}` : "",
    lead.phone ? `Contatto WhatsApp/telefono: ${lead.phone}` : "",
    `Giorno: ${lead.day}`,
    `Ora: ${lead.time}`,
    lead.people ? `Persone: ${lead.people}` : "",
    "",
    "Resto in attesa di conferma. Grazie.",
  ]
    .filter(Boolean)
    .join("\n");

  whatsapp.href = `https://wa.me/${PALAZZO_WHATSAPP}?text=${encodeURIComponent(message)}`;
  whatsapp.style.display = "block";
}

async function maybeSendLead() {
  if (leadSent || !hasBookingDetails()) return;

  leadSent = true;

  try {
    await fetch(LEAD_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: getLeadSummary(),
      }),
    });
  } catch (error) {
    console.warn("Lead email not sent", error);
    leadSent = false;
  }
}

async function sendCallTranscript() {
  if (callTranscriptSent || !notes.length) return;

  callTranscriptSent = true;

  try {
    await fetch(LEAD_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: getLeadSummary(),
      }),
    });
  } catch (error) {
    console.warn("Call transcript email not sent", error);
    callTranscriptSent = false;
  }
}

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
    normalized.includes("riserv") ||
    normalized.includes("tavolo") ||
    normalized.includes("pranzo") ||
    normalized.includes("cena")
  );
}

function textLooksLikeEventRequest(text) {
  const normalized = text.toLowerCase();
  return (
    normalized.includes("evento") ||
    normalized.includes("eventi") ||
    normalized.includes("meeting") ||
    normalized.includes("festa") ||
    normalized.includes("laurea") ||
    normalized.includes("comunione") ||
    normalized.includes("aziendale") ||
    normalized.includes("conviviale") ||
    normalized.includes("occasione") ||
    normalized.includes("salone") ||
    normalized.includes("sala")
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

  if (textLooksLikeEventRequest(text)) {
    showGeneralEmail();
    whatsapp.href =
      `https://wa.me/${PALAZZO_WHATSAPP}?text=` +
      encodeURIComponent("Buongiorno, vorrei ricevere informazioni per organizzare un evento o un'occasione a Palazzo Cusani.");
    whatsapp.style.display = "block";
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
