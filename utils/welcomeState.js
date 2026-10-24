import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, "../welcome.json");

if (!fs.existsSync(file)) {
  try {
    fs.writeFileSync(file, JSON.stringify({}, null, 2));
  } catch {}
}

let cache = {};

try {
  cache = JSON.parse(fs.readFileSync(file, "utf8"));
} catch {
  cache = {};
}

let saveTimer = null;

const save = () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.writeFileSync(file, JSON.stringify(cache, null, 2));
    } catch (e) {
      console.error("❌ Error guardando welcome.json:", e);
    }
  }, 1000);
};

export const enableWelcome = jid => {
  if (!cache[jid]) cache[jid] = {};
  cache[jid].welcome = true;
  save();
};

export const disableWelcome = jid => {
  if (!cache[jid]) cache[jid] = {};
  cache[jid].welcome = false;
  save();
};

// Por defecto activado a menos que se desactive explícitamente con .welcome off
export const isWelcomeEnabled = jid => {
  return cache[jid]?.welcome !== false;
};

export const enableBye = jid => {
  if (!cache[jid]) cache[jid] = {};
  cache[jid].bye = true;
  save();
};

export const disableBye = jid => {
  if (!cache[jid]) cache[jid] = {};
  cache[jid].bye = false;
  save();
};

// Por defecto activado a menos que se desactive explícitamente con .bye off
export const isByeEnabled = jid => {
  return cache[jid]?.bye !== false;
};
