chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "showSafeMateNotice") {
        // Pasamos también la "razón" (reason) a la función visual
        showNotice(request.status, request.url, request.reason);
    }
    return true;
});

function showNotice(status, url, reason) { // Añadido parámetro 'reason'
    const oldNotice = document.getElementById("safemate-notice-wrapper");
    if (oldNotice) oldNotice.remove();

    let title = "";
    let message = "";
    // Usamos el reason si existe, si no, un texto genérico
    let detailText = reason || "Análisis completado.";

    const iconSafe = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.232-.046 2.453-.138 3.662a.75.75 0 01-.544.646l-3.335 1.02a.75.75 0 01-.832-.12l-3.33-3.33a.75.75 0 01-.12-.832l1.02-3.335a.75.75 0 01.646-.544C19.547 12.046 20.768 12 21 12z" /><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
    const iconAlert = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>`;

    switch (status) {
        case "safe":
            title = "SITIO VERIFICADO";
            message = reason || "Este dominio pertenece a la lista oficial."; // Usa la razón del background si viene
            iconSvg = iconSafe;
            break;
        case "danger":
            title = "¡AMENAZA DETECTADA!";
            message = reason || "Patrones de phishing detectados.";
            iconSvg = iconAlert;
            break;
        case "caution":
        default:
            title = "SITIO DESCONOCIDO";
            message = reason || "Navega con precaución.";
            iconSvg = iconAlert;
            break;
    }

    const noticeWrapper = document.createElement("div");
    noticeWrapper.id = "safemate-notice-wrapper";
    noticeWrapper.className = `safemate-notice-base safemate-status-${status}`;

    noticeWrapper.innerHTML = `
    <div class="safemate-icon">${iconSvg}</div>
    <div class="safemate-text-content">
      <strong>${title}</strong>
      <span>${message}</span>
    </div>
  `;

    document.body.appendChild(noticeWrapper);

    setTimeout(() => noticeWrapper.classList.add("safemate-visible"), 10);

    // Duración un poco más larga para que alcancen a leer la razón
    setTimeout(() => {
        noticeWrapper.classList.remove("safemate-visible");
        setTimeout(() => noticeWrapper.remove(), 400);
    }, 5000);
}