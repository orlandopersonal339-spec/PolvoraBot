import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, "../mutelist.json");

// Crear archivo si no existe
if (!fs.existsSync(file)) {
    try {
        fs.writeFileSync(file, JSON.stringify({}, null, 2));
    } catch {}
}

// 🔇 Mutear usuario en un grupo
export const muteUser = (jid, user) => {
    try {
        const data = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
        if (!data[jid]) data[jid] = [];
        if (!data[jid].includes(user)) data[jid].push(user);
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("❌ Error en muteUser:", e);
    }
};

// 🔊 Desmutear usuario
export const unmuteUser = (jid, user) => {
    try {
        const data = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
        if (!data[jid]) return;
        data[jid] = data[jid].filter(u => u !== user);
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("❌ Error en unmuteUser:", e);
    }
};

// 🔍 Ver si un usuario está muteado
export const isMuted = (jid, user) => {
    try {
        if (!fs.existsSync(file)) return false;
        const data = JSON.parse(fs.readFileSync(file, "utf8"));
        return !!data[jid]?.includes(user);
    } catch {
        return false;
    }
};
