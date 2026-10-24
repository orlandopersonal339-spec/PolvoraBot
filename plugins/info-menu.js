import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
    commands: ["menu", "help"],
    admin: false,
    category: "info",
    description: "Muestra la lista de comandos disponibles",

    async run(sock, msg, args, ctx) {
        const jid = ctx.jid;

        let user = ctx.sender;
        let username = user.split("@")[0];

        const menuImg = "https://files.catbox.moe/d4d83y.png";

        // ===============================
        // LEER TODOS LOS PLUGINS
        // ===============================
        const pluginsDir = __dirname;
        const files = fs.existsSync(pluginsDir)
            ? fs.readdirSync(pluginsDir).filter(f => f.endsWith(".js"))
            : [];

        let admin = [];
        let owner = [];
        let info = [];
        let grupo = [];
        let multi = [];
        let onoff = [];
        let funny = [];
        let descargas = [];
        let tools = [];
        let ventas = [];
        let hot = [];

        for (let file of files) {
            try {
                const fileUrl = pathToFileURL(path.join(pluginsDir, file)).href;
                const module = await import(fileUrl);
                const plugin = module.default;
                if (!plugin) continue;

                const cmds = plugin.commands || plugin.command || plugin.cmd;
                const categoria = (plugin.category || "info").toLowerCase();

                if (!cmds) continue;

                const lista = Array.isArray(cmds) ? cmds : [cmds];

                switch (categoria) {
                    case "admin":
                        admin.push(...lista);
                        break;
                    case "owner":
                        owner.push(...lista);
                        break;
                    case "info":
                        info.push(...lista);
                        break;
                    case "grupo":
                        grupo.push(...lista);
                        break;
                    case "multi":
                        multi.push(...lista);
                        break;
                    case "on-off":
                    case "onoff":
                    case "on/off":
                        onoff.push(...lista);
                        break;
                    case "funny":
                    case "fun":
                        funny.push(...lista);
                        break;
                    case "descargas":
                    case "download":
                        descargas.push(...lista);
                        break;
                    case "tools":
                    case "herramientas":
                        tools.push(...lista);
                        break;
                    case "ventas":
                    case "store":
                        ventas.push(...lista);
                        break;
                    case "+18":
                    case "hot":
                    case "nsfw":
                        hot.push(...lista);
                        break;
                    default:
                        info.push(...lista);
                        break;
                }

            } catch (e) {
                // error silencioso al leer un plugin
            }
        }

        const prefix = ctx.prefix || ".";

        const sections = [
            admin.length ? `├──「 🛠️ ADMIN 」\n${[...new Set(admin)].map(c => `│ • ${prefix}${c}`).join("\n")}` : null,
            grupo.length ? `├──「 👥 GRUPO 」\n${[...new Set(grupo)].map(c => `│ • ${prefix}${c}`).join("\n")}` : null,
            descargas.length ? `├──「 📥 DESCARGAS 」\n${[...new Set(descargas)].map(c => `│ • ${prefix}${c}`).join("\n")}` : null,
            multi.length ? `├──「 🔀 MULTIMEDIA 」\n${[...new Set(multi)].map(c => `│ • ${prefix}${c}`).join("\n")}` : null,
            tools.length ? `├──「 🧰 HERRAMIENTAS 」\n${[...new Set(tools)].map(c => `│ • ${prefix}${c}`).join("\n")}` : null,
            funny.length ? `├──「 😂 FUNNY 」\n${[...new Set(funny)].map(c => `│ • ${prefix}${c}`).join("\n")}` : null,
            info.length ? `├──「 📘 INFO 」\n${[...new Set(info)].map(c => `│ • ${prefix}${c}`).join("\n")}` : null,
            onoff.length ? `├──「 🔧 ON / OFF 」\n${[...new Set(onoff)].map(c => `│ • ${prefix}${c}`).join("\n")}` : null,
            owner.length ? `├──「 👑 OWNER 」\n${[...new Set(owner)].map(c => `│ • ${prefix}${c}`).join("\n")}` : null,
            ventas.length ? `├──「 🛍️ VENTAS 」\n│ • ${prefix}menustore` : null,
            hot.length ? `├──「 🔞 +18 」\n${[...new Set(hot)].map(c => `│ • ${prefix}${c}`).join("\n")}` : null,
        ].filter(Boolean).join("\n\n");

        const texto = `
╭───「 🤖 SonicBot-ST 」───
│ 👤 Usuario: @${username}
│ 📅 Fecha: ${new Date().toLocaleDateString("es-MX")}
│
${sections}

╰────────────────────●
`.trim();

        try {
            await sock.sendMessage(jid, {
                image: { url: menuImg },
                caption: texto,
                mentions: [user]
            }, { quoted: msg });
        } catch (e) {
            // Si la imagen falla (red o timeout), enviar solo texto
            await sock.sendMessage(jid, {
                text: texto,
                mentions: [user]
            }, { quoted: msg });
        }
    }
};
