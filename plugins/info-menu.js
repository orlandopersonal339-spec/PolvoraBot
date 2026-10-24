import fs from “fs”;
import path from “path”;
import { fileURLToPath, pathToFileURL } from “url”;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
commands: [“menu”, “help”],
admin: false,
category: “info”,
description: “Muestra la lista de comandos disponibles”,

async run(sock, msg, args, ctx = {}) {
    const jid = ctx?.jid || msg?.key?.remoteJid;
    if (!jid) return;
    const user = ctx?.sender || msg?.key?.participant || jid;
    const username = msg?.pushName || user.split("@")[0] || "Usuario";
    const prefix = ctx?.prefix || ".";
    const menuImg = "https://files.catbox.moe/d4d83y.png";
    const categorias = {
        admin: [],
        owner: [],
        info: [],
        grupo: [],
        multi: [],
        onoff: [],
        funny: [],
        descargas: [],
        tools: [],
        ventas: [],
        hot: []
    };
    const aliasCategoria = {
        group: "grupo",
        groups: "grupo",
        grupos: "grupo",
        "on-off": "onoff",
        "on/off": "onoff",
        fun: "funny",
        diversion: "funny",
        diversión: "funny",
        download: "descargas",
        downloads: "descargas",
        herramientas: "tools",
        herramienta: "tools",
        store: "ventas",
        tienda: "ventas",
        nsfw: "hot",
        "+18": "hot"
    };
    function buscarArchivos(dir, resultado = []) {
        if (!fs.existsSync(dir)) return resultado;
        let elementos;
        try {
            elementos = fs.readdirSync(dir, { withFileTypes: true });
        } catch (error) {
            console.error("[MENU] Error al leer carpeta:", dir, error.message);
            return resultado;
        }
        for (const item of elementos) {
            const fullPath = path.join(dir, item.name);
            if (item.isDirectory()) {
                if (!["node_modules", ".git"].includes(item.name)) {
                    buscarArchivos(fullPath, resultado);
                }
            } else if (
                item.isFile() &&
                item.name.endsWith(".js") &&
                path.resolve(fullPath) !== path.resolve(__filename)
            ) {
                resultado.push(fullPath);
            }
        }
        return resultado;
    }
    const archivos = buscarArchivos(__dirname);
    for (const archivo of archivos) {
        try {
            const modulo = await import(pathToFileURL(archivo).href);
            const plugin = modulo.default;
            if (!plugin || typeof plugin !== "object") continue;
            const comandos = plugin.commands ?? plugin.command ?? plugin.cmd;
            if (!comandos) continue;
            const lista = (Array.isArray(comandos) ? comandos : [comandos])
                .filter(c => typeof c === "string" && c.trim());
            let categoria = String(
                plugin.category || plugin.categoria || "info"
            ).trim().toLowerCase();
            categoria = aliasCategoria[categoria] || categoria;
            if (!categorias[categoria]) {
                if (/admin|moderador/.test(categoria)) categoria = "admin";
                else if (/owner|propietario|dueño/.test(categoria)) categoria = "owner";
                else if (/descarga|download/.test(categoria)) categoria = "descargas";
                else if (/grupo|group/.test(categoria)) categoria = "grupo";
                else if (/multi|media/.test(categoria)) categoria = "multi";
                else if (/venta|store/.test(categoria)) categoria = "ventas";
                else if (/hot|adult|nsfw/.test(categoria)) categoria = "hot";
                else if (/tool|herramienta|utilidad/.test(categoria)) categoria = "tools";
                else if (/fun|juego|meme/.test(categoria)) categoria = "funny";
                else if (/on.?off|activar|desactivar/.test(categoria)) categoria = "onoff";
                else categoria = "info";
            }
            for (const comando of lista) {
                const nombre = comando.trim().replace(/^[.!/#]+/, "");
                if (!nombre) continue;
                if (["menu", "help"].includes(nombre.toLowerCase())) continue;
                categorias[categoria].push(nombre);
            }
        } catch (error) {
            console.error(`[MENU] Error leyendo ${path.basename(archivo)}:`, error.message);
        }
    }
    const seccion = (titulo, comandos) => {
        const unicos = [...new Set(comandos)].sort((a, b) => a.localeCompare(b));
        return unicos.length
            ? `├──「 ${titulo} 」\n${unicos.map(c => `│ • ${prefix}${c}`).join("\n")}`
            : null;
    };
    const ahora = new Date();
    const dia = ahora.toLocaleDateString("es-MX", {
        weekday: "long"
    });
    const fecha = ahora.toLocaleDateString("es-MX", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
    const tiempoActivo = ms => {
        const total = Math.floor(ms / 1000);
        const horas = Math.floor(total / 3600);
        const minutos = Math.floor((total % 3600) / 60);
        const segundos = total % 60;
        return [horas, minutos, segundos]
            .map(n => String(n).padStart(2, "0"))
            .join(":");
    };
    const chats = ctx?.store?.chats || global.store?.chats || {};
    const totalChats = Object.keys(chats).length;
    const secciones = [
        seccion("🛠️ ADMIN", categorias.admin),
        seccion("👥 GRUPO", categorias.grupo),
        seccion("📥 DESCARGAS", categorias.descargas),
        seccion("🔀 MULTIMEDIA", categorias.multi),
        seccion("🧰 HERRAMIENTAS", categorias.tools),
        seccion("😂 FUNNY", categorias.funny),
        seccion("📘 INFO", categorias.info),
        seccion("🔧 ON / OFF", categorias.onoff),
        seccion("👑 OWNER", categorias.owner),
        seccion("🛍️ VENTAS", categorias.ventas),
        seccion("🔞 +18", categorias.hot)
    ].filter(Boolean);
    const texto = `

╭━─━──────━─━╮
╰╮ » 𝗦𝗼𝗻𝗶𝗰𝗕𝗼𝘁 𝗣𝗿𝗼
╭━─━──────━─━╯
┊› ¡𝙂𝙤𝙤𝙙 𝙉𝙞𝙜𝙝𝙩! 🌜☁
┊› 𝖧𝗈𝗅𝖺 ${username}
┊› 𝖡𝗈𝗍: SonicBot Pro 🤖
┊› 𝖨𝖦: instagram.com/orland0157 📸
┊› 𝖤𝗇𝗏𝗂𝖺 𝗆𝗌𝗃 𝗉𝖺𝗋𝖺 𝖺𝗒𝗎𝖽𝖺
┊› 𝖢𝗎𝗆𝗉𝗅𝖾 𝗍𝗎𝗌 𝗇𝖾𝖼𝖾𝗌𝗂𝖽𝖺𝖽𝖾𝗌
┊› 𝖤𝗇 𝗍𝗎𝗌 𝗀𝗋𝗎𝗉𝗈𝗌 𝖽𝖾 𝖶𝖠 🧃
╰─────────────

╭━─━──────━─━╮
╰╮ » 𝗥𝗘𝗣𝗢𝗥𝗧𝗔𝗝𝗘 📡
╭━─━──────━─━╯
┊» 𝖳𝗂𝖾𝗆𝗉𝗈 𝖺𝖼𝗍𝗂𝗏𝗈: ${tiempoActivo(process.uptime() * 1000)}
┊» 𝖫𝖾𝗇𝗀𝗎𝖺𝗃𝖾: JavaScript
┊» 𝖧𝗈𝗌𝗍: localhost
┊» 𝖯𝗅𝖺𝗍𝖿𝗈𝗋𝗆𝖺: android
┊» 𝖳𝗈𝗍𝖺𝗅 𝖽𝖾 𝖼𝗁𝖺𝗍𝗌: ${totalChats}
┊» 𝖠𝗉𝗈𝖽𝗈: Orlando157
┊» 𝖣𝗂𝖺: ${dia}
┊» 𝖥𝖾𝖼𝗁𝖺: ${fecha}
╰─────────────

╭━─━──────━─━╮
╰╮ » 𝗖𝗢𝗠𝗔𝗡𝗗𝗢𝗦 📚
╭━─━──────━─━╯
${secciones.join(”\n\n”) || “│ • No se encontraron comandos en esta carpeta”}
╰─────────────
`.trim();

    try {
        await sock.sendMessage(
            jid,
            {
                image: { url: menuImg },
                caption: texto,
                mentions: user ? [user] : []
            },
            { quoted: msg }
        );
    } catch (error) {
        console.error("[MENU] Error enviando imagen:", error.message);
        await sock.sendMessage(
            jid,
            {
                text: texto,
                mentions: user ? [user] : []
            },
            { quoted: msg }
        );
    }
}

};