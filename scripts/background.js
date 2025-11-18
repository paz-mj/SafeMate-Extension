// --- LISTA DE BLOQUEO (¡MÁS ROBUSTA!) ---
// Lista ficticia pero realista de dominios de alto riesgo.
// Añade más aquí cuando quieras.
const dangerDomains = [
    "ganadinero.com",
    "banco-falso.com",
    "microsft-login.com",  // (Error tipográfico intencional)
    "actualiza-tu-cuenta.xyz",
    "soporte-apple.net",
    "paypal-seguridad.info",
    "ganador-sorteo.top"
];

// Lista de dominios conocidos como seguros
const safeDomains = [
    "google.com",
    "youtube.com",
    "microsoft.com",
    "apple.com",
    "github.com"
];


// 1. Crear el menú contextual al instalar la extensión
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "safemate-verify",
        title: "Verificar con SafeMate",
        contexts: ["link"] // Solo aparece al hacer clic derecho en un enlace
    });
});

// 2. Escuchar el clic en el menú contextual
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "safemate-verify" && info.linkUrl) {
        // 3. Analizar el enlace con la NUEVA lógica
        const status = analyzeLink(info.linkUrl);

        // 4. Inyectar el CSS y el Content Script
        chrome.scripting.insertCSS({
            target: { tabId: tab.id },
            files: ["assets/css/styles.css"]
        }, () => {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ["scripts/content.js"]
            }, () => {
                // 5. Enviar el mensaje al Content Script
                chrome.tabs.sendMessage(tab.id, {
                    action: "showSafeMateNotice",
                    status: status,
                    url: info.linkUrl
                });
            });
        });
    }
});

/**
 * Lógica de negocio ficticia de SafeMate (VERSIÓN 2.0)
 * Compara un enlace con la lista de dominios.
 * @param {string} url - El enlace al que se hizo clic.
 * @returns {string} - "safe", "danger", o "caution".
 */
function analyzeLink(url) {
    const lowerUrl = url.toLowerCase();

    // --- LÓGICA CORREGIDA ---

    // 1. PRIMERO: Buscar peligro.
    // Si CUALQUIER dominio peligroso está en la URL, es peligroso.
    for (const domain of dangerDomains) {
        if (lowerUrl.includes(domain)) {
            return "danger"; // ¡ALTO! Peligro detectado.
        }
    }

    // 2. SEGUNDO: Buscar seguridad.
    // Si no es peligroso, vemos si es conocido y seguro.
    for (const domain of safeDomains) {
        if (lowerUrl.includes(domain)) {
            return "safe"; // OK. Es un sitio conocido.
        }
    }

    // 3. TERCERO: Si no es ninguno de los anteriores, es Precaución.
    return "caution";
}