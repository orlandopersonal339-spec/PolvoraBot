import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import config from "./config.js";
import { getState } from "./utils/cdmtoggle.js";
import { isModoAdminsEnabled } from "./lib/modoadminsState.js";
import { downloadContentFromMessage } from "@whiskeysockets/baileys";
import { isMuted } from "./utils/muteState.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
    } catch (e) {
      if (e?.data === 429) {
        console.log("🛑 RATE LIMIT — usando cache previa");
        return groupCache[jid] || null;
      }
      return null;
    } finally {
      delete groupFetchLocks[jid];
    }
  })();

  return groupFetchLocks[jid];
};

console.log("🔥 handler.js cargado");

export const store = { chats: {} };

const storePath = path.join(__dirname, "store.json");
let saveStoreTimer = null;

const saveStore = () => {
  clearTimeout(saveStoreTimer);
  saveStoreTimer = setTimeout(() => {
    try {
      fs.writeFileSync(storePath, JSON.stringify(store, null, 2));
    } catch (e) {
      console.error("❌ Error guardando store:", e);
    }
  }, 1500);
};

if (fs.existsSync(storePath)) {
  try {
    const old = JSON.parse(fs.readFileSync(storePath, "utf8"));
    Object.assign(store, old);
  } catch (e) {
    console.error("❌ store.json inválido:", e);
  }
}

export const plugins = {};
export const listeners = [];

export const loadPlugins = async () => {
  try {
    const dir = path.join(__dirname, "plugins");
    if (!fs.existsSync(dir)) {
      console.warn("⚠️ La carpeta ./plugins no existe en:", dir);
      return false;
    }

    const files = fs.readdirSync(dir).filter(f => f.endsWith(".js"));

    for (const key of Object.keys(plugins)) {
      delete plugins[key];
    }
    listeners.length = 0;

    for (const file of files) {
      try {
        const fileUrl = pathToFileURL(path.join(dir, file)).href;
        const module = await import(`${fileUrl}?update=${Date.now()}`);
        const plugin = module.default;
        if (!plugin) continue;

        if (typeof plugin.onMessage === "function") {
          listeners.push(plugin.onMessage);
        }

        const cmds =
          plugin?.commands ||
          plugin?.command ||
          plugin?.cmd ||
          [];

        const commandList = Array.isArray(cmds) ? cmds : [cmds];

        if (commandList.length && commandList[0]) {
          for (const cmd of commandList) {
            plugins[String(cmd).toLowerCase()] = plugin;
          }
        }
      } catch (err) {
        console.error(`❌ Error en plugin ${file}:`, err.message || err);
      }
    }

    console.log(`✅ Plugins cargados: ${Object.keys(plugins).length} comandos disponibles`);
    return true;
  } catch (e) {
    console.error("❌ Error cargando plugins:", e);
    return false;
  }
};

const handler = async (sock, msg) => {
  try {
    const jid = msg.key?.remoteJid;
    if (!jid) return;
    const isGroup = jid.endsWith("@g.us");

    // Identificar remitente real
    let realSender =
      msg.key.participant ||
      msg.message?.extendedTextMessage?.contextInfo?.participant;

    if (!realSender) {
      if (msg.key.fromMe) {
        realSender = sock.user?.id ? sock.user.id.split(":")[0] + "@s.whatsapp.net" : jid;
      } else {
        realSender = jid;
      }
    }

    let metadata = null;
    let admins = [];
    let isAdmin = false;
    let isBotAdmin = false;

    const normalizeAll = value => {
      if (!value) return null;
      return value
        .toString()
        .replace(/@s\.whatsapp\.net/g, "")
        .replace(/@lid/g, "")
        .replace(/:\d+/g, "")
        .replace(/[^0-9]/g, "");
    };

    if (isGroup) {
      try {
        metadata = await getGroupMeta(sock, jid);

        const botIds = [
          normalizeAll(sock.user?.id),
          normalizeAll(sock.user?.lid),
          normalizeAll(sock.user?.jid)
        ].filter(Boolean);

        const senderIds = [
          normalizeAll(realSender),
          normalizeAll(msg.key?.participant),
          msg.key?.fromMe ? normalizeAll(sock.user?.id) : null,
          msg.key?.fromMe ? normalizeAll(sock.user?.lid) : null
        ].filter(Boolean);

        admins = metadata?.participants?.filter(
          p => p.admin === "admin" || p.admin === "superadmin"
        ) || [];

        const adminIds = admins
          .flatMap(p => [normalizeAll(p.id), normalizeAll(p.jid), normalizeAll(p.lid)])
          .filter(Boolean);

        if (metadata?.owner) {
          adminIds.push(normalizeAll(metadata.owner));
        }
        if (metadata?.subjectOwner) {
          adminIds.push(normalizeAll(metadata.subjectOwner));
        }

        isAdmin = senderIds.some(sId => adminIds.includes(sId));

        isBotAdmin = metadata?.participants?.some(p => {
          const pid = normalizeAll(p.id);
          const pjid = normalizeAll(p.jid);
          const plid = normalizeAll(p.lid);
          const isAdm = p.admin === "admin" || p.admin === "superadmin";

          return isAdm && (
            botIds.includes(pid) ||
            botIds.includes(pjid) ||
            botIds.includes(plid)
          );
        }) || false;

        // Si el bot es el creador del grupo (owner de la metadata)
        if (!isBotAdmin) {
          const groupOwner = normalizeAll(metadata?.owner);
          const subjectOwner = normalizeAll(metadata?.subjectOwner);
          if (botIds.includes(groupOwner) || botIds.includes(subjectOwner)) {
            isBotAdmin = true;
          }
        }

        // Si el usuario envió el mensaje desde la cuenta vinculada del bot (fromMe)
        if (msg.key?.fromMe) {
          if (isAdmin) isBotAdmin = true;
          if (isBotAdmin) isAdmin = true;
        }
      } catch {
        metadata = null;
      }
    }

    // Verificar mute
    if (isGroup && isMuted(jid, realSender) && !isAdmin) {
      try {
        await sock.sendMessage(jid, {
          delete: {
            remoteJid: jid,
            fromMe: false,
            id: msg.key.id,
            participant: realSender
          }
        });
      } catch {}
      return;
    }

    // Guardar actividad de usuarios para comando .fantasmas
    if (isGroup && realSender) {
      const sNum = normalizeAll(realSender);
      if (sNum) {
        if (!store.chats[jid]) store.chats[jid] = {};
        store.chats[jid][sNum] = { time: Date.now() };
        saveStore();
      }
    }

    // Extraer texto compatible con todos los formatos de mensaje
    const m = msg.message || {};
    const text =
      m.conversation ||
      m.extendedTextMessage?.text ||
      m.imageMessage?.caption ||
      m.videoMessage?.caption ||
      m.documentMessage?.caption ||
      m.buttonsResponseMessage?.selectedButtonId ||
      m.templateButtonReplyMessage?.selectedId ||
      m.listResponseMessage?.singleSelectReply?.selectedRowId ||
      "";

    const prefix = config.prefix || ".";

    const ctx = {
      sock,
      msg,
      jid,
      sender: realSender,
      isAdmin,
      isBotAdmin,
      isGroup,
      args: [],
      command: "",
      prefix,
      text,
      groupMetadata: metadata,
      participants: metadata?.participants || [],
      groupAdmins: admins,
      store,
      reloadPlugins: loadPlugins,
      download: async () => {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const target = quoted || msg.message;
        if (!target) throw new Error("NO_MEDIA");

        const media =
          target.imageMessage ||
          target.videoMessage ||
          target.documentMessage ||
          target.audioMessage ||
          target.stickerMessage;

        if (!media) throw new Error("NO_MEDIA");

        const mediaType = Object.keys(target)
          .find(k => k.endsWith("Message"))
          ?.replace("Message", "")
          .toLowerCase() || "document";

        const stream = await downloadContentFromMessage(media, mediaType);

        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }
        return buffer;
      }
    };

    // Log en terminal para visibilidad
    if (text) {
      console.log(`📩 [${isGroup ? "GRUPO" : "PRIVADO"}] ${realSender.split("@")[0]}: "${text}"`);
    }

    // 1️⃣ Ejecutar listeners pasivos (onMessage) ej: antilink, IA, ver media
    for (const listener of listeners) {
      try {
        await listener(sock, msg, ctx);
      } catch (e) {
        console.error("❌ Error en listener:", e);
      }
    }

    // 2️⃣ Comandos
    if (!text.startsWith(prefix)) return;

    const args = text.slice(prefix.length).trim().split(/\s+/);
    const command = args.shift()?.toLowerCase();
    if (!command) return;

    ctx.args = args;
    ctx.command = command;

    const plugin = plugins[command];
    console.log(`⚡ Comando: "${prefix}${command}" | Plugin encontrado: ${!!plugin}`);

    if (!plugin) {
      console.log(`❓ Comando no registrado: ${command}`);
      return;
    }

    if (isGroup && isModoAdminsEnabled(jid) && !isAdmin) {
      return sock.sendMessage(jid, {
        text: "🔒 Solo admins pueden usar comandos."
      }, { quoted: msg });
    }

    const state = getState(command);
    if (state === false) {
      return sock.sendMessage(jid, {
        text: `⚠️ El comando *${prefix}${command}* está desactivado.`
      }, { quoted: msg });
    }

    if (plugin.admin && !isAdmin) {
      return sock.sendMessage(jid, {
        text: "❌ Solo administradores pueden usar este comando."
      }, { quoted: msg });
    }

    if (plugin.group && !isGroup) {
      return sock.sendMessage(jid, {
        text: "❌ Este comando solo funciona en grupos."
      }, { quoted: msg });
    }

    try {
      if (typeof plugin.run === "function") {
        await plugin.run(sock, msg, args, ctx);
        return;
      }

      if (typeof plugin === "function") {
        await plugin(msg, ctx);
        return;
      }
    } catch (pluginError) {
      console.error(`❌ Error ejecutando comando ${command}:`, pluginError);
      await sock.sendMessage(jid, {
        text: `⚠️ Ocurrió un error al ejecutar *${prefix}${command}*:\n> ${pluginError?.message || pluginError}`
      }, { quoted: msg }).catch(() => {});
    }
  } catch (e) {
    console.error("❌ ERROR EN HANDLER:", e);
  }
};

export default handler;
