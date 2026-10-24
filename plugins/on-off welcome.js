import {
  enableWelcome,
  disableWelcome,
  isWelcomeEnabled,
  enableBye,
  disableBye,
  isByeEnabled
} from "../utils/welcomeState.js";

export default {
  commands: ["welcome", "bienvenida", "bye", "despedida"],
  admin: true,
  category: "grupo",
  description: "Activa o desactiva los mensajes de bienvenida y despedida",

  run: async (sock, msg, args, ctx) => {
    const jid = ctx.jid;

    if (!ctx.isGroup) {
      return sock.sendMessage(jid, { text: "❌ Este comando solo funciona en grupos." }, { quoted: msg });
    }

    const cmd = (ctx.command || "").toLowerCase();
    const option = args[0]?.toLowerCase();
    const isByeCmd = cmd === "bye" || cmd === "despedida";

    if (option === "on") {
      if (isByeCmd) {
        enableBye(jid);
        return sock.sendMessage(jid, { text: "✅ *Despedida ACTIVADA para este grupo.*" }, { quoted: msg });
      } else {
        enableWelcome(jid);
        return sock.sendMessage(jid, { text: "✅ *Bienvenida ACTIVADA para este grupo.*" }, { quoted: msg });
      }
    }

    if (option === "off") {
      if (isByeCmd) {
        disableBye(jid);
        return sock.sendMessage(jid, { text: "❌ *Despedida DESACTIVADA para este grupo.*" }, { quoted: msg });
      } else {
        disableWelcome(jid);
        return sock.sendMessage(jid, { text: "❌ *Bienvenida DESACTIVADA para este grupo.*" }, { quoted: msg });
      }
    }

    const currentWelcome = isWelcomeEnabled(jid) ? "ACTIVADA ✅" : "DESACTIVADA ❌";
    const currentBye = isByeEnabled(jid) ? "ACTIVADA ✅" : "DESACTIVADA ❌";

    return sock.sendMessage(
      jid,
      {
        text:
          `⚙️ *ESTADO DE BIENVENIDA Y DESPEDIDA*\n\n` +
          `• Bienvenida: *${currentWelcome}*\n` +
          `• Despedida: *${currentBye}*\n\n` +
          `📌 *Comandos:*\n` +
          `• *${ctx.prefix || "."}bienvenida on / off*\n` +
          `• *${ctx.prefix || "."}despedida on / off*`
      },
      { quoted: msg }
    );
  }
};
