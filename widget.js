let pc;
let stream;
let audio;
let eventsChannel;
let silenceTimer;
let whatsappFailsafeTimer;
let isActive = false;
let callTranscriptSent = false;
let whatsappIntentSeen = false;
let whatsappForcedVisible = false;
let privacyAccepted = false;
let ambienceContext = null;
let ambienceGain = null;
let ambienceNodes = [];
let ambienceTimers = [];

const PALAZZO_WHATSAPP = "393336523536";
const GENERAL_EMAIL = "palazzocusani@allegroitalia.it";
const PARKING_EMAIL = "segreteriacircolo@cmemi.esercito.difesa.it";

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

const actions = document.createElement("div");
actions.className = "pc-voice-actions";
widget.appendChild(actions);

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

const whatsapp = createAction("Invia richiesta su WhatsApp", "pc-voice-whatsapp");
whatsapp.href = "#";
whatsapp.target = "_blank";
whatsapp.rel = "noopener";
whatsapp.addEventListener("click", openWhatsAppWithLatestMessage);
actions.appendChild(whatsapp);

const generalEmail = createAction(GENERAL_EMAIL, "pc-voice-email");
actions.appendChild(generalEmail);

const defenseEmail = createAction(PARKING_EMAIL, "pc-voice-email");
defenseEmail.href =
  "mailto:" +
  PARKING_EMAIL +
  "?subject=Richiesta%20Palazzo%20Cusani";
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
    background-position: 50% 50%;
    background-repeat: no-repeat;
    filter: none;
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

  .pc-voice-privacy-check {
    margin-top: 2px;
  }

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

  .pc-voice-whatsapp {
    background: #25D366;
  }

  .pc-voice-email {
    background: #1f5f8f;
  }

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

function hideActionButtons() {
  whatsapp.style.display = "none";
  generalEmail.style.display = "none";
  defenseEmail.style.display = "none";
}

function showPrivacyBox() {
  privacyBox.style.display = "block";
}

function hidePrivacyBox() {
  privacyBox.style.display = "none";
}

function startRestaurantAmbience() {
  if (ambienceContext) {
    ambienceContext.resume?.();
    return;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  try {
    ambienceContext = new AudioContextClass();
    ambienceGain = ambienceContext.createGain();
    ambienceGain.gain.setValueAtTime(0.0001, ambienceContext.currentTime);
    ambienceGain.gain.linearRampToValueAtTime(0.018, ambienceContext.currentTime + 0.8);
    ambienceGain.connect(ambienceContext.destination);

    createRoomTone();
    createSoftMurmur();
    scheduleSoftClink();
  } catch (error) {
    console.warn("Restaurant ambience not available", error);
    stopRestaurantAmbience();
  }
}

function createRoomTone() {
  const seconds = 2;
  const sampleRate = ambienceContext.sampleRate;
  const buffer = ambienceContext.createBuffer(1, sampleRate * seconds, sampleRate);
  const data = buffer.getChannelData(0);
  let lastValue = 0;

  for (let i = 0; i < data.length; i += 1) {
    lastValue = lastValue * 0.985 + (Math.random() * 2 - 1) * 0.015;
    data[i] = lastValue * 0.42;
  }

  const source = ambienceContext.createBufferSource();
  const lowpass = ambienceContext.createBiquadFilter();
  const highpass = ambienceContext.createBiquadFilter();
  const gain = ambienceContext.createGain();

  source.buffer = buffer;
  source.loop = true;
  highpass.type = "highpass";
  highpass.frequency.value = 120;
  lowpass.type = "lowpass";
  lowpass.frequency.value = 1450;
  gain.gain.value = 0.34;

  source.connect(highpass);
  highpass.connect(lowpass);
  lowpass.connect(gain);
  gain.connect(ambienceGain);
  source.start();

  ambienceNodes.push(source, lowpass, highpass, gain);
}

function createSoftMurmur() {
  [185, 245, 310].forEach((frequency, index) => {
    const oscillator = ambienceContext.createOscillator();
    const filter = ambienceContext.createBiquadFilter();
    const gain = ambienceContext.createGain();

    oscillator.type = index === 1 ? "triangle" : "sine";
    oscillator.frequency.value = frequency;
    filter.type = "bandpass";
    filter.frequency.value = frequency * 1.7;
    filter.Q.value = 0.7;
    gain.gain.value = 0.0026;

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(ambienceGain);
    oscillator.start();

    ambienceNodes.push(oscillator, filter, gain);
  });
}

function scheduleSoftClink() {
  if (!ambienceContext || !ambienceGain) return;

  const delay = 1800 + Math.random() * 3200;
  const timer = setTimeout(() => {
    playSoftClink();
    scheduleSoftClink();
  }, delay);

  ambienceTimers.push(timer);
}

function playSoftClink() {
  if (!ambienceContext || !ambienceGain) return;

  const now = ambienceContext.currentTime;
  const oscillator = ambienceContext.createOscillator();
  const gain = ambienceContext.createGain();
  const filter = ambienceContext.createBiquadFilter();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(1050 + Math.random() * 650, now);
  filter.type = "highpass";
  filter.frequency.value = 850;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.009, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

  oscillator.connect(filter);
  filter.connect(gain);
  gain.connect(ambienceGain);
  oscillator.start(now);
  oscillator.stop(now + 0.2);

  ambienceNodes.push(oscillator, filter, gain);
}

function stopRestaurantAmbience() {
  ambienceTimers.forEach((timer) => clearTimeout(timer));
  ambienceTimers = [];

  if (!ambienceContext) return;

  const contextToClose = ambienceContext;
  const nodesToStop = ambienceNodes;

  try {
    if (ambienceGain) {
      ambienceGain.gain.cancelScheduledValues(contextToClose.currentTime);
      ambienceGain.gain.setValueAtTime(ambienceGain.gain.value, contextToClose.currentTime);
      ambienceGain.gain.linearRampToValueAtTime(0.0001, contextToClose.currentTime + 0.25);
    }

    setTimeout(() => {
      nodesToStop.forEach((node) => {
        try {
          node.stop?.();
          node.disconnect?.();
        } catch {}
      });
      contextToClose.close?.();
    }, 280);
  } catch (error) {
    console.warn("Restaurant ambience stop failed", error);
  }

  ambienceContext = null;
  ambienceGain = null;
  ambienceNodes = [];
}

function playIntroGreeting() {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      resolve();
      return;
    }

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      resolve();
    };

    const greeting = new SpeechSynthesisUtterance("Sono Adriana di Palazzo Cusani. Mi dica pure.");
    greeting.lang = "it-IT";
    greeting.rate = 1.03;
    greeting.pitch = 1;
    greeting.onend = finish;
    greeting.onerror = finish;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(greeting);
    setTimeout(finish, 3500);
  });
}

function resetLeadState() {
  clearWhatsAppFailsafe();
  notes.length = 0;
  callTranscriptSent = false;
  whatsappIntentSeen = false;
  whatsappForcedVisible = false;

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
  stopRestaurantAmbience();
  sendCallTranscript();
  pc?.close();
  stream?.getTracks().forEach((track) => track.stop());
  audio?.remove();
  pc = null;
  stream = null;
  audio = null;
  eventsChannel = null;
  setActive(false);

  if (hasCommercialIntent()) {
    forceWhatsAppButton();
  } else {
    updateContactButtons();
  }
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
  scheduleWhatsAppFailsafe();
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
  if (capturedName && (!lead.name || textLooksLikeExplicitName(text))) {
    lead.name = capturedName;
  } else if (!lead.name && looksLikeNameAnswer(text) && !textLooksLikeAdditionalNote(text)) {
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
  } else if (lead.intent === "evento" && !lead.occasion) {
    lead.occasion = getGenericEventOccasion(text);
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
    /\b(?:mi chiamo|io sono|sono|yo soy|soy)\s+([a-zA-ZÀ-ÿ' ]{2,50})(?=\s*(?:$|[.,;!?]|\b(?:e|per|vorrei|voglio|volevo|desidero|prenotare|prenotazione|tavolo|evento|siamo|saremo|alle|domani|oggi)\b))/i,
    /\b(?:il mio|la mia|mio|mia)\s+nome\s+(?:e|è|di)\s+([a-zA-ZÀ-ÿ' ]{2,50})(?=\s*(?:$|[.,;!?]|\b(?:e|per|vorrei|voglio|volevo|desidero|prenotare|prenotazione|tavolo|evento|siamo|saremo|alle|domani|oggi)\b))/i,
    /\b(?:il\s+|la\s+|el\s+)?nome\s+(?:e|è|di)\s+([a-zA-ZÀ-ÿ' ]{2,50})(?=\s*(?:$|[.,;!?]|\b(?:e|per|vorrei|voglio|volevo|desidero|prenotare|prenotazione|tavolo|evento|siamo|saremo|alle|domani|oggi)\b))/i,
    /\ba nome di\s+([a-zA-ZÀ-ÿ' ]{2,50})(?=\s*(?:$|[.,;!?]|\b(?:e|per|vorrei|voglio|volevo|desidero|prenotare|prenotazione|tavolo|evento|siamo|saremo|alle|domani|oggi)\b))/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;

    const name = cleanCapturedValue(match[1]);
    if (looksLikeNameAnswer(name) && !looksLikeMisheardPeople(name)) {
      return name;
    }
  }

  return "";
}

function textLooksLikeExplicitName(text) {
  return /\b(mi chiamo|io sono|sono|nome|a nome di|yo soy|soy)\b/i.test(text);
}

function getPeopleFromText(text) {
  const trimmed = text.trim();
  const numberMatch =
    text.match(/\b(\d{1,3})\s*(?:persone|ospiti|coperti|invitati|partecipanti|commensali)\b/i) ||
    text.match(/\b(?:per|siamo|saremo|in|circa)\s+(\d{1,3})\b/i);

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
    /\b((?:inizio|meta|metà|fine)\s+(?:gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre))\b/i,
    /\b(?:a|di|per|nel mese di)\s+((?:gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre))\b/i,
    /\b((?:sabato|domenica|lunedi|lunedì|martedi|martedì|mercoledi|mercoledì|giovedi|giovedì|venerdi|venerdì)\s+\d{1,2}(?:\s+(?:gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre))?)\b/i,
    /\b(\d{1,2}\s+(?:gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre))\b/i,
    /\b(\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)\b/i,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }

  return "";
}

function formatDateForMessage(value) {
  const cleaned = cleanText(value);
  const normalized = normalizeDateText(cleaned);

  if (normalized === "oggi") {
    return `${cleaned} ${formatDateValue(new Date())}`;
  }

  if (normalized === "domani") {
    return `${cleaned} ${formatDateValue(addDays(new Date(), 1))}`;
  }

  if (normalized === "dopodomani") {
    return `${cleaned} ${formatDateValue(addDays(new Date(), 2))}`;
  }

  const weekdayIndex = getWeekdayIndex(normalized);
  if (weekdayIndex !== null && !/\d/.test(cleaned)) {
    return `${cleaned} ${formatDateValue(getNextWeekdayDate(weekdayIndex))}`;
  }

  return cleaned;
}

function normalizeDateText(value) {
  return value
    .toLowerCase()
    .replace(/[ìí]/g, "i")
    .replace(/[èé]/g, "e")
    .trim();
}

function getWeekdayIndex(value) {
  const weekdays = {
    domenica: 0,
    lunedi: 1,
    martedi: 2,
    mercoledi: 3,
    giovedi: 4,
    venerdi: 5,
    sabato: 6,
  };

  return Object.prototype.hasOwnProperty.call(weekdays, value) ? weekdays[value] : null;
}

function getNextWeekdayDate(weekdayIndex) {
  const today = new Date();
  const result = new Date(today);
  let daysToAdd = (weekdayIndex - today.getDay() + 7) % 7;

  if (daysToAdd === 0) {
    daysToAdd = 7;
  }

  result.setDate(today.getDate() + daysToAdd);
  return result;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(date.getDate() + days);
  return result;
}

function formatDateValue(date) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
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
  return `${String(normalizeHourForMeal(hour)).padStart(2, "0")}:${minutes || "00"}`;
}

function normalizeHourForMeal(hour) {
  let numericHour = Number(hour);

  if (lead.meal === "cena" && numericHour >= 1 && numericHour <= 11) {
    numericHour += 12;
  }

  if (lead.meal === "pranzo" && numericHour >= 1 && numericHour <= 4) {
    numericHour += 12;
  }

  return numericHour;
}

function looksLikeNameAnswer(text) {
  const normalized = text.toLowerCase().trim();
  if (!/^[a-zA-ZÀ-ÿ' ]{4,50}$/.test(text.trim())) return false;
  if (normalized.split(/\s+/).length > 4) return false;
  if (textLooksLikeAdditionalNote(text)) return false;

  return ![
    "trener",
    "trenta",
    "trentine",
    "trentina",
    "preventivo",
    "organizzare",
    "interessato",
    "interessata",
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
    "anche",
    "bambino",
    "bambini",
    "bambina",
    "bambine",
    "bimbo",
    "bimbi",
    "adulti",
    "ragazzi",
    "seggiolone",
    "passeggino",
    "allergia",
    "allergie",
    "intolleranza",
    "intolleranze",
    "celiaco",
    "celiaci",
    "vegetariano",
    "vegano",
    "adriana",
    "palazzo",
    "cusani",
    "assistente",
    "dica pure",
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
    trenta: 30,
    trentina: 30,
    trentine: 30,
    trener: 30,
    quaranta: 40,
    cinquanta: 50,
    sessanta: 60,
    settanta: 70,
    ottanta: 80,
    novanta: 90,
    cento: 100,
  };

  const words = Object.keys(numberWords).join("|");
  const match =
    normalized.match(new RegExp(`\\b(${words})\\s+(?:persone|ospiti|coperti|invitati|partecipanti|commensali)\\b`, "i")) ||
    normalized.match(new RegExp(`\\b(?:per|siamo|saremo|in)\\s+(${words})\\b`, "i"));

  return match ? numberWords[match[1].toLowerCase()] : "";
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

function looksLikeMisheardPeople(text) {
  return /\b(trener|trenta|trentine|trentina|quaranta|cinquanta|sessanta|settanta|ottanta|novanta|cento)\b/i.test(text);
}

function textLooksLikeAdditionalNote(text) {
  const normalized = text.toLowerCase();

  return /\b(anche|bambin\w*|bimb\w*|ragazz\w*|adult\w*|seggiolone|passeggino|allerg\w*|intoller\w*|celiac\w*|vegetarian\w*|vegan\w*|carrozzina|disabil\w*|sedia a rotelle|torta|candeline|anniversario|compleanno|cane|animale|nota|note|aggiungo|in piu|in più)\b/i.test(normalized);
}

function getCustomerNotes() {
  const importantNotes = notes
    .filter((note) => textLooksLikeAdditionalNote(note))
    .map(cleanText)
    .filter((note) => note && note.toLowerCase() !== (lead.name || "").toLowerCase());

  return [...new Set(importantNotes)].join("; ");
}

function getPublicSummary() {
  return [
    `Tipo richiesta: ${lead.intent || "richiesta"}`,
    lead.occasion ? `Occasione: ${lead.occasion}` : "",
    lead.name ? `Nome: ${lead.name}` : "",
    lead.phone ? `Contatto WhatsApp/telefono: ${lead.phone}` : "",
    lead.email ? `Email cliente: ${lead.email}` : "",
    lead.day ? `Giorno/data: ${formatDateForMessage(lead.day)}` : "",
    lead.meal ? `Pranzo/cena: ${lead.meal}` : "",
    lead.time ? `Ora: ${lead.time}` : "",
    lead.people ? `Persone: ${lead.people}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function getContactRequestBody() {
  refreshLeadFromNotes();

  return [
    "Buongiorno,",
    getWhatsappSummary(),
    "",
    "Invio questa richiesta per ricevere conferma definitiva. Grazie.",
  ]
    .filter(Boolean)
    .join("\n");
}

function refreshLeadFromNotes() {
  notes.forEach(updateLeadFromText);
}

function getWhatsappSummary() {
  const customerNotes = getCustomerNotes();
  const requestLabel =
    lead.intent === "evento"
      ? "evento / ricorrenza"
      : lead.intent === "prenotazione"
        ? "prenotazione tavolo"
        : "richiesta informazioni";

  return [
    `Richiesta: ${requestLabel}`,
    lead.occasion ? `Occasione: ${lead.occasion}` : "",
    lead.day ? `Data: ${formatDateForMessage(lead.day)}` : "",
    lead.meal ? `Servizio: ${lead.meal}` : "",
    lead.time ? `Orario: ${lead.time}` : "",
    lead.people ? `Persone: ${lead.people}` : "",
    lead.name ? `Nome: ${lead.name}` : "",
    customerNotes ? `Note: ${customerNotes}` : "",
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
    `Giorno: ${lead.day ? formatDateForMessage(lead.day) : "non rilevato"}`,
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
  if (userAskedForWhatsApp()) return true;
  if (hasCommercialIntent()) return true;
  if (whatsappForcedVisible) return true;
  return false;
}

function hasCommercialIntent() {
  return (
    lead.intent === "prenotazione" ||
    lead.intent === "evento" ||
    notes.some((note) => textLooksLikeBookingRequest(note) || textLooksLikeEventRequest(note))
  );
}

function countConversationSignals() {
  const text = notes.join(" ").toLowerCase();
  const signals = [
    lead.day || /\b(oggi|domani|dopodomani|lunedi|lunedì|martedi|martedì|mercoledi|mercoledì|giovedi|giovedì|venerdi|venerdì|sabato|domenica|\d{1,2}[/-]\d{1,2})\b/i.test(text),
    lead.meal || /\b(pranzo|cena|sera|stasera)\b/i.test(text),
    lead.time || /\b(alle|ore)\s*([01]?\d|2[0-3])\b/i.test(text),
    lead.people || /\b(\d{1,3})\s*(persone|ospiti|coperti)\b/i.test(text) || /\b(per|siamo|saremo|in)\s+\d{1,3}\b/i.test(text),
    lead.name || /\b(mi chiamo|sono|nome|a nome di)\b/i.test(text),
    lead.occasion || textLooksLikeEventRequest(text),
  ];

  return signals.filter(Boolean).length;
}

function userAskedForConfirmation() {
  const text = notes.join(" ").toLowerCase();

  return (
    notes.length >= 2 &&
    /\b(whatsapp|conferma|confermare|messaggio|invia|mandare|prenotazione|ricontatto)\b/i.test(text)
  );
}

function userAskedForWhatsApp() {
  const text = notes.join(" ").toLowerCase();
  return /\b(whatsapp|wa\.me|messaggio)\b/i.test(text);
}

function scheduleWhatsAppFailsafe() {
  if (!hasCommercialIntent() || whatsappIntentSeen || whatsappForcedVisible) return;

  whatsappIntentSeen = true;
  clearWhatsAppFailsafe();

  whatsappFailsafeTimer = setTimeout(() => {
    if (!hasCommercialIntent()) return;

    forceWhatsAppButton();

    if (isActive) {
      showStatus("WhatsApp pronto per inviare la richiesta");
    }
  }, 9000);
}

function clearWhatsAppFailsafe() {
  if (whatsappFailsafeTimer) {
    clearTimeout(whatsappFailsafeTimer);
    whatsappFailsafeTimer = null;
  }
}

function forceWhatsAppButton() {
  whatsappForcedVisible = true;
  whatsapp.href = buildWhatsAppUrl();
  whatsapp.innerText = "Invia richiesta su WhatsApp";
  whatsapp.style.display = "block";
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
  if (!canShowContactButtons() && !hasCommercialIntent()) return;
  window.open(buildWhatsAppUrl(), "_blank", "noopener");
}

function buildWhatsAppUrl() {
  return `https://wa.me/${PALAZZO_WHATSAPP}?text=${encodeURIComponent(getContactRequestBody())}`;
}

function updateEmailButtons() {
  const subject =
    lead.intent === "evento"
      ? "Richiesta preventivo evento Palazzo Cusani"
      : "Richiesta informazioni Palazzo Cusani";

  generalEmail.href =
    "mailto:" +
    GENERAL_EMAIL +
    "?subject=" +
    encodeURIComponent(subject) +
    "&body=" +
    encodeURIComponent(getContactRequestBody());
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

function showDefenseEmail(topic = "Palazzo Cusani") {
  const subject =
    topic === "foresteria"
      ? "Richiesta foresteria Palazzo Cusani"
      : topic === "parcheggio"
        ? "Richiesta parcheggio Palazzo Cusani"
        : "Richiesta Palazzo Cusani";

  defenseEmail.href =
    "mailto:" +
    PARKING_EMAIL +
    "?subject=" +
    encodeURIComponent(subject);
  defenseEmail.style.display = "block";
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

function textLooksLikeForesteriaRequest(text) {
  const normalized = text.toLowerCase();
  return (
    normalized.includes("foresteria") ||
    normalized.includes("camera") ||
    normalized.includes("camere") ||
    normalized.includes("alloggio") ||
    normalized.includes("alloggi") ||
    normalized.includes("dormire") ||
    normalized.includes("pernottare") ||
    normalized.includes("pernottamento") ||
    normalized.includes("soggiornare")
  );
}

function textLooksLikeBookingRequest(text) {
  const normalized = text.toLowerCase();
  return (
    normalized.includes("prenot") ||
    normalized.includes("riserv") ||
    normalized.includes("tavolo") ||
    normalized.includes("disponibil") ||
    normalized.includes("vorrei venire") ||
    normalized.includes("posso venire") ||
    normalized.includes("posto")
  );
}

function textLooksLikeEventRequest(text) {
  const normalized = text.toLowerCase();
  return (
    normalized.includes("preventivo") ||
    normalized.includes("organizz") ||
    normalized.includes("cerimonia") ||
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
    showDefenseEmail("parcheggio");
  }

  if (textLooksLikeForesteriaRequest(text)) {
    showDefenseEmail("foresteria");
  }
}

privacyStart.onclick = () => {
  if (!privacyCheck.checked) {
    alert("Per iniziare deve accettare privacy e dichiarazione di eta.");
    return;
  }

  privacyAccepted = true;
  hidePrivacyBox();
  btn.click();
};

btn.onclick = async () => {
  if (isActive) {
    stopCall();
    return;
  }

  if (!privacyAccepted) {
    hideStatus();
    startRestaurantAmbience();
    showPrivacyBox();
    return;
  }

  try {
    stopRestaurantAmbience();
    resetLeadState();
    widget.classList.add("is-active");
    showStatus("Avvio assistente...");
    await playIntroGreeting();
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
