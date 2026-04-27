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
btn.style.fontSize = "16px";
btn.style.cursor = "pointer";

document.body.appendChild(btn);

btn.onclick = () => {
  alert("Voice agent attivo (prossimo step voce reale)");
};
