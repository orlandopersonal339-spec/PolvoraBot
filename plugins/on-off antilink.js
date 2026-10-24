import { enableAntilink, disableAntilink, isAntilinkEnabled } from "../utils/antilinkState.js";

const anyLinkRegex = /chat\.whatsapp\.com\/(?:invite\/)?([0-9A-Za-z]{20,24})/i;

export default {
  commands: ["antilink"],
  admin: true,
  category: "grupo",

  run: async (sock, msg, args, ctx) => {
    const jid = msg.key.remoteJid;

    if (!ctx.isGroup) {
      return sock.sendMessage(jid, { text: "❌ Este comando solo funciona en grupos." });
    }

    const option = args[0]?.toLowerCase();

    if (option === "on") {
      enableAntilink(jid);
      return sock.sendMessage(jid, { text: "🔒 *Antilink activado*" });
    }

    if (option === "off") {
      disableAntilink(jid);
      return sock.sendMessage(jid, { text: "🔓 *Antilink desactivado*" });
    }

    return sock.sendMessage(jid, { text: "📌 Uso:\n*.antilink on*\n*.antilink off*" });
  },

  onMessage: async (sock, msg, ctx) => {
    const jid = ctx.jid;

    if (!ctx.isGroup) return;
    if (!ctx.text) return;
    if (ctx.isAdmin) return;
    if (!isAntilinkEnabled(jid)) return;
    if (!anyLinkRegex.test(ctx.text)) return;

    const offender = ctx.sender;
    const offenderTag = `@${offender.split("@")[0]}`;

    await sock.sendMessage(jid, {
      text: `*《★》Enlace Detectado*\n\nLo siento, ${offenderTag}, no se permiten enlaces de grupos aquí.`,
      mentions: [offender]
    });

    try {
      await sock.sendMessage(jid, { delete: msg.key });
      if (ctx.isBotAdmin) {
        await sock.groupParticipantsUpdate(jid, [offender], "remove");
      } else {
        await sock.sendMessage(jid, { text: "❌ No soy admin, no puedo expulsar usuarios." });
      }
    } catch (err) {
      console.error("❌ Error antilink:", err);
    }
  }
};
