// Este script se inyecta en la página y espera mensajes del background.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "showSafeMateNotice") {
        showNotice(request.status, request.url);
    }
    // Devuelve true para indicar que la respuesta será asíncrona (aunque no la usemos, es buena práctica)
    return true;
});

/**
 * Crea e inyecta el aviso visual (Toast) en la página.
 * @param {string} status - "safe", "danger", o "caution".
 * @param {string} url - El enlace verificado (actualmente no se usa en el UI, pero se podría añadir).
 */
function showNotice(status, url) {
    // 1. Eliminar cualquier aviso anterior para evitar duplicados
    const oldNotice = document.getElementById("safemate-notice-wrapper");
    if (oldNotice) {
        oldNotice.remove();
    }

    // 2. Definir contenido (textos e íconos SVG)
    let title = "";
    let message = "";
    let iconSvg = "";

    // Icono de Escudo (Seguro)
    const iconSafe = `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.232-.046 2.453-.138 3.662a.75.75 0 01-.544.646l-3.335 1.02a.75.75 0 01-.832-.12l-3.33-3.33a.75.75 0 01-.12-.832l1.02-3.335a.75.75 0 01.646-.544C19.547 12.046 20.768 12 21 12z" />
      <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>`;

    // Icono de Alerta (Peligro / Precaución)
    const iconAlert = `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>`;

    switch (status) {
        case "safe":
            title = "ENLACE SEGURO";
            message = "SafeMate ha verificado este dominio.";
            iconSvg = iconSafe;
            break;
        case "danger":
            title = "¡PELIGRO DETECTADO!";
            message = "Alto riesgo de Phishing o Malware.";
            iconSvg = iconAlert;
            break;
        case "caution":
        default:
            title = "PRECAUCIÓN";
            message = "Este es un enlace poco común. Procede con cuidado.";
            iconSvg = iconAlert;
            break;
    }

    // 3. Crear el elemento del aviso
    const noticeWrapper = document.createElement("div");
    noticeWrapper.id = "safemate-notice-wrapper";
    noticeWrapper.className = `safemate-notice-base safemate-status-${status}`;

    noticeWrapper.innerHTML = `
    <div class="safemate-icon">
      ${iconSvg}
    </div>
    <div class="safemate-text-content">
      <strong>${title}</strong>
      <span>${message}</span>
    </div>
  `;

    // 4. Inyectar en el body
    document.body.appendChild(noticeWrapper);

    // 5. Añadir clase para la animación de entrada
    // Usamos un pequeño timeout para asegurar que la transición CSS se aplica
    setTimeout(() => {
        noticeWrapper.classList.add("safemate-visible");
    }, 10);

    // 6. Configurar auto-eliminación
    setTimeout(() => {
        // Iniciar animación de salida
        noticeWrapper.classList.remove("safemate-visible");

        // Eliminar del DOM después de que termine la animación
        setTimeout(() => {
            noticeWrapper.remove();
        }, 400); // (Debe coincidir con el tiempo de transición en CSS)
    }, 4000); // (El aviso permanece visible por 4 segundos)
}