import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, "cmd-state.json");

// Crear archivo si no existe
if (!fs.existsSync(file)) {
    try {
        fs.writeFileSync(file, JSON.stringify({
            commands: {},
            antilink: {}
        }, null, 2));
    } catch {}
}

// ===============================
// ESTADO DE COMANDOS
// ===============================
export const getState = (cmd) => {
    try {
        const data = JSON.parse(fs.readFileSync(file, "utf8"));
        return typeof data.commands?.[cmd] === "boolean"
            ? data.commands[cmd]
            : true; // por defecto ON
    } catch {
        return true;
    }
};

export const setState = (cmd, value) => {
    try {
        const data = JSON.parse(fs.readFileSync(file, "utf8"));
        if (!data.commands) data.commands = {};
        data.commands[cmd] = !!value;
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("❌ Error en setState:", e);
    }
};

// ===============================
// ESTADO ANTILINK POR GRUPO
// ===============================
export const isAntilinkEnabled = (jid) => {
    try {
        const data = JSON.parse(fs.readFileSync(file, "utf8"));
        return data.antilink?.[jid] === true;
    } catch {
        return false;
    }
};

export const setAntilink = (jid, value) => {
    try {
        const data = JSON.parse(fs.readFileSync(file, "utf8"));
        if (!data.antilink) data.antilink = {};
        data.antilink[jid] = !!value;
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("❌ Error en setAntilink:", e);
    }
};
