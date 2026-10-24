import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  commands: ["rev"],
  tags: ["tools"],
  category: "tools",
  description: "Verifica errores de sintaxis en los plugins",

  async run(sock, msg, args, ctx) {
    const jid = ctx?.jid || msg.key?.remoteJid;

    try {
      try {
        await sock.sendMessage(jid, { react: { text: "🕒", key: msg.key } });
      } catch (e) {}

      const pluginsDir = __dirname;
      const files = fs.existsSync(pluginsDir)
        ? fs.readdirSync(pluginsDir).filter(file => file.endsWith(".js"))
        : [];

      let response = `📂 *Revisión de Plugins (${files.length}):*\n\n`;
      let hasErrors = false;

      for (const file of files) {
        try {
          await import(`file://${path.resolve(pluginsDir, file)}?test=${Date.now()}`);
        } catch (error) {
          hasErrors = true;
          response += `🚩 Error en: ${file}\n${error.message}\n\n`;
        }
      }

      if (!hasErrors) {
        response += "✅ ¡Todo está en orden! No se detectaron errores de sintaxis.";
      }

      await sock.sendMessage(jid, { text: response }, { quoted: msg });

      try {
        await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
      } catch (e) {}
    } catch (err) {
      console.error("rev plugin error:", err);
      await sock.sendMessage(jid, { text: "🚩 Ocurrió un fallo al verificar los plugins." }, { quoted: msg });
    }
  }
};
