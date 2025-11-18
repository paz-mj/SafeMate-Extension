/**
 * SAFEMATE ENGINE V4.0 (Dynamic Sync Architecture)
 * Motor de análisis heurístico avanzado con sincronización externa.
 * * Características:
 * 1. Listas estáticas base (Whitelist/Blacklist).
 * 2. Sincronización con App React via 'externally_connectable'.
 * 3. Persistencia de datos usando chrome.storage.local.
 * 4. Análisis heurístico "Zero Trust" para sitios desconocidos.
 */

// --- CONFIGURACIÓN BASE (Hardcoded) ---
// Estas listas actúan como "fábrica" y respaldo si no hay conexión.
const BASE_CONFIG = {
    // Lista VIP base (siempre segura por defecto)
    staticWhiteList: [
        "google.com", "www.google.com", "accounts.google.com",
        "youtube.com", "www.youtube.com",
        "github.com", "www.github.com",
        "microsoft.com", "www.microsoft.com",
        "apple.com", "www.apple.com",
        "amazon.com", "www.amazon.com",
        "linkedin.com", "www.linkedin.com"
    ],

    // Lista Negra (Ficticia - Para Demo)
    blackList: [
        "ganadinero.com",
        "banco-falso.com",
        "crypto-giveaway.site",
        "apple-support-id22.net"
    ],

    // Dominios de bajo costo / alto riesgo
    riskyTLDs: [".xyz", ".top", ".club", ".work", ".loan", ".zip", ".review", ".country", ".gq", ".cf", ".tk", ".ml", ".ga"],

    // Marcas protegidas para detección de Spoofing
    protectedBrands: {
        "paypal": ["paypal.com"],
        "zoom": ["zoom.us", "zoomgov.com"],
        "netflix": ["netflix.com"],
        "santander": ["santander.cl", "santander.com", "bancosantander.es"],
        "bancoestado": ["bancoestado.cl"],
        "google": ["google.com", "google.cl", "gmail.com", "drive.google.com"],
        "facebook": ["facebook.com", "fb.com"],
        "instagram": ["instagram.com"]
    },

    // Palabras clave de Ingeniería Social
    riskKeywords: [
        "login", "signin", "verify", "secure", "account", "update",
        "confirm", "wallet", "password", "urgent", "bloqueada",
        "suspended", "factura", "invoice", "rastreo", "envio"
    ]
};

// Variable global para mantener la lista dinámica en memoria (caché)
let dynamicWhiteList = [];

// --- INICIALIZACIÓN Y CARGA DE MEMORIA ---

// Al instalar la extensión
chrome.runtime.onInstalled.addListener(() => {
    // Crear menú contextual
    chrome.contextMenus.create({
        id: "safemate-verify",
        title: "🛡️ Verificar con SafeMate",
        contexts: ["link"]
    });
    // Cargar lista guardada
    loadDynamicList();
});

// Al iniciar el navegador (para persistencia entre sesiones)
chrome.runtime.onStartup.addListener(() => {
    loadDynamicList();
});

/**
 * Carga la lista blanca dinámica desde el almacenamiento local de Chrome.
 */
function loadDynamicList() {
    chrome.storage.local.get(['adminSafeList'], (result) => {
        if (result.adminSafeList) {
            dynamicWhiteList = result.adminSafeList;
            console.log("✅ SafeMate: Lista dinámica cargada desde memoria:", dynamicWhiteList);
        }
    });
}

// --- CANAL DE COMUNICACIÓN CON TU WEB (LA MAGIA) ---

chrome.runtime.onMessageExternal.addListener(
    (request, sender, sendResponse) => {
        // Verificamos que la acción sea la correcta
        if (request.action === "SYNC_WHITELIST" && Array.isArray(request.data)) {

            console.log("📡 Solicitud de Sincronización recibida desde:", sender.url);
            console.log("📋 Nueva lista recibida:", request.data);

            // Guardamos en Storage (Persistencia en disco)
            chrome.storage.local.set({ adminSafeList: request.data }, () => {
                // Actualizamos memoria (RAM) para uso inmediato
                dynamicWhiteList = request.data;

                // Confirmamos éxito al Front-end
                sendResponse({ success: true, message: "SafeMate Sincronizado Correctamente" });
            });

            return true; // Mantiene el canal abierto para respuesta asíncrona (Requisito de Chrome)
        }
    }
);

// --- LISTENER DEL MENÚ CONTEXTUAL (PROCESO PRINCIPAL) ---

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "safemate-verify" && info.linkUrl) {

        // 1. Ejecutar análisis
        const result = analyzeLinkDeeply(info.linkUrl);

        // 2. Inyectar CSS
        chrome.scripting.insertCSS({
            target: { tabId: tab.id },
            files: ["assets/css/styles.css"]
        }, () => {
            // 3. Inyectar JS y mostrar resultado
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ["scripts/content.js"]
            }, () => {
                // Enviar mensaje al Content Script
                chrome.tabs.sendMessage(tab.id, {
                    action: "showSafeMateNotice",
                    status: result.status,
                    url: info.linkUrl,
                    reason: result.reason
                });
                console.log(`[SafeMate Analysis] URL: ${info.linkUrl} | Score: ${result.score} | Status: ${result.status}`);
            });
        });
    }
});

// --- MOTOR DE ANÁLISIS V4 (EL CEREBRO) ---

function analyzeLinkDeeply(urlStr) {
    let score = 0;
    let logs = [];
    let urlObj;

    // Validación inicial de URL
    try {
        urlObj = new URL(urlStr);
    } catch (e) {
        return { status: "danger", score: 100, reason: "❌ URL Malformada o Inválida" };
    }

    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname.toLowerCase();
    const fullUrl = urlStr.toLowerCase();

    // --- FASE 1: Verificación de Listas (Mezcladas) ---

    // 1. Combinamos la lista base con la lista dinámica (Admin)
    const totalSafeList = [...BASE_CONFIG.staticWhiteList, ...dynamicWhiteList];

    // 2. Check Whitelist (VIP)
    // Verificamos coincidencia exacta O subdominio (ej: sub.midominio.com)
    const isWhiteListed = totalSafeList.some(safe => {
        const safeClean = safe.toLowerCase().trim();
        return hostname === safeClean || hostname.endsWith("." + safeClean);
    });

    if (isWhiteListed) {
        // Verificación extra anti-evasión (incluso para sitios seguros)
        // Evita trucos como: http://google.com@sitio-malicioso.com
        if (!urlObj.username && !urlObj.password && !fullUrl.includes("@")) {
            return { status: "safe", score: 0, reason: "✅ Verificado por Admin/Sistema" };
        }
    }

    // 3. Check Blacklist (Prioridad alta)
    if (BASE_CONFIG.blackList.some(bad => hostname.includes(bad))) {
        return { status: "danger", score: 100, reason: "⛔ Sitio en Lista Negra de SafeMate" };
    }

    // --- FASE 2: Análisis Heurístico (Zero Trust) ---

    // Si no es VIP, empezamos con una base de desconfianza.
    let baseRisk = 25;
    score += baseRisk;
    logs.push("Sitio desconocido");

    // A. Detección de IPs numéricas
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
        score += 50;
        logs.push("Dirección IP numérica");
    }

    // B. TLDs de Riesgo
    const tldMatch = BASE_CONFIG.riskyTLDs.find(tld => hostname.endsWith(tld));
    if (tldMatch) {
        score += 20;
        logs.push(`Dominio de bajo costo (${tldMatch})`);
    }

    // C. Exceso de Subdominios (ej: a.b.c.paypal.com)
    const dotCount = (hostname.match(/\./g) || []).length;
    if (dotCount > 3) {
        score += 15;
        logs.push("Exceso de subdominios");
    }

    // D. Redirección ofuscada (@)
    if (urlObj.username || urlObj.password || fullUrl.includes("@")) {
        score += 80;
        logs.push("Redirección engañosa (@)");
    }

    // E. Punycode (Caracteres internacionales engañosos)
    if (hostname.includes("xn--")) {
        score += 30;
        logs.push("Caracteres ocultos (Punycode)");
    }

    // --- FASE 3: Ingeniería Social (Brand Spoofing) ---

    for (const [brand, validHosts] of Object.entries(BASE_CONFIG.protectedBrands)) {
        if (fullUrl.includes(brand)) {
            // Si dice la marca, ¿es el host oficial O uno de nuestros permitidos?
            // (Importante: validamos contra la lista oficial Y la whitelist del usuario)
            const isOfficial = validHosts.some(vh => hostname === vh || hostname.endsWith("." + vh));

            // Si no es oficial Y tampoco está en nuestra whitelist personalizada...
            if (!isOfficial && !isWhiteListed) {
                score += 100; // ¡ALERTA MÁXIMA!
                logs.push(`⚠️ Suplantación de ${brand.toUpperCase()}`);
            }
        }
    }

    // F. Palabras clave de urgencia
    let keywordCount = 0;
    BASE_CONFIG.riskKeywords.forEach(kw => {
        if (fullUrl.includes(kw)) keywordCount++;
    });

    if (keywordCount > 0) {
        score += (keywordCount * 15);
        logs.push(`Palabras sospechosas (${keywordCount})`);
    }

    // G. Archivos ejecutables
    if (pathname.endsWith(".exe") || pathname.endsWith(".scr") || pathname.endsWith(".bat")) {
        score += 75;
        logs.push("Enlace directo a ejecutable");
    }

    // --- FASE 4: Veredicto Final ---

    if (score > 100) score = 100;

    // Umbrales de decisión
    let finalStatus = "caution"; // Por defecto Amarillo (Zero Trust)

    if (score >= 60) {
        finalStatus = "danger";
    } else if (score <= 10 && isWhiteListed) {
        // Solo volvemos a verde si es muy seguro y conocido
        finalStatus = "safe";
    }

    // Generar texto de razón para el usuario
    let reasonText = logs[0] || "Sitio no verificado";
    if (logs.length > 1) reasonText += ` (+${logs.length - 1} alertas)`;
    if (finalStatus === "danger") reasonText = "⛔ " + reasonText;

    return {
        status: finalStatus,
        score: score,
        reason: reasonText
    };
}