import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(__dirname, "../modoadmins.json");

let state = {};

// Cargar estado inicial si existe
if (fs.existsSync(FILE)) {
  try {
    state = JSON.parse(fs.readFileSync(FILE, "utf-8"));
  } catch {
    state = {};
  }
}

// 🔍 Consultar por grupo
export const isModoAdminsEnabled = (jid) => {
  return state[jid] === true;
};

// 🔧 Setear por grupo
export const setModoAdmins = (jid, value) => {
  state[jid] = !!value;
  try {
    fs.writeFileSync(FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    console.error("❌ Error guardando modoadmins.json:", e);
  }
};
