import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

global._totalfuncionesHandled ??= new Set();

export default {
  commands: ["totalfunciones", "comandos", "funciones"],
  category: "main",
  admin: false,
  group: false,

  async run(sock, msg, args, ctx) {
    const msgId = msg.key?.id;

    if (msgId && global._totalfuncionesHandled.has(msgId)) return;
    if (msgId) global._totalfuncionesHandled.add(msgId);

    try {
      const pluginsDir = __dirname;
      const files = fs
        .readdirSync(pluginsDir)
        .filter(file => file.endsWith(".js"));

      const total = files.length;

      await sock.sendMessage(
        ctx.jid,
        { text: `✅ *TOTAL DE PLUGINS / COMANDOS:* ${total}` },
        { quoted: msg }
      );
    } catch (e) {
      await sock.sendMessage(
        ctx.jid,
        { text: "❌ No se pudo leer la carpeta plugins." },
        { quoted: msg }
      );
    }
  }
};
