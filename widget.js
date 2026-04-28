let pc;
let stream;
let audio;
let eventsChannel;
let silenceTimer;
let isActive = false;
let greeted = false;
let callTranscriptSent = false;

const PALAZZO_WHATSAPP = "393336523536";
const GENERAL_EMAIL = "palazzocusani@allegroitalia.it";
const PARKING_EMAIL = "segreteriacircolo@cmemi.esercito.difesa.it";

const SCRIPT_URL = document.currentScript?.src || window.location.href;
const BASE_URL = new URL("./", SCRIPT_URL);
const SESSION_URL = new URL("api/session", BASE_URL).toString();
const LEAD_URL = new URL("api/lead", BASE_URL).toString();
const BUTTON_IMAGE_URL = new URL("adriana-voice.svg?v=2", BASE_URL).toString();

const notes = [];
const lead = {
  name: "",
  phone: "",
  email: "",
  day: "",
  meal: "",
  time: "",
  people: "",
  occasion: "",
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

const whatsapp = createAction("Invia richiesta su WhatsApp", "pc-voice-whatsapp");
whatsapp.href = "#";
whatsapp.target = "_blank";
whatsapp.rel = "noopener";
whatsapp.addEventListener("click", openWhatsAppWithLatestMessage);
actions.appendChild(whatsapp);

const generalEmail = createAction(GENERAL_EMAIL, "pc-voice-email");
actions.appendChild(generalEmail);

const parkingEmail = createAction(PARKING_EMAIL, "pc-voice-email");
parkingEmail.href =
  "mailto:" +
  PARKING_EMAIL +
  "?subject=Richiesta%20parcheggio%20Palazzo%20Cusani";
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
    width: min(430px, calc(100vw - 24px));
    height: min(455px, calc(100vw + 1px));
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
    width: min(430px, calc(100vw - 24px));
    height: min(430px, calc(100vw - 24px));
    transform: translateX(-50%);
    background-size: contain;
    background-position: center;
    background-repeat: no-repeat;
    filter: drop-shadow(0 16px 30px rgba(92, 130, 245, 0.26));
  }

  .pc-voice-button-label {
    position: absolute;
    left: 50%;
    bottom: 8px;
    transform: translateX(-50%);
    min-width: 150px;
    padding: 8px 14px;
    color: #172033;
    background: rgba(255, 255, 255, 0.94);
    border: 1px solid rgba(23, 32, 51, 0.12);
    border-radius: 999px;
    box-shadow: 0 8px 22px rgba(23, 32, 51, 0.12);
    font-size: 13px;
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

function createAction(text, className) {
  const action = document.createElement("a");
  action.innerText = text;
  action.className = `pc-voice-action ${className}`;
  action.style.display = "none";
  return action;
}

function showStatus(message) {
  statusText.innerText = message;
  statusText.style.display = "block";
}

function hideStatus() {
  statusText.style.display = "none";
}

function hideActionButtons() {
  whatsapp.style.display = "none";
  generalEmail.style.display = "none";
  parkingEmail.style.display = "none";
}

function resetLeadState() {
  notes.length = 0;
  callTranscriptSent = false;

  Object.assign(lead, {
    name: "",
    phone: "",
    email: "",
    day: "",
    meal: "",
    time: "",
    people: "",
    occasion: "",
    intent: "",
  });

  hideActionButtons();
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
  clearSilenceTimer();
  sendCallTranscript();
  pc?.close();
  stream?.getTracks().forEach((track) => track.stop());
  audio?.remove();
  pc = null;
  stream = null;
  audio = null;
  eventsChannel = null;
  greeted = false;
  setActive(false);
  updateContactButtons();
}

function resetSilenceTimer() {
  clearSilenceTimer();
  silenceTimer = setTimeout(() => {
    if (isActive) {
      showStatus("Chiamata chiusa per inattivita");
      stopCall();
    }
  }, 20000);
}

function clearSilenceTimer() {
  if (silenceTimer) {
    clearTimeout(silenceTimer);
    silenceTimer = null;
  }
}

function rememberUserText(text) {
  const cleaned = cleanText(text);
  if (!cleaned || notes.includes(cleaned)) return;

  notes.push(cleaned);
  resetSilenceTimer();
  updateLeadFromText(cleaned);
  updateContactButtons();
}

function updateLeadFromText(text) {
  const normalized = text.toLowerCase();
  const hasEventIntent = textLooksLikeEventRequest(text);
  const hasBookingIntent = textLooksLikeBookingRequest(text);

  if (hasEventIntent && !normalized.includes("tavolo")) {
    lead.intent = "evento";
  } else if (hasBookingIntent) {
    lead.intent = "prenotazione";
  } else if (hasEventIntent) {
    lead.intent = "evento";
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

  const capturedName = getNameFromText(text);
  if (capturedName) {
    lead.name = capturedName;
  } else if (!lead.name && looksLikeNameAnswer(text)) {
    lead.name = cleanCapturedValue(text);
  }

  const people = getPeopleFromText(text);
  if (people) {
    lead.people = people;
  }

  if (normalized.includes("pranzo") || normalized.includes("a pranzo")) {
    lead.meal = "pranzo";
  }

  if (
    normalized.includes("cena") ||
    normalized.includes("a cena") ||
    normalized.includes("sera") ||
    normalized.includes("stasera")
  ) {
    lead.meal = "cena";
  }

  const occasionMatch = text.match(/\b(cresima|battesimo|compleanno|laurea|comunione|anniversario|matrimonio|meeting|festa|aziendale|conviviale|ricorrenza)\b/i);
  if (occasionMatch && lead.intent !== "prenotazione") {
    lead.occasion = occasionMatch[1];
  }

  const time = getTimeFromText(text);
  if (time) {
    lead.time = time;

    const hour = Number(time.split(":")[0]);
    if (!lead.meal && hour >= 11 && hour <= 16) lead.meal = "pranzo";
    if (!lead.meal && hour >= 18 && hour <= 23) lead.meal = "cena";
  }

  const date = getDateFromText(text);
  if (date) {
    lead.day = date;
  }
}

function getNameFromText(text) {
  const patterns = [
    /\b(?:mi chiamo|io sono|sono|yo soy|soy)\s+([a-zA-ZÀ-ÿ' ]{2,40})/i,
    /\b(?:il\s+|la\s+|el\s+)?nome\s+(?:e|è|di)\s+([a-zA-ZÀ-ÿ' ]{2,40})/i,
    /\ba nome di\s+([a-zA-ZÀ-ÿ' ]{2,40})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;

    const name = cleanCapturedValue(match[1]);
    if (looksLikeNameAnswer(name)) {
      return name;
    }
  }

  return "";
}

function getPeopleFromText(text) {
  const trimmed = text.trim();
  const numberMatch =
    text.match(/\b(\d{1,3})\s*(?:persone|ospiti|coperti)\b/i) ||
    text.match(/\b(?:per|siamo|saremo|in)\s+(\d{1,3})\b/i);

  if (numberMatch) {
    return numberMatch[1];
  }

  if (/^\d{1,3}$/.test(trimmed) && lead.intent && (lead.day || lead.meal || lead.time || lead.occasion)) {
    return trimmed;
  }

  const spokenPeople = parsePeopleFromText(text);
  return spokenPeople ? String(spokenPeople) : "";
}

function getTimeFromText(text) {
  const normalized = text.toLowerCase();
  const numeric = text.match(/\b(?:alle|ore)\s*([01]?\d|2[0-3])[:., ]?([0-5]\d)?\b/i);

  if (numeric) {
    return formatTimeValue(numeric[1], numeric[2]);
  }

  if (!/\b(alle|ore|orario|pranzo|cena|sera)\b/.test(normalized)) {
    return "";
  }

  const numberWords = {
    una: 1,
    uno: 1,
    due: 2,
    tre: 3,
    quattro: 4,
    cinque: 5,
    sei: 6,
    sette: 7,
    otto: 8,
    nove: 9,
    dieci: 10,
    undici: 11,
    dodici: 12,
    tredici: 13,
    quattordici: 14,
    quindici: 15,
    sedici: 16,
    diciassette: 17,
    diciotto: 18,
    diciannove: 19,
    venti: 20,
    ventuno: 21,
    ventidue: 22,
    ventitre: 23,
    ventitré: 23,
  };

  const words = Object.keys(numberWords).join("|");
  const match = normalized.match(new RegExp(`\\b(?:alle|ore)?\\s*(${words})\\b`, "i"));

  return match ? formatTimeValue(numberWords[match[1].toLowerCase()]) : "";
}

function getDateFromText(text) {
  const datePatterns = [
    /\b(oggi|domani|dopodomani|stasera|questa sera)\b/i,
    /\b(lunedi|lunedì|martedi|martedì|mercoledi|mercoledì|giovedi|giovedì|venerdi|venerdì|sabato|domenica)\b/i,
    /\b(\d{1,2}\s+(?:gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre))\b/i,
    /\b(\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)\b/i,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }

  return "";
}

function cleanText(value) {
  return value.replace(/\s+/g, " ").trim();
}

function cleanCapturedValue(value) {
  return cleanText(value)
    .replace(/\b(?:e|il mio|la mia|telefono|whatsapp|cellulare|per|vorrei|prenotare|prenotale).*$/i, "")
    .replace(/^(?:il|la|el)\s+/i, "")
    .replace(/[.,;:!?]+$/g, "")
    .trim();
}

function formatTimeValue(hour, minutes = "00") {
  return `${String(Number(hour)).padStart(2, "0")}:${minutes || "00"}`;
}

function looksLikeNameAnswer(text) {
  const normalized = text.toLowerCase().trim();
  if (!/^[a-zA-ZÀ-ÿ' ]{4,50}$/.test(text.trim())) return false;
  if (normalized.split(/\s+/).length > 4) return false;

  return ![
    "prenot",
    "tavolo",
    "evento",
    "mail",
    "email",
    "whatsapp",
    "telefono",
    "domani",
    "oggi",
    "pranzo",
    "cena",
    "persone",
    "numero",
    "quante",
  ].some((word) => normalized.includes(word));
}

function parsePeopleFromText(text) {
  const normalized = text.toLowerCase();
  const numberWords = {
    uno: 1,
    una: 1,
    due: 2,
    tre: 3,
    quattro: 4,
    cinque: 5,
    sei: 6,
    sette: 7,
    otto: 8,
    nove: 9,
    dieci: 10,
    undici: 11,
    dodici: 12,
    tredici: 13,
    quattordici: 14,
    quindici: 15,
    sedici: 16,
    diciassette: 17,
    diciotto: 18,
    diciannove: 19,
    venti: 20,
  };

  const words = Object.keys(numberWords).join("|");
  const match =
    normalized.match(new RegExp(`\\b(${words})\\s+(?:persone|ospiti|coperti)\\b`, "i")) ||
    normalized.match(new RegExp(`\\b(?:per|siamo|saremo|in)\\s+(${words})\\b`, "i"));

  return match ? numberWords[match[1].toLowerCase()] : "";
}

function getPublicSummary() {
  return [
    `Tipo richiesta: ${lead.intent || "richiesta"}`,
    lead.occasion ? `Occasione: ${lead.occasion}` : "",
    lead.name ? `Nome: ${lead.name}` : "",
    lead.phone ? `Contatto WhatsApp/telefono: ${lead.phone}` : "",
    lead.email ? `Email cliente: ${lead.email}` : "",
    lead.day ? `Giorno/data: ${lead.day}` : "",
    lead.meal ? `Pranzo/cena: ${lead.meal}` : "",
    lead.time ? `Ora: ${lead.time}` : "",
    lead.people ? `Persone: ${lead.people}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function getWhatsappSummary() {
  return [
    `Richiesta: ${lead.intent === "evento" ? "evento / ricorrenza" : "prenotazione tavolo"}`,
    lead.occasion ? `Occasione: ${lead.occasion}` : "",
    lead.day ? `Data: ${lead.day}` : "",
    lead.meal ? `Servizio: ${lead.meal}` : "",
    lead.time ? `Orario: ${lead.time}` : "",
    lead.people ? `Persone: ${lead.people}` : "",
    lead.name ? `Nome: ${lead.name}` : "",
    getMissingWhatsappFields(),
  ]
    .filter(Boolean)
    .join("\n");
}

function getMissingWhatsappFields() {
  const missing = [];

  if (!lead.name) missing.push("nome");
  if (!lead.day) missing.push("data/giorno");
  if (lead.intent === "prenotazione" && !lead.meal) missing.push("pranzo o cena");
  if (lead.intent === "prenotazione" && !lead.time) missing.push("orario");
  if (!lead.people) missing.push("numero persone");
  if (lead.intent === "evento" && !lead.occasion) missing.push("tipo occasione");

  return missing.length ? `Da confermare: ${missing.join(", ")}` : "";
}

function getInternalSummary() {
  const transcript = notes.map((note) => `- ${note}`).join("\n");

  return [
    "Nuova richiesta dal voice agent Palazzo Cusani",
    "",
    `Obiettivo: ${lead.intent || "non rilevato"}`,
    `Nome: ${lead.name || "non rilevato"}`,
    `WhatsApp/telefono cliente: ${lead.phone || "non rilevato"}`,
    `Email cliente: ${lead.email || "non rilevato"}`,
    `Giorno: ${lead.day || "non rilevato"}`,
    `Pranzo/cena: ${lead.meal || "non rilevato"}`,
    `Ora: ${lead.time || "non rilevato"}`,
    `Persone: ${lead.people || "non rilevato"}`,
    `Occasione/evento: ${lead.occasion || "non rilevato"}`,
    "",
    "Trascrizione:",
    transcript || "non disponibile",
  ].join("\n");
}

function canShowContactButtons() {
  if (lead.intent === "prenotazione") {
    return Boolean(lead.day && (lead.meal || lead.time) && lead.people);
  }

  if (lead.intent === "evento") {
    const details = [lead.occasion, lead.day, lead.people, lead.name].filter(Boolean).length;
    return details >= 3;
  }

  return false;
}

function updateWhatsAppButton() {
  if (!canShowContactButtons()) {
    whatsapp.style.display = "none";
    return;
  }

  whatsapp.href = buildWhatsAppUrl();
  whatsapp.innerText = "Invia richiesta su WhatsApp";
  whatsapp.style.display = "block";
}

function openWhatsAppWithLatestMessage(event) {
  event.preventDefault();
  if (!canShowContactButtons()) return;
  window.open(buildWhatsAppUrl(), "_blank", "noopener");
}

function buildWhatsAppUrl() {
  const message = [
    "Buongiorno,",
    getWhatsappSummary(),
    "",
    "Resto in attesa di conferma. Grazie.",
  ]
    .filter(Boolean)
    .join("\n");

  return `https://wa.me/${PALAZZO_WHATSAPP}?text=${encodeURIComponent(message)}`;
}

function updateEmailButtons() {
  const subject =
    lead.intent === "evento"
      ? "Richiesta evento Palazzo Cusani"
      : "Richiesta informazioni Palazzo Cusani";

  generalEmail.href =
    "mailto:" +
    GENERAL_EMAIL +
    "?subject=" +
    encodeURIComponent(subject) +
    "&body=" +
    encodeURIComponent(getPublicSummary());
}

function updateContactButtons() {
  updateWhatsAppButton();
  updateEmailButtons();

  if (lead.intent === "evento") {
    generalEmail.style.display = "block";
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
        summary: getInternalSummary(),
      }),
    });
  } catch (error) {
    console.warn("Call transcript email not sent", error);
    callTranscriptSent = false;
  }
}

function showGeneralEmail() {
  updateEmailButtons();
  generalEmail.style.display = "block";
}

function showParkingEmail() {
  parkingEmail.style.display = "block";
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
    normalized.includes("cresima") ||
    normalized.includes("battesimo") ||
    normalized.includes("compleanno") ||
    normalized.includes("ricorrenza") ||
    normalized.includes("anniversario") ||
    normalized.includes("matrimonio") ||
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

  if (event?.type?.includes("input_audio_transcription")) {
    collect(event.transcript);
  }

  if (event?.item?.role === "user") {
    collect(event.item);
  }

  if (event?.role === "user") {
    collect(event);
  }

  return textParts.join(" ");
}

function askAssistantToGreet() {
  if (!eventsChannel || greeted || eventsChannel.readyState !== "open") return;

  greeted = true;

  try {
    eventsChannel.send(
      JSON.stringify({
        type: "response.create",
        response: {
          instructions:
            "Presentati in modo naturale e brevissimo: 'Buongiorno, sono Adriana di Palazzo Cusani. Mi dica pure.' Poi fermati e ascolta.",
        },
      })
    );
  } catch (error) {
    console.warn("Greeting not sent", error);
  }
}

function handleRealtimeEvent(message) {
  let event;

  try {
    event = JSON.parse(message.data);
  } catch {
    return;
  }

  const text = getEventText(event);
  if (!text) return;

  rememberUserText(text);

  if (textLooksLikeEmailRequest(text)) {
    showGeneralEmail();
  }

  if (textLooksLikeParkingRequest(text)) {
    showParkingEmail();
  }
}

btn.onclick = async () => {
  if (isActive) {
    stopCall();
    return;
  }

  try {
    resetLeadState();
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
        resetSilenceTimer();
      }

      if (["failed", "disconnected", "closed"].includes(pc?.connectionState)) {
        stopCall();
      }
    };

    eventsChannel = pc.createDataChannel("oai-events");
    eventsChannel.addEventListener("open", askAssistantToGreet);
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
