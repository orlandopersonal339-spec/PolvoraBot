#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
  fetchLatestBaileysVersion
} from "@whiskeysockets/baileys";
import pino from "pino";
import readline from "readline";
import chokidar from "chokidar";
import qrcode from "qrcode-terminal";

import groupAdmins from "./events/groupAdmins.js";
import groupSettings from "./events/groupSettings.js";
import { isWelcomeEnabled, isByeEnabled } from "./utils/welcomeState.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSIONS_DIR = path.join(__dirname, "sessions");
const PLUGINS_DIR = path.join(__dirname, "plugins");

console.log("🔥 INICIANDO BOT EN:", __dirname);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = text =>
  new Promise(resolve => rl.question(text, resolve));

const groupCache = {};
const groupFetchLocks = {};

const getGroupMeta = async (sock, jid) => {
  if (groupCache[jid]) return groupCache[jid];
  if (groupFetchLocks[jid]) return groupFetchLocks[jid];

  groupFetchLocks[jid] = (async () => {
    try {
      const meta = await sock.groupMetadata(jid);
      groupCache[jid] = meta;
      setTimeout(() => delete groupCache[jid], 15 * 1000);
      return meta;
    } catch {
      return groupCache[jid] || null;
    } finally {
      delete groupFetchLocks[jid];
    }
  })();

  return groupFetchLocks[jid];
};

let currentHandler = null;
let currentLoadPlugins = null;

let pluginsLoaded = false;
let watcherStarted = false;
let reloadTimer = null;
const reloadQueue = new Set();

let pairingMethod = null;
let pairingCodeRequested = false;
let phoneNumber = null;

let currentSock = null;
let reconnectTimer = null;
let reconnecting = false;
let starting = false;
let clearingSession = false;

function normalizePhoneNumber(input) {
  let number = String(input || "").trim().replace(/\D/g, "");

  if (number.startsWith("52") && !number.startsWith("521")) {
    number = "521" + number.slice(2);
  }

  return number;
}

function resetPairingState() {
  pairingMethod = null;
  pairingCodeRequested = false;
  phoneNumber = null;
}

function ensureSessionsDir() {
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }
}

function clearSessions() {
  try {
    if (fs.existsSync(SESSIONS_DIR)) {
      fs.rmSync(SESSIONS_DIR, { recursive: true, force: true });
    }
  } catch {}
  ensureSessionsDir();
}

async function loadHandlerModule() {
  const handlerPath = path.join(__dirname, "handler.js");
  const handlerModule = await import(`file://${handlerPath}?update=${Date.now()}`);
  currentHandler = handlerModule.default;
  currentLoadPlugins = handlerModule.loadPlugins;
}

async function askLinkMethodOnce(state) {
  if (state.creds?.registered) return;

  if (!pairingMethod) {
    const answer = await question(
      "\n¿Cómo quieres vincular el bot?\n1) QR\n2) Código de 8 dígitos\nElige 1 o 2: "
    );
    pairingMethod = answer.trim() === "2" ? "code" : "qr";
  }

  if (pairingMethod === "code" && !phoneNumber) {
    let input = "";

    do {
      input = await question(
        "📞 Escribe tu número con código de país, sin + ni espacios. Ejemplo: 5215512345678\nNúmero: "
      );
      input = normalizePhoneNumber(input);
    } while (!input);

    phoneNumber = input;
    console.log(`✅ Número detectado: ${phoneNumber}`);
  }
}

function startWatcher() {
  if (watcherStarted) return;
  watcherStarted = true;

  const watcher = chokidar.watch([PLUGINS_DIR, path.join(__dirname, "handler.js")], {
    ignoreInitial: true,
    ignored: ["**/node_modules/**", "**/.git/**"],
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100
    }
  });

  watcher.on("all", async (_, filePath) => {
    try {
      if (!filePath.endsWith(".js")) return;

      reloadQueue.add(filePath);
      clearTimeout(reloadTimer);

      reloadTimer = setTimeout(async () => {
        reloadQueue.clear();
        await global.hotReload?.();
      }, 300);
    } catch (e) {
      console.error("❌ Error en watcher:", e);
    }
  });

  console.log("👀 Watcher de plugins activado");
}

function scheduleReconnect(ms = 8000) {
  if (reconnecting || reconnectTimer || clearingSession) return;

  reconnecting = true;
  console.log(`⚠️ Conexión cerrada, reconectando en ${Math.floor(ms / 1000)} segundos...`);

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    reconnecting = false;
    await startBot();
  }, ms);
}

async function handleLoggedOut() {
  if (clearingSession) return;
  clearingSession = true;

  try {
    console.log("❌ Sesión cerrada (401). Limpiando sesión y reiniciando vínculo...");
    resetPairingState();

    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    reconnecting = false;

    if (currentSock) {
      try {
        currentSock.ev.removeAllListeners();
      } catch {}

      try {
        currentSock.end?.();
      } catch {}

      try {
        currentSock.ws?.close();
      } catch {}
    }

    clearSessions();

    setTimeout(async () => {
      clearingSession = false;
      await startBot();
    }, 3000);
  } catch (e) {
    clearingSession = false;
    console.error("❌ Error limpiando sesión:", e);
  }
}

async function startBot() {
  if (starting || clearingSession) return;
  starting = true;

  try {
    ensureSessionsDir();

    let auth = await useMultiFileAuthState(SESSIONS_DIR);
    let { state, saveCreds } = auth;

    // Si la sesión anterior no terminó de registrarse, limpiar para generar llaves frescas
    if (state.creds && !state.creds.registered && state.creds.pairingCode) {
      clearSessions();
      auth = await useMultiFileAuthState(SESSIONS_DIR);
      state = auth.state;
      saveCreds = auth.saveCreds;
    }

    await askLinkMethodOnce(state);
    await loadHandlerModule();

    // 🚀 Cargar plugins inmediatamente para tenerlos listos
    if (typeof currentLoadPlugins === "function") {
      console.log("📦 Cargando plugins...");
      await currentLoadPlugins();
      pluginsLoaded = true;
    }

    const { version } = await fetchLatestBaileysVersion();

    if (currentSock) {
      try {
        currentSock.ev.removeAllListeners();
      } catch {}

      try {
        currentSock.end?.();
      } catch {}

      try {
        currentSock.ws?.close();
      } catch {}
    }

    const sock = makeWASocket({
      logger: pino({ level: "silent" }),
      auth: state,
      browser: Browsers.ubuntu("Chrome"),
      version,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 10000,
      markOnlineOnConnect: false,
      syncFullHistory: false,
      printQRInTerminal: false,
      cachedGroupMetadata: async jid => {
        try {
          return await getGroupMeta(sock, jid);
        } catch {
          return null;
        }
      }
    });

    sock.reply = async (jid, text, quoted, options = {}) => {
      return sock.sendMessage(jid, { text, ...options }, { quoted });
    };

    sock.getName = async jid => {
      try {
        const contact = sock.contacts?.[jid] || {};
        return (
          contact.name ||
          contact.notify ||
          contact.verifiedName ||
          jid.split("@")[0]
        );
      } catch {
        return jid.split("@")[0];
      }
    };

    currentSock = sock;
    global.sock = sock;

    groupAdmins(sock);
    groupSettings(sock);

    sock.ev.on("creds.update", saveCreds);

    global.hotReload = async () => {
      try {
        await loadHandlerModule();

        if (typeof currentLoadPlugins === "function") {
          const ok = await currentLoadPlugins();
          if (ok) {
            console.log("♻️ Handler y plugins recargados sin reiniciar");
            return true;
          }
        }

        return false;
      } catch (e) {
        console.error("❌ Error en hotReload:", e);
        return false;
      }
    };

    // Disparar código de vinculación de manera segura
    if (pairingMethod === "code" && !state.creds?.registered && phoneNumber) {
      setTimeout(async () => {
        if (!pairingCodeRequested && currentSock) {
          try {
            pairingCodeRequested = true;
            const code = await currentSock.requestPairingCode(phoneNumber);
            const cleanCode = String(code).replace(/[-\s]/g, "");
            console.log(`\n🔗 Código de vinculación: ${cleanCode}`);
            console.log("📌 Ingresa ese código en WhatsApp (Dispositivos vinculados -> Vincular con código de teléfono)\n");
          } catch (err) {
            pairingCodeRequested = false;
            console.error("❌ Error solicitando código de vinculación:", err);
          }
        }
      }, 3000);
    }

    sock.ev.on("connection.update", async update => {
      const { connection, lastDisconnect, qr } = update;

      try {
        if (qr && pairingMethod === "qr") {
          console.log("\n📱 Escanea este código QR con WhatsApp:\n");
          qrcode.generate(qr, { small: true });
        }

        if (connection === "open") {
          console.log("\n=================================");
          console.log("✅ ADRIBOT CONECTADO CORRECTAMENTE");
          console.log("=================================\n");
          pairingCodeRequested = false;

          if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
          }

          reconnecting = false;

          if (!pluginsLoaded && typeof currentLoadPlugins === "function") {
            await currentLoadPlugins();
            pluginsLoaded = true;
          }

          startWatcher();
        }

        if (connection === "close") {
          const code = lastDisconnect?.error?.output?.statusCode;
          console.log("❌ Conexión cerrada. Código:", code);

          pairingCodeRequested = false;

          if (code === DisconnectReason.loggedOut || code === 401) {
            await handleLoggedOut();
            return;
          }

          scheduleReconnect();
        }
      } catch (err) {
        console.error("❌ Error en connection.update:", err);
        pairingCodeRequested = false;
        scheduleReconnect();
      }
    });

    sock.ev.on("messages.upsert", async ({ messages }) => {
      for (const msg of messages) {
        if (!msg || !msg.message) continue;
        if (msg.key?.remoteJid === "status@broadcast") continue;

        // Desempaquetar capas de mensajes en WhatsApp
        msg.message =
          msg.message?.ephemeralMessage?.message ||
          msg.message?.viewOnceMessage?.message ||
          msg.message?.viewOnceMessageV2?.message?.message ||
          msg.message?.viewOnceMessageV2?.message ||
          msg.message?.documentWithCaptionMessage?.message ||
          msg.message;

        if (!msg.message) continue;

        try {
          if (typeof currentHandler === "function") {
            await currentHandler(sock, msg);
          }
        } catch (e) {
          console.error("❌ Error en handler:", e);
        }
      }
    });

    sock.ev.on("group-participants.update", async update => {
      try {
        const { id, participants, action } = update;
        if (!["add", "remove"].includes(action)) return;
        if (!participants || !participants.length) return;

        const metadata = await getGroupMeta(sock, id);
        if (!metadata) return;

        const extractJid = p => {
          if (!p) return "";
          if (typeof p === "string") return p;
          if (typeof p === "object") return p.id || p.jid || p.phoneNumber || "";
          return String(p);
        };

        const botIdentifiers = [
          sock.user?.id?.replace(/\D/g, ""),
          sock.user?.lid?.replace(/\D/g, "")
        ].filter(Boolean);

        const welcomeImg = path.join(__dirname, "media/welcome.png");
        const byeImg = path.join(__dirname, "media/bye.png");

        for (const user of participants) {
          const uJid = extractJid(user);
          if (!uJid) continue;
          const num = uJid.split("@")[0].replace(/\D/g, "") || uJid.split("@")[0];

          // Si el bot fue añadido al grupo
          if (action === "add" && botIdentifiers.includes(num)) {
            await sock.sendMessage(id, {
              text: `👋 *¡Hola a todos!* Gracias por agregarme a *${metadata?.subject || "este grupo"}*.\nEscribe *${config.prefix || "."}menu* para ver la lista de comandos disponibles.`
            });
            continue;
          }

          if (action === "add" && isWelcomeEnabled(id)) {
            const desc = metadata?.desc ? `\n\n📜 *Descripción:*\n${metadata.desc}` : "";
            const caption = `👋 *¡Bienvenido/a al grupo!*\n━━━━━━━━━━━━━━━\n👤 *Usuario:* @${num}\n👥 *Grupo:* *${metadata?.subject || "este grupo"}*${desc}\n━━━━━━━━━━━━━━━`.trim();

            if (fs.existsSync(welcomeImg)) {
              await sock.sendMessage(id, {
                image: fs.readFileSync(welcomeImg),
                caption,
                mentions: [uJid]
              });
            } else {
              await sock.sendMessage(id, {
                text: caption,
                mentions: [uJid]
              });
            }
          }

          if (action === "remove" && isByeEnabled(id)) {
            const caption = `👋 *¡Hasta luego!*\n━━━━━━━━━━━━━━━\n👤 @${num} ha salido del grupo.\n━━━━━━━━━━━━━━━`.trim();

            if (fs.existsSync(byeImg)) {
              await sock.sendMessage(id, {
                image: fs.readFileSync(byeImg),
                caption,
                mentions: [uJid]
              });
            } else {
              await sock.sendMessage(id, {
                text: caption,
                mentions: [uJid]
              });
            }
          }
        }
      } catch (err) {
        console.error("❌ Error en group-participants.update:", err);
      }
    });
  } catch (err) {
    console.error("❌ Error iniciando bot:", err);
    scheduleReconnect();
  } finally {
    starting = false;
  }
}

process.on("uncaughtException", err => {
  console.error("❌ uncaughtException:", err);
});

process.on("unhandledRejection", err => {
  console.error("❌ unhandledRejection:", err);
});

startBot();
