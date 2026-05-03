let pc;
let stream;
let outputAudio;
let eventsChannel;
let silenceTimer;
let idleTimer;
let responseResetTimer;
let isConnecting = false;
let isActive = false;
let privacyAccepted = false;
let greetingSent = false;
let idlePromptSent = false;
let awaitingNameAnswer = false;
let responseInProgress = false;
let transcriptSent = false;
let whatsappForcedVisible = false;
let lastResponseKey = "";
let lastResponseAt = 0;
let lastClarificationAt = 0;

const PALAZZO_WHATSAPP = "393336523536";
const GENERAL_EMAIL = "palazzocusani@allegroitalia.it";
const PARKING_EMAIL = "segreteriacircolo@cmemi.esercito.difesa.it";
const AMBIENCE_ENABLED = false;

const SCRIPT_URL = document.currentScript?.src || window.location.href;
const BASE_URL = new URL("./", SCRIPT_URL);
const SESSION_URL = new URL("api/session", BASE_URL).toString();
const LEAD_URL = new URL("api/lead", BASE_URL).toString();
const BUTTON_IMAGE_URL = new URL("adriana-voice2.gif?v=3", BASE_URL).toString();

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

const privacyBox = document.createElement("div");
privacyBox.className = "pc-voice-privacy";
privacyBox.style.display = "none";
privacyBox.innerHTML = `
  <div class="pc-voice-privacy-title">Prima di iniziare</div>
  <label class="pc-voice-privacy-row">
    <input type="checkbox" class="pc-voice-privacy-check" />
    <span>Ho letto l'informativa privacy, autorizzo il trattamento di voce, trascrizione e dati forniti, e dichiaro di avere almeno 18 anni.</span>
  </label>
  <button type="button" class="pc-voice-privacy-start">Avvia assistente</button>
`;
widget.appendChild(privacyBox);

const privacyCheck = privacyBox.querySelector(".pc-voice-privacy-check");
const privacyStart = privacyBox.querySelector(".pc-voice-privacy-start");

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

const defenseEmail = createAction(PARKING_EMAIL, "pc-voice-email");
defenseEmail.href = `mailto:${PARKING_EMAIL}?subject=Richiesta%20Palazzo%20Cusani`;
actions.appendChild(defenseEmail);

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
    width: min(420px, calc(100vw - 24px));
    height: min(465px, calc(100vw + 21px));
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
    width: min(420px, calc(100vw - 24px));
    height: min(420px, calc(100vw - 24px));
    transform: translateX(-50%);
    background-size: contain;
    background-position: center;
    background-repeat: no-repeat;
  }

  .pc-voice-button-label,
  .pc-voice-status {
    color: #172033;
    background: rgba(255, 255, 255, 0.94);
    border: 1px solid rgba(23, 32, 51, 0.12);
    border-radius: 999px;
    box-shadow: 0 8px 22px rgba(23, 32, 51, 0.12);
    font-weight: 700;
    text-align: center;
  }

  .pc-voice-button-label {
    position: absolute;
    left: 50%;
    bottom: 8px;
    transform: translateX(-50%);
    min-width: 150px;
    padding: 8px 14px;
    font-size: 13px;
    line-height: 1.15;
    pointer-events: none;
  }

  .pc-voice-status {
    max-width: 270px;
    padding: 7px 12px;
    font-size: 12px;
  }

  .pc-voice-privacy {
    max-width: min(360px, calc(100vw - 32px));
    padding: 14px;
    color: #172033;
    background: rgba(255, 255, 255, 0.98);
    border: 1px solid rgba(23, 32, 51, 0.12);
    border-radius: 12px;
    box-shadow: 0 14px 38px rgba(23, 32, 51, 0.16);
    font-size: 12px;
    line-height: 1.35;
  }

  .pc-voice-privacy-title {
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 700;
  }

  .pc-voice-privacy-row {
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }

  .pc-voice-privacy-check { margin-top: 2px; }

  .pc-voice-privacy-start {
    width: 100%;
    margin-top: 12px;
    padding: 10px 14px;
    border: 0;
    border-radius: 999px;
    color: #fff;
    background: #172033;
    cursor: pointer;
    font-size: 13px;
    font-weight: 700;
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

  .pc-voice-whatsapp { background: #25d366; }
  .pc-voice-email { background: #1f5f8f; }

  .pc-voice-widget.is-active .pc-voice-button-visual {
    animation: pcVoiceFloat 2.4s ease-in-out infinite;
  }

  @keyframes pcVoiceFloat {
    0% { transform: translateX(-50%) scale(1); }
    50% { transform: translateX(-50%) scale(1.035); }
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

function hideActions() {
  whatsapp.style.display = "none";
  generalEmail.style.display = "none";
  defenseEmail.style.display = "none";
}

function resetLead() {
  notes.length = 0;
  transcriptSent = false;
  whatsappForcedVisible = false;
  awaitingNameAnswer = false;
  lastClarificationAt = 0;
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
  hideActions();
}

function setActive(active) {
  isActive = active;
  widget.classList.toggle("is-active", active);
  label.innerText = active ? "clicca per chiudere" : "clicca per parlare";
  btn.setAttribute("aria-label", active ? "Clicca per chiudere" : "Clicca per parlare");
  if (!active) hideStatus();
}

function stopCall() {
  isConnecting = false;
  clearTimeout(silenceTimer);
  clearTimeout(idleTimer);
  clearTimeout(responseResetTimer);
  sendCallTranscript();
  pc?.close();
  stream?.getTracks().forEach((track) => track.stop());
  outputAudio?.remove();
  pc = null;
  stream = null;
  outputAudio = null;
  eventsChannel = null;
  responseInProgress = false;
  greetingSent = false;
  idlePromptSent = false;
  setActive(false);

  if (hasCommercialIntent()) {
    forceWhatsAppButton();
  } else {
    updateContactButtons();
  }
}

function resetSilenceTimer() {
  clearTimeout(silenceTimer);
  silenceTimer = setTimeout(() => {
    if (isActive) {
      showStatus("Chiamata chiusa per inattivita");
      stopCall();
    }
  }, 25000);
}

function scheduleIdlePrompt() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (!isActive || idlePromptSent || notes.length) return;
    idlePromptSent = true;
    requestAssistantPrompt("Di solo questa frase, una volta: 'Pronto, c'e ancora?' Poi fermati e ascolta.", "idle");
  }, 9000);
}

function markResponse(key) {
  lastResponseKey = key;
  lastResponseAt = Date.now();
  responseInProgress = true;
  clearTimeout(responseResetTimer);
  responseResetTimer = setTimeout(() => {
    responseInProgress = false;
    responseResetTimer = null;
  }, 3500);
}

function requestAssistantPrompt(instructions, key) {
  if (!eventsChannel || eventsChannel.readyState !== "open") return false;
  if (responseInProgress) return false;
  if (key === lastResponseKey && Date.now() - lastResponseAt < 3500) return false;

  markResponse(key);

  try {
    eventsChannel.send(JSON.stringify({
      type: "response.create",
      response: { instructions },
    }));
    return true;
  } catch (error) {
    responseInProgress = false;
    console.warn("Assistant prompt not sent", error);
    return false;
  }
}

function requestAssistantResponse(text) {
  const key = cleanText(text);
  if (!eventsChannel || eventsChannel.readyState !== "open") return;
  if (!textLooksMeaningful(key)) return;
  if (responseInProgress) return;
  if (key === lastResponseKey && Date.now() - lastResponseAt < 3500) return;
  if (Date.now() - lastResponseAt < 500) return;

  markResponse(key);

  try {
    eventsChannel.send(JSON.stringify({
      type: "response.create",
      response: {
        instructions:
          `L'utente ha detto esattamente: "${key}". Rispondi solo a questa frase. ` +
          "Non assumere che voglia prenotare se non lo dice chiaramente. " +
          "Se dice prenotare o prenotazione senza dire foresteria, camere, alloggio o pernottamento, considera sempre tavolo o evento. " +
          "Non nominare la segreteria del circolo per prenotazioni tavolo, pranzo, cena o eventi. " +
          "La mail della segreteria del circolo vale solo per parcheggio o foresteria/camere/alloggio/pernottamento. " +
          "Usa solo la base conoscenza: non inventare email, reparti, disponibilita, parcheggi, costi o ricevimento. " +
          "Se non sai un dettaglio, di' che non lo hai qui e che puo inviare la richiesta dal bottone WhatsApp gia compilato. " +
          "Se chiede parcheggio, di' solo che e gestito dalla segreteria del circolo e che deve mandare una mail alla segreteria. " +
          "Se dice 'pronto', 'ci sei' o 'mi senti', rispondi solo: 'Si, ci sono.' " +
          "Se ha appena detto solo il nome, rispondi solo: 'Mi dica pure.' " +
          "Se non hai sentito o la frase e poco chiara, rispondi solo: 'Non ho sentito bene, puo ripetere?' " +
          "Se saluta soltanto, rispondi solo: 'Mi dica pure.'",
      },
    }));
  } catch (error) {
    responseInProgress = false;
    console.warn("Assistant response not sent", error);
  }
}

function maybeSendGreeting() {
  if (greetingSent || !isActive || !eventsChannel || eventsChannel.readyState !== "open") return;
  greetingSent = true;
  awaitingNameAnswer = true;
  requestAssistantPrompt("Di solo questa frase: 'Sono Adriana di Palazzo Cusani. Come posso chiamarla?' Poi fermati e ascolta.", "greeting");
  scheduleIdlePrompt();
}

function handleRealtimeEvent(message) {
  let event;

  try {
    event = JSON.parse(message.data);
  } catch {
    return;
  }

  handleAssistantLifecycle(event);
  if (!eventHasFinalUserTranscript(event)) return;

  const text = getEventText(event);
  if (!textLooksMeaningful(text)) {
    maybeAskToRepeat(text);
    return;
  }

  clearTimeout(idleTimer);

  if (textLooksLikePresenceCheck(text)) {
    resetSilenceTimer();
    requestAssistantPrompt("Di solo questa frase: 'Si, ci sono.' Poi fermati e ascolta.", "presence");
    return;
  }

  rememberUserText(text);

  if (textLooksLikeEmailRequest(text)) showGeneralEmail();
  if (textLooksLikeParkingRequest(text)) showDefenseEmail("parcheggio");
  if (textLooksLikeForesteriaRequest(text)) showDefenseEmail("foresteria");

  requestAssistantResponse(text);
}

function handleAssistantLifecycle(event) {
  const type = event?.type || "";
  if (
    type.includes("response.done") ||
    type.includes("response.audio.done") ||
    type.includes("output_audio_buffer.stopped")
  ) {
    responseInProgress = false;
    clearTimeout(responseResetTimer);
  }
}

function eventHasFinalUserTranscript(event) {
  const type = event?.type || "";
  return (
    type.includes("input_audio_transcription.completed") ||
    type.includes("conversation.item.input_audio_transcription.completed")
  );
}

function getEventText(event) {
  const parts = [
    event?.transcript,
    event?.text,
    event?.item?.transcript,
    event?.item?.formatted?.transcript,
  ];

  collectContent(event?.content, parts);
  collectContent(event?.item?.content, parts);
  return cleanText(parts.join(" "));
}

function collectContent(value, parts) {
  if (!value) return;
  if (typeof value === "string") {
    parts.push(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectContent(item, parts));
    return;
  }
  if (typeof value === "object") {
    collectContent(value.transcript, parts);
    collectContent(value.text, parts);
  }
}

function rememberUserText(text) {
  const cleaned = cleanText(text);
  if (!textLooksMeaningful(cleaned) || notes.includes(cleaned)) return;

  notes.push(cleaned);
  resetSilenceTimer();
  updateLeadFromText(cleaned);
  if (shouldOfferWhatsAppForInfo(cleaned)) whatsappForcedVisible = true;
  updateContactButtons();
}

function updateLeadFromText(text) {
  const normalized = text.toLowerCase();
  const foresteria = textLooksLikeForesteriaRequest(text);
  const parking = textLooksLikeParkingRequest(text);

  if (foresteria) {
    lead.intent = "foresteria";
  } else if (parking && !lead.intent) {
    lead.intent = "informazioni";
  } else if (textLooksLikeEventRequest(text) && !normalized.includes("tavolo")) {
    lead.intent = "evento";
  } else if (textLooksLikeBookingRequest(text)) {
    lead.intent = "prenotazione";
  } else if (!lead.intent && normalized.length > 8 && !looksLikeNameAnswer(text) && !textLooksLikeCapabilityQuestion(text)) {
    lead.intent = "informazioni";
  }

  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (email) lead.email = email[0];

  const phone = text.match(/(?:\+?\d[\s.-]?){8,}/);
  if (phone) lead.phone = phone[0].trim();

  const explicitName = getExplicitName(text);
  if (explicitName) {
    lead.name = explicitName;
    awaitingNameAnswer = false;
  } else if (!lead.name && awaitingNameAnswer && looksLikeNameAnswer(text) && !textLooksLikeAdditionalNote(text)) {
    lead.name = cleanCapturedValue(text);
    awaitingNameAnswer = false;
  } else if (!lead.name && lead.intent && looksLikeNameAnswer(text) && !textLooksLikeAdditionalNote(text)) {
    lead.name = cleanCapturedValue(text);
  }

  if (awaitingNameAnswer && !looksLikeNameAnswer(text)) awaitingNameAnswer = false;

  const people = getPeopleFromText(text);
  if (people) lead.people = people;

  if (/\b(pranzo|a pranzo)\b/i.test(text)) lead.meal = "pranzo";
  if (/\b(cena|a cena|sera|stasera)\b/i.test(text)) lead.meal = "cena";

  const occasion = text.match(/\b(cresima|battesimo|compleanno|laurea|comunione|anniversario|matrimonio|meeting|festa|aziendale|conviviale|ricorrenza)\b/i);
  if (occasion && lead.intent !== "prenotazione") lead.occasion = occasion[1];
  if (lead.intent === "evento" && !lead.occasion) lead.occasion = getGenericEventOccasion(text);

  const time = getTimeFromText(text);
  if (time) lead.time = time;

  const date = getDateFromText(text);
  if (date) lead.day = date;
}

function getExplicitName(text) {
  const patterns = [
    /\b(?:mi chiamo|io sono|sono|a nome di)\s+([a-zA-ZÀ-ÿ' ]{2,50})/i,
    /\b(?:il mio nome e|il mio nome è|nome e|nome è)\s+([a-zA-ZÀ-ÿ' ]{2,50})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;
    const name = cleanCapturedValue(match[1]);
    if (looksLikeNameAnswer(name)) return name;
  }

  return "";
}

function getPeopleFromText(text) {
  const trimmed = text.trim();
  const numeric =
    text.match(/\b(\d{1,3})\s*(?:persone|ospiti|coperti|invitati|partecipanti|commensali)\b/i) ||
    text.match(/\b(?:per|siamo|saremo|in|circa)\s+(\d{1,3})\b/i);
  if (numeric) return numeric[1];
  if (/^\d{1,3}$/.test(trimmed) && lead.intent) return trimmed;

  const words = {
    uno: 1, una: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7,
    otto: 8, nove: 9, dieci: 10, undici: 11, dodici: 12, tredici: 13,
    quattordici: 14, quindici: 15, sedici: 16, diciassette: 17, diciotto: 18,
    diciannove: 19, venti: 20, trenta: 30, trentina: 30, quaranta: 40,
    cinquanta: 50, sessanta: 60, settanta: 70, ottanta: 80, novanta: 90, cento: 100,
  };
  const wordList = Object.keys(words).join("|");
  const match =
    text.toLowerCase().match(new RegExp(`\\b(${wordList})\\s+(?:persone|ospiti|coperti|invitati|partecipanti|commensali)\\b`, "i")) ||
    text.toLowerCase().match(new RegExp(`\\b(?:per|siamo|saremo|in)\\s+(${wordList})\\b`, "i"));
  return match ? String(words[match[1].toLowerCase()]) : "";
}

function getTimeFromText(text) {
  const normalized = text.toLowerCase();
  const numeric = text.match(/\b(?:alle|ore)?\s*([01]?\d|2[0-3])[:., ]?([0-5]\d)?\b/i);
  if (!numeric || !/\b(alle|ore|orario|pranzo|cena|sera|stasera)\b/i.test(text)) return "";

  let hour = Number(numeric[1]);
  const minutes = numeric[2] || "00";
  if ((lead.meal === "cena" || /\b(cena|sera|stasera)\b/i.test(normalized)) && hour >= 1 && hour <= 11) hour += 12;
  if ((lead.meal === "pranzo" || /\bpranzo\b/i.test(normalized)) && hour >= 1 && hour <= 4) hour += 12;
  return `${String(hour).padStart(2, "0")}:${minutes}`;
}

function getDateFromText(text) {
  const patterns = [
    /\b(oggi|domani|dopodomani|stasera|questa sera)\b/i,
    /\b(lunedi|lunedì|martedi|martedì|mercoledi|mercoledì|giovedi|giovedì|venerdi|venerdì|sabato|domenica)\b/i,
    /\b(\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)\b/i,
    /\b(\d{1,2}\s+(?:gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre))\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return expandDate(match[1]);
  }

  return "";
}

function expandDate(value) {
  const cleaned = cleanText(value);
  const normalized = cleaned.toLowerCase().replace(/[ìí]/g, "i").replace(/[èé]/g, "e");
  if (normalized === "oggi" || normalized === "stasera" || normalized === "questa sera") return `${cleaned} ${formatDate(addDays(new Date(), 0))}`;
  if (normalized === "domani") return `${cleaned} ${formatDate(addDays(new Date(), 1))}`;
  if (normalized === "dopodomani") return `${cleaned} ${formatDate(addDays(new Date(), 2))}`;

  const weekdays = { domenica: 0, lunedi: 1, martedi: 2, mercoledi: 3, giovedi: 4, venerdi: 5, sabato: 6 };
  if (Object.prototype.hasOwnProperty.call(weekdays, normalized) && !/\d/.test(cleaned)) {
    return `${cleaned} ${formatDate(nextWeekday(weekdays[normalized]))}`;
  }

  return cleaned;
}

function nextWeekday(day) {
  const today = new Date();
  const result = new Date(today);
  let diff = (day - today.getDay() + 7) % 7;
  if (diff === 0) diff = 7;
  result.setDate(today.getDate() + diff);
  return result;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(date.getDate() + days);
  return result;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function getUsefulNotes() {
  return notes.filter(textLooksMeaningful);
}

function cleanCapturedValue(value) {
  return cleanText(value)
    .replace(/\b(?:e|per|vorrei|voglio|prenotare|prenotazione|tavolo|evento|siamo|saremo|alle|domani|oggi).*$/i, "")
    .replace(/[.,;:!?]+$/g, "")
    .trim();
}

function looksLikeNameAnswer(text) {
  const normalized = text.toLowerCase().trim();
  if (!/^[a-zA-ZÀ-ÿ' ]{4,50}$/.test(text.trim())) return false;
  if (normalized.split(/\s+/).length > 4) return false;
  return ![
    "prenot", "tavolo", "evento", "mail", "email", "whatsapp", "telefono", "domani", "oggi",
    "pranzo", "cena", "persone", "numero", "anche", "bambin", "bimb", "adult", "allerg",
    "seggiolone", "passeggino", "adriana", "palazzo", "cusani", "perfetto", "certamente",
    "informazioni", "parcheggio", "foresteria", "camera",
  ].some((word) => normalized.includes(word));
}

function maybeAskToRepeat(text) {
  const cleaned = cleanText(text).toLowerCase();
  if (!cleaned || containsUnsupportedScript(cleaned)) return;
  if (Date.now() - lastClarificationAt < 12000) return;
  lastClarificationAt = Date.now();
  requestAssistantPrompt("Di solo questa frase: 'Non ho sentito bene, puo ripetere?' Poi fermati e ascolta.", "clarify");
}

function textLooksMeaningful(text) {
  const cleaned = cleanText(text).toLowerCase();
  if (!cleaned) return false;
  if (containsUnsupportedScript(cleaned)) return false;
  if (!/[a-zA-ZÀ-ÿ0-9]/.test(cleaned)) return false;
  if (/^(eh|e|uh|um|mmm|mh|ah|oh)$/i.test(cleaned)) return false;
  if (/\b(silenzio|rumore|rumori|musica|sottofondo|incomprensibile|inaudible|noise)\b/i.test(cleaned)) return false;
  if (/\b(sono adriana|adriana di palazzo cusani|mi dica pure|pronto c'e ancora|pronto c'è ancora)\b/i.test(cleaned)) return false;
  return true;
}

function textLooksLikeGreetingOnly(text) {
  return /^(ciao|salve|buonasera|buongiorno|buongiorno adriana|ciao adriana)$/i.test(cleanText(text));
}

function textLooksLikePresenceCheck(text) {
  return /^(pronto|pronto\?|ci sei|ci siete|mi senti|mi sente|adriana ci sei|adriana mi senti)\??$/i.test(cleanText(text).toLowerCase());
}

function textLooksLikeCapabilityQuestion(text) {
  return /\b(di cosa ti occupi|cosa fai|cosa puoi fare|come funziona|chi sei)\b/i.test(cleanText(text).toLowerCase());
}

function containsUnsupportedScript(text) {
  return /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af\u0400-\u04ff]/.test(text);
}

function textLooksLikeAdditionalNote(text) {
  return /\b(anche|bambin\w*|bimb\w*|ragazz\w*|adult\w*|seggiolone|passeggino|allerg\w*|intoller\w*|celiac\w*|vegetarian\w*|vegan\w*|carrozzina|sedia a rotelle|torta|candeline|nota|note|aggiungo|in piu|in più)\b/i.test(text);
}

function getCustomerNotes() {
  return [...new Set(getUsefulNotes().filter(textLooksLikeAdditionalNote).map(cleanText))].join("; ");
}

function getGenericEventOccasion(text) {
  const normalized = text.toLowerCase();
  if (normalized.includes("preventivo")) return "richiesta preventivo";
  if (normalized.includes("evento")) return "evento";
  if (normalized.includes("ricorrenza")) return "ricorrenza";
  if (normalized.includes("cerimonia")) return "cerimonia";
  if (normalized.includes("sala") || normalized.includes("salone")) return "sala evento";
  if (normalized.includes("aziendale")) return "evento aziendale";
  return "";
}

function textLooksLikeBookingRequest(text) {
  const normalized = text.toLowerCase();
  if (textLooksLikeForesteriaRequest(text) || textLooksLikeParkingRequest(text)) return false;
  return ["prenot", "riserv", "tavolo", "disponibil", "vorrei venire", "posso venire", "posto"].some((word) => normalized.includes(word));
}

function textLooksLikeEventRequest(text) {
  const normalized = text.toLowerCase();
  return [
    "preventivo", "organizz", "cerimonia", "evento", "eventi", "cresima", "battesimo",
    "compleanno", "ricorrenza", "anniversario", "matrimonio", "meeting", "festa",
    "laurea", "comunione", "aziendale", "conviviale", "occasione", "salone", "sala",
  ].some((word) => normalized.includes(word));
}

function textLooksLikeEmailRequest(text) {
  const normalized = text.toLowerCase();
  return ["email", "e-mail", "mail", "indirizzo di posta", "contatto email"].some((word) => normalized.includes(word));
}

function textLooksLikeParkingRequest(text) {
  const normalized = text.toLowerCase();
  return normalized.includes("parcheggio") || normalized.includes("parcheggiare");
}

function textLooksLikeForesteriaRequest(text) {
  const normalized = text.toLowerCase();
  return ["foresteria", "camera", "camere", "alloggio", "alloggi", "dormire", "pernottare", "pernottamento", "soggiornare"].some((word) => normalized.includes(word));
}

function hasCommercialIntent() {
  return lead.intent === "prenotazione" || lead.intent === "evento" || getUsefulNotes().some((note) => textLooksLikeBookingRequest(note) || textLooksLikeEventRequest(note));
}

function canShowWhatsApp() {
  return whatsappForcedVisible || hasCommercialIntent() || Boolean(getInformationRequestText()) || getUsefulNotes().join(" ").toLowerCase().includes("whatsapp");
}

function updateContactButtons() {
  updateWhatsAppButton();
  updateEmailButtons();
  if (lead.intent === "evento") generalEmail.style.display = "block";
}

function forceWhatsAppButton() {
  whatsappForcedVisible = true;
  updateWhatsAppButton();
}

function updateWhatsAppButton() {
  if (!canShowWhatsApp()) {
    whatsapp.style.display = "none";
    return;
  }
  whatsapp.href = buildWhatsAppUrl();
  whatsapp.innerText = "Invia richiesta su WhatsApp";
  whatsapp.style.display = "block";
}

function updateEmailButtons() {
  const subject = lead.intent === "evento" ? "Richiesta preventivo evento Palazzo Cusani" : "Richiesta informazioni Palazzo Cusani";
  generalEmail.href = `mailto:${GENERAL_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(getContactRequestBody())}`;
}

function showGeneralEmail() {
  updateEmailButtons();
  generalEmail.style.display = "block";
}

function showDefenseEmail(topic = "Palazzo Cusani") {
  const subject = topic === "foresteria" ? "Richiesta foresteria Palazzo Cusani" : topic === "parcheggio" ? "Richiesta parcheggio Palazzo Cusani" : "Richiesta Palazzo Cusani";
  defenseEmail.href = `mailto:${PARKING_EMAIL}?subject=${encodeURIComponent(subject)}`;
  defenseEmail.style.display = "block";
}

function openWhatsAppWithLatestMessage(event) {
  event.preventDefault();
  if (!canShowWhatsApp()) return;
  window.open(buildWhatsAppUrl(), "_blank", "noopener");
}

function buildWhatsAppUrl() {
  return `https://wa.me/${PALAZZO_WHATSAPP}?text=${encodeURIComponent(getContactRequestBody())}`;
}

function getContactRequestBody() {
  getUsefulNotes().forEach(updateLeadFromText);
  return [
    "Buongiorno,",
    getWhatsappSummary(),
    "",
    "Invio questa richiesta per ricevere conferma definitiva. Grazie.",
  ].filter(Boolean).join("\n");
}

function getWhatsappSummary() {
  const requestLabel = lead.intent === "evento" ? "evento / ricorrenza" : lead.intent === "prenotazione" ? "prenotazione tavolo" : "richiesta informazioni";
  const customerNotes = getCustomerNotes();
  const informationRequest = getInformationRequestText();

  if (lead.intent !== "prenotazione" && lead.intent !== "evento" && informationRequest) {
    return [
      "Richiesta: richiesta informazioni",
      lead.name ? `Nome: ${lead.name}` : "",
      `Informazione richiesta: ${informationRequest}`,
    ].filter(Boolean).join("\n");
  }

  return [
    `Richiesta: ${requestLabel}`,
    lead.occasion ? `Occasione: ${lead.occasion}` : "",
    lead.day ? `Data: ${lead.day}` : "",
    lead.meal ? `Servizio: ${lead.meal}` : "",
    lead.time ? `Orario: ${lead.time}` : "",
    lead.people ? `Persone: ${lead.people}` : "",
    lead.name ? `Nome: ${lead.name}` : "",
    customerNotes ? `Note: ${customerNotes}` : "",
    getMissingFields(),
  ].filter(Boolean).join("\n");
}

function getMissingFields() {
  if (lead.intent !== "prenotazione" && lead.intent !== "evento") return "";
  const missing = [];
  if (!lead.name) missing.push("nome");
  if (!lead.day) missing.push("data/giorno");
  if (lead.intent === "prenotazione" && !lead.meal) missing.push("pranzo o cena");
  if (lead.intent === "prenotazione" && !lead.time) missing.push("orario");
  if (!lead.people) missing.push("numero persone");
  if (lead.intent === "evento" && !lead.occasion) missing.push("tipo occasione");
  return missing.length ? `Da confermare: ${missing.join(", ")}` : "";
}

function shouldOfferWhatsAppForInfo(text) {
  if (hasCommercialIntent()) return false;
  if (textLooksLikeForesteriaRequest(text) || textLooksLikeParkingRequest(text)) return false;
  if (textLooksLikeGreetingOnly(text) || textLooksLikePresenceCheck(text) || textLooksLikeCapabilityQuestion(text)) return false;
  return lead.intent === "informazioni" && Boolean(getInformationRequestText());
}

function getInformationRequestText() {
  const informationNotes = getUsefulNotes().filter((note) => {
    if (textLooksLikeGreetingOnly(note) || textLooksLikePresenceCheck(note) || textLooksLikeCapabilityQuestion(note)) return false;
    if (textLooksLikeForesteriaRequest(note) || textLooksLikeParkingRequest(note)) return false;
    if (textLooksLikeBookingRequest(note) || textLooksLikeEventRequest(note)) return false;
    if (textLooksLikeAdditionalNote(note)) return false;
    if (lead.name && cleanText(note).toLowerCase() === lead.name.toLowerCase()) return false;
    return cleanText(note).length > 3;
  });
  return [...new Set(informationNotes.map(cleanText))].join("; ");
}

function getInternalSummary() {
  const usefulNotes = getUsefulNotes();
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
    usefulNotes.map((note) => `- ${note}`).join("\n") || "non disponibile",
  ].join("\n");
}

async function sendCallTranscript() {
  if (transcriptSent || !getUsefulNotes().length) return;
  transcriptSent = true;
  try {
    await fetch(LEAD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary: getInternalSummary() }),
    });
  } catch (error) {
    transcriptSent = false;
    console.warn("Call transcript email not sent", error);
  }
}

function getCallStartErrorMessage(error) {
  const name = error?.name || "";
  const message = error?.message || "";
  const lowerMessage = message.toLowerCase();
  if (name === "NotAllowedError" || name === "SecurityError") {
    return 'Microfono non accessibile. Consenti il microfono nel browser. Se il widget e dentro un iframe, serve allow="microphone".';
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") return "Nessun microfono trovato su questo dispositivo.";
  if (lowerMessage.includes("permission") || lowerMessage.includes("microphone")) {
    return 'Microfono non accessibile. Controlla i permessi del browser e, se il widget e dentro un iframe, serve allow="microphone".';
  }
  return "Errore: " + (message || "impossibile avviare l'assistente");
}

privacyStart.onclick = () => {
  if (!privacyCheck.checked) {
    alert("Per iniziare deve accettare privacy e dichiarazione di eta.");
    return;
  }
  privacyAccepted = true;
  privacyBox.style.display = "none";
  btn.click();
};

btn.onclick = async () => {
  if (isActive) {
    stopCall();
    return;
  }

  if (isConnecting) {
    showStatus("Connessione gia in corso...");
    return;
  }

  if (!privacyAccepted) {
    hideStatus();
    privacyBox.style.display = "block";
    return;
  }

  try {
    isConnecting = true;
    resetLead();
    widget.classList.add("is-active");
    showStatus("Richiesta microfono...");

    const tokenRes = await fetch(SESSION_URL, { method: "POST" });
    const data = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(data.error || "Errore nella creazione della sessione");

    const clientSecret = data.value || data.client_secret?.value;
    if (!clientSecret) throw new Error("Client secret non ricevuto da OpenAI");

    pc = new RTCPeerConnection();
    outputAudio = document.createElement("audio");
    outputAudio.autoplay = true;
    outputAudio.playsInline = true;
    document.body.appendChild(outputAudio);

    pc.ontrack = (event) => {
      outputAudio.srcObject = event.streams[0];
    };

    pc.onconnectionstatechange = () => {
      if (pc?.connectionState === "connected") {
        isConnecting = false;
        setActive(true);
        hideStatus();
        resetSilenceTimer();
        setTimeout(maybeSendGreeting, 350);
      }
      if (["failed", "disconnected", "closed"].includes(pc?.connectionState)) stopCall();
    };

    eventsChannel = pc.createDataChannel("oai-events");
    eventsChannel.addEventListener("open", () => setTimeout(maybeSendGreeting, 350));
    eventsChannel.addEventListener("message", handleRealtimeEvent);

    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

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
    if (!sdpRes.ok) throw new Error(await sdpRes.text());

    const answer = await sdpRes.text();
    await pc.setRemoteDescription({ type: "answer", sdp: answer });
  } catch (error) {
    console.error(error);
    alert(getCallStartErrorMessage(error));
    stopCall();
  }
};
