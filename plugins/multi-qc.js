import axios from "axios";
import { writeExifImg } from "../lib/fuctions.js";

const colors = {
  rojo: "#FF0000",
  azul: "#0000FF",
  morado: "#800080",
  verde: "#008000",
  amarillo: "#FFFF00",
  naranja: "#FFA500",
  celeste: "#00FFFF",
  rosado: "#FFC0CB",
  negro: "#000000",
  blanco: "#FFFFFF"
};

const QC_ENDPOINTS = [
  "https://qc.botcahx.eu.org/generate",
  "https://bot.lyo.su/quote/generate"
];

async function requestQuote(payload) {
  for (const url of QC_ENDPOINTS) {
    try {
      const res = await axios.post(url, payload, {
        headers: { "Content-Type": "application/json" },
        timeout: 15000
      });
      if (res.data?.result?.image) {
        return res.data.result.image;
      }
    } catch {}
  }
  throw new Error("No se pudo contactar con el servidor de QC.");
}

export default {
  commands: ["qc"],
  category: "grupo",
  description: "Crea un sticker estilo quote de Telegram",

  async run(sock, msg, args, ctx) {
    const jid = msg.key.remoteJid;

    // ── TEXTO ─────────────────────────
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    let text =
      quoted?.conversation ||
      quoted?.extendedTextMessage?.text ||
      (args.length ? args.join(" ") : "");

    if (!text) {
      return sock.sendMessage(
        jid,
        { text: `✏️ Usa:\n*${ctx.prefix || "."}qc texto*\n*${ctx.prefix || "."}qc rojo texto*\nO responde a un mensaje con *.qc*` },
        { quoted: msg }
      );
    }

    // ── COLOR ─────────────────────────
    const first = args[0]?.toLowerCase();
    const bgColor = colors[first] || colors.negro;

    if (colors[first]) {
      text = args.slice(1).join(" ") || text;
    }

    // ── REMITENTE Y AVATAR ────────────
    const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
    const targetSender = quotedParticipant || ctx.sender;
    const name = msg.pushName || targetSender.split("@")[0];

    let avatarUrl = null;
    try {
      avatarUrl = await sock.profilePictureUrl(targetSender, "image");
    } catch {
      avatarUrl = null;
    }

    try {
      await sock.sendMessage(jid, {
        react: { text: "🎨", key: msg.key }
      });

      const makePayload = (useAvatar) => ({
        type: "quote",
        format: "png",
        backgroundColor: bgColor,
        width: 512,
        height: 768,
        scale: 2,
        messages: [
          {
            avatar: !!useAvatar,
            from: {
              id: 1,
              name,
              ...(useAvatar && avatarUrl ? { photo: { url: avatarUrl } } : {})
            },
            text,
            replyMessage: {}
          }
        ]
      });

      let imageBase64 = null;
      try {
        // Intento 1: con foto de perfil si existe
        imageBase64 = await requestQuote(makePayload(!!avatarUrl));
      } catch (err) {
        // Intento 2: sin foto de perfil (por si el CDN de WhatsApp falló al servidor)
        if (avatarUrl) {
          imageBase64 = await requestQuote(makePayload(false));
        } else {
          throw err;
        }
      }

      const buffer = Buffer.from(imageBase64, "base64");
      const sticker = await writeExifImg(buffer, {
        packname: "ADRIBOT",
        author: "Adri"
      });

      await sock.sendMessage(
        jid,
        { sticker: { url: sticker } },
        { quoted: msg }
      );

      await sock.sendMessage(jid, {
        react: { text: "✅", key: msg.key }
      });

    } catch (e) {
      console.error("❌ Error QC:", e);
      await sock.sendMessage(
        jid,
        { text: "❌ Error al generar el QC." },
        { quoted: msg }
      );
    }
  }
};
