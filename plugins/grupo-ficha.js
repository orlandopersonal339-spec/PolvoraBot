import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "../data");
const FILE = path.join(DATA_DIR, "fichas.json");

if (!fs.existsSync(DATA_DIR)) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
}
if (!fs.existsSync(FILE)) {
  try { fs.writeFileSync(FILE, "{}"); } catch {}
}

const load = () => {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf-8"));
  } catch {
    return {};
  }
};

const save = (data) => {
  try {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("❌ Error guardando fichas:", e);
  }
};

export default {
  commands: ["ficha", "setficha", "delficha"],
  admin: false,
  category: "grupo",
  description: "Guarda, muestra o elimina la ficha informativa del grupo.",

  async run(sock, msg, args, ctx) {
    const { jid, isGroup, isAdmin } = ctx;

    if (!isGroup) {
      return sock.sendMessage(jid, { text: "❌ Este comando solo funciona en grupos." }, { quoted: msg });
    }

    const data = load();
    const cmd = (ctx.command || "").toLowerCase();

    // ===============================
    // 📌 SETFICHA (CREA / REEMPLAZA)
    // ===============================
    if (cmd === "setficha") {
      if (!isAdmin) {
        return sock.sendMessage(jid, {
          text: "❌ Solo los administradores pueden configurar la ficha del grupo."
        }, { quoted: msg });
      }

      const content = args.join(" ").trim();
      if (!content) {
        return sock.sendMessage(jid, {
          text: `✏️ Escribe el texto de la ficha.\nEjemplo: *${ctx.prefix || "."}setficha Reglas del grupo...*`
        }, { quoted: msg });
      }

      data[jid] = content;
      save(data);

      return sock.sendMessage(jid, {
        text: "✅ *Ficha del grupo guardada correctamente.*"
      }, { quoted: msg });
    }

    // ===============================
    // 🗑️ DELFICHA (ELIMINAR)
    // ===============================
    if (cmd === "delficha") {
      if (!isAdmin) {
        return sock.sendMessage(jid, {
          text: "❌ Solo los administradores pueden eliminar la ficha del grupo."
        }, { quoted: msg });
      }

      if (!data[jid]) {
        return sock.sendMessage(jid, {
          text: "📄 No hay ninguna ficha guardada en este grupo para eliminar."
        }, { quoted: msg });
      }

      delete data[jid];
      save(data);

      return sock.sendMessage(jid, {
        text: "🗑️ *Ficha del grupo eliminada correctamente.*"
      }, { quoted: msg });
    }

    // ===============================
    // 📌 FICHA (MOSTRAR)
    // ===============================
    if (!data[jid]) {
      return sock.sendMessage(jid, {
        text: `📄 No hay ficha configurada en este grupo.\nLos administradores pueden crear una con *${ctx.prefix || "."}setficha <texto>*`
      }, { quoted: msg });
    }

    return sock.sendMessage(jid, {
      text: `📌 *FICHA DEL GRUPO*\n\n${data[jid]}`
    }, { quoted: msg });
  }
};
