
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// DATOS DEL CREADOR
const CREATOR_JID = "190886046613743@lid";
const CREATOR_NAME = "Orlando157";

export default {
    commands: ["menu", "help"],
    admin: false,
    category: "info",
    description: "Muestra el menú de SonicBot Pro",

    async run(sock, msg, args, ctx) {
        const jid = ctx?.jid || msg?.key?.remoteJid;
        if (!jid) return;

        const user =
            ctx?.sender ||
            msg?.key?.participant ||
            "";

        const username = user.split("@")[0] || "Usuario";

        const menuImg = "https://files.catbox.moe/d4d83y.png";
        const prefix = ctx?.prefix || ".";

        // ===============================
        // SALUDO AUTOMÁTICO MÉXICO
        // ===============================

        const hora = Number(
            new Date().toLocaleString("es-MX", {
                timeZone: "America/Mexico_City",
                hour: "2-digit",
                hour12: false
            })
        );

        let saludo;

        if (hora >= 5 && hora < 12) {
            saludo = "🌅 ¡BUENOS DÍAS!";
        } else if (hora >= 12 && hora < 19) {
            saludo = "☀️ ¡BUENAS TARDES!";
        } else {
            saludo = "🌙 ¡BUENAS NOCHES!";
        }

        // ===============================
        // DETECTAR AL CREADOR
        // ===============================

        let creadorPresente = false;
        let creadorMencion = null;

        if (jid.endsWith("@g.us")) {
            try {
                const metadata = await sock.groupMetadata(jid);
                const participantes = metadata.participants || [];

                const normalizar = id =>
                    String(id || "")
                        .split(":")[0]
                        .toLowerCase();

                const creador = participantes.find(p => {
                    const identificadores = [
                        p.id,
                        p.jid,
                        p.lid,
                        p.phoneNumber
                    ].filter(Boolean);

                    return identificadores.some(id =>
                        normalizar(id) === normalizar(CREATOR_JID)
                    );
                });

                if (creador) {
                    creadorPresente = true;

                    creadorMencion =
                        creador.id ||
                        creador.lid ||
                        CREATOR_JID;
                }

            } catch (error) {
                console.error(
                    "Error verificando al creador:",
                    error.message
                );
            }
        }

        // ===============================
        // LEER TODOS LOS PLUGINS
        // ===============================

        const pluginsDir = __dirname;

        const files = fs.existsSync(pluginsDir)
            ? fs.readdirSync(pluginsDir).filter(f =>
                f.endsWith(".js") &&
                f !== path.basename(fileURLToPath(import.meta.url))
            )
            : [];

        const categorias = {
            admin: new Set(),
            owner: new Set(),
            info: new Set(),
            grupo: new Set(),
            multi: new Set(),
            onoff: new Set(),
            funny: new Set(),
            descargas: new Set(),
            tools: new Set(),
            ventas: new Set(),
            hot: new Set(),
            premium: new Set()
        };

        for (const file of files) {
            try {
                const ruta = path.join(pluginsDir, file);
                const fileUrl = pathToFileURL(ruta).href;

                const modulo = await import(fileUrl);
                const plugin = modulo.default;

                if (!plugin) continue;

                const cmds =
                    plugin.commands ||
                    plugin.command ||
                    plugin.cmd;

                if (!cmds) continue;

                const lista = Array.isArray(cmds)
                    ? cmds
                    : [cmds];

                const categoria = String(
                    plugin.category || "info"
                ).toLowerCase().trim();

                let destino = "info";

                switch (categoria) {
                    case "admin":
                        destino = "admin";
                        break;

                    case "owner":
                        destino = "owner";
                        break;

                    case "info":
                        destino = "info";
                        break;

                    case "grupo":
                    case "group":
                        destino = "grupo";
                        break;

                    case "multi":
                    case "multimedia":
                        destino = "multi";
                        break;

                    case "on-off":
                    case "onoff":
                    case "on/off":
                        destino = "onoff";
                        break;

                    case "funny":
                    case "fun":
                        destino = "funny";
                        break;

                    case "descargas":
                    case "download":
                    case "downloads":
                        destino = "descargas";
                        break;

                    case "tools":
                    case "herramientas":
                        destino = "tools";
                        break;

                    case "ventas":
                    case "store":
                        destino = "ventas";
                        break;

                    case "+18":
                    case "hot":
                    case "nsfw":
                        destino = "hot";
                        break;

                    case "premium":
                        destino = "premium";
                        break;
                }

                for (const comando of lista) {
                    if (
                        typeof comando === "string" &&
                        comando.trim()
                    ) {
                        categorias[destino].add(
                            comando.trim().replace(/^[.!/#]+/, "")
                        );
                    }
                }

            } catch (e) {
                console.error(
                    `Error leyendo ${file}:`,
                    e.message
                );
            }
        }

        // ===============================
        // CONSTRUIR SECCIONES
        // ===============================

        const orden = [
            ["admin", "🛡️ ADMINISTRACIÓN"],
            ["grupo", "👥 GRUPOS"],
            ["descargas", "📥 DESCARGAS"],
            ["multi", "🎨 MULTIMEDIA"],
            ["tools", "🧰 HERRAMIENTAS"],
            ["funny", "🎮 ENTRETENIMIENTO"],
            ["info", "📚 INFORMACIÓN"],
            ["onoff", "⚙️ ON / OFF"],
            ["ventas", "💰 VENTAS"],
            ["premium", "💎 PREMIUM"],
            ["owner", "👑 OWNER"],
            ["hot", "🔞 +18"]
        ];

        let secciones = [];

        for (const [key, titulo] of orden) {
            const comandos = [...categorias[key]]
                .sort((a, b) => a.localeCompare(b));

            if (!comandos.length) continue;

            const lista = comandos
                .map(c => `│  › ${prefix}${c}`)
                .join("\n");

            secciones.push(
                `╭━━〔 ${titulo} 〕\n${lista}\n╰━━━━━━━━━━━━━━`
            );
        }

        // ===============================
        // INFORMACIÓN DEL CREADOR
        // ===============================

        const creadorTexto = creadorPresente
            ? `@${String(creadorMencion).split("@")[0]}`
            : CREATOR_NAME;

        // ===============================
        // MENÚ SONICBOT PRO
        // ===============================

        const texto = `╭━━━〔 🤖 〕━━━╮
   𝗦𝗢𝗡𝗜𝗖𝗕𝗢𝗧 𝗣𝗥𝗢
╰━━━━━━━━━━━━━━╯

${saludo}

👋 Hola @${username}

╭━━〔 📌 INFORMACIÓN 〕
│
│ 👤 Usuario: @${username}
│ ⚡ Estado: Online
│ 📸 IG: instagram.com/orland0157
│ 👑 Creador: ${creadorTexto}
│ 📂 Categorías: ${secciones.length}
│ 🔹 Prefijo: ${prefix}
│
╰━━━━━━━━━━━━━━

${secciones.join("\n\n")}

╭━━〔 📸 REDES 〕
│ Instagram:
│ instagram.com/orland0157
│
│ 💬 Envía un mensaje para recibir ayuda
╰━━━━━━━━━━━━━━

     𝗦𝗢𝗡𝗜𝗖𝗕𝗢𝗧 𝗣𝗥𝗢 🤖`;

        // ===============================
        // PREPARAR MENCIONES
        // ===============================

        const menciones = [];

        if (user) {
            menciones.push(user);
        }

        if (creadorPresente && creadorMencion) {
            if (!menciones.includes(creadorMencion)) {
                menciones.push(creadorMencion);
            }
        }

        // ===============================
        // ENVIAR MENÚ CON IMAGEN
        // ===============================

        try {
            await sock.sendMessage(jid, {
                image: { url: menuImg },
                caption: texto,
                mentions: menciones
            }, { quoted: msg });

        } catch (error) {
            console.error("Error enviando imagen:", error);

            await sock.sendMessage(jid, {
                text: texto,
                mentions: menciones
            }, { quoted: msg });
        }
    }
};
