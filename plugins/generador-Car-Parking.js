
import fs from 'fs';
import path from 'path';

const OWNER_JID = '190886046613743@lid';
const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'carparking-accounts.json');

let cola = Promise.resolve();

function conBloqueo(fn) {
  const tarea = cola.then(fn, fn);
  cola = tarea.catch(() => {});
  return tarea;
}

function leerDB() {
  fs.mkdirSync(DB_DIR, { recursive: true });

  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(
      DB_FILE,
      JSON.stringify({ disponibles: [], entregadas: [] }, null, 2)
    );
  }

  try {
    const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

    return {
      disponibles: Array.isArray(db.disponibles) ? db.disponibles : [],
      entregadas: Array.isArray(db.entregadas) ? db.entregadas : []
    };
  } catch {
    throw new Error('El archivo de cuentas está dañado. Revisa data/carparking-accounts.json.');
  }
}

function guardarDB(db) {
  fs.mkdirSync(DB_DIR, { recursive: true });

  const temporal = `${DB_FILE}.tmp`;
  fs.writeFileSync(temporal, JSON.stringify(db, null, 2));
  fs.renameSync(temporal, DB_FILE);
}

function normalizarJid(jid = '') {
  return String(jid).trim().replace(/:\d+@/, '@');
}

function obtenerRemitente(msg, ctx) {
  return (
    ctx?.sender ||
    msg?.key?.participant ||
    msg?.participant ||
    msg?.key?.remoteJid ||
    ''
  );
}

function esPropietario(msg, ctx) {
  const posibles = [
    ctx?.sender,
    msg?.key?.participant,
    msg?.participant,
    msg?.key?.remoteJid
  ].filter(Boolean);

  return posibles.some(
    jid => normalizarJid(jid) === normalizarJid(OWNER_JID)
  );
}

function obtenerTexto(msg, args) {
  if (Array.isArray(args) && args.length) return args.join(' ');

  return (
    msg?.message?.conversation ||
    msg?.message?.extendedTextMessage?.text ||
    msg?.text ||
    ''
  );
}

function obtenerChatPrivado(msg, ctx) {
  const jid = msg?.key?.participant || ctx?.sender;

  if (jid && jid.endsWith('@s.whatsapp.net')) return jid;

  return '';
}

function extraerCredenciales(texto) {
  const limpio = String(texto)
    .replace(/^[.!/]\w+\s*/, '')
    .trim();

  const coincidencia = limpio.match(
    /^(?:gmail\s*:\s*)?([^\s]+@[^ \s]+)\s+(.+)$/i
  );

  if (!coincidencia) return null;

  const correo = coincidencia[1].trim();
  const contrasena = coincidencia[2].trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return null;
  if (!contrasena) return null;

  return { correo, contrasena };
}

export default {
  commands: ['agg', 'cuenta', 'stockcuentas'],
  category: 'carparking',

  async run(sock, msg, args, ctx) {
    const texto = obtenerTexto(msg, args).trim();
    const comando = String(
      ctx?.command ||
      texto.split(/\s+/)[0]?.replace(/^[.!/]/, '') ||
      ''
    ).toLowerCase();

    const esGrupo = String(msg?.key?.remoteJid || '').endsWith('@g.us');
    const remitente = obtenerRemitente(msg, ctx);

    if (comando === 'agg') {
      if (!esPropietario(msg, ctx)) {
        return sock.sendMessage(
          msg.key.remoteJid,
          { text: '⛔ Solo el propietario puede agregar cuentas.' },
          { quoted: msg }
        );
      }

      const credenciales = extraerCredenciales(texto);

      if (!credenciales) {
        return sock.sendMessage(
          msg.key.remoteJid,
          {
            text:
              '❌ Formato incorrecto.\n\n' +
              'Usa:\n.agg correo@gmail.com contraseña123'
          },
          { quoted: msg }
        );
      }

      return conBloqueo(async () => {
        const db = leerDB();
        const correoNormalizado = credenciales.correo.toLowerCase();

        const existe = [...db.disponibles, ...db.entregadas].some(
          cuenta => cuenta.correo.toLowerCase() === correoNormalizado
        );

        if (existe) {
          return sock.sendMessage(
            msg.key.remoteJid,
            { text: '⚠️ Ese correo ya está registrado en el inventario.' },
            { quoted: msg }
          );
        }

        db.disponibles.push({
          correo: credenciales.correo,
          contrasena: credenciales.contrasena,
          agregadoEn: new Date().toISOString()
        });

        guardarDB(db);

        return sock.sendMessage(
          msg.key.remoteJid,
          {
            text:
              '✅ *CUENTA AGREGADA*\n\n' +
              `📧 Correo: ${credenciales.correo}\n` +
              `🔑 Contraseña: ${credenciales.contrasena}\n\n` +
              `🚗 Cuentas disponibles: ${db.disponibles.length}`
          },
          { quoted: msg }
        );
      });
    }

    if (comando === 'stockcuentas') {
      if (!esPropietario(msg, ctx)) {
        return sock.sendMessage(
          msg.key.remoteJid,
          { text: '⛔ Solo el propietario puede consultar el inventario.' },
          { quoted: msg }
        );
      }

      const db = leerDB();

      return sock.sendMessage(
        msg.key.remoteJid,
        {
          text:
            '🚗 *STOCK CAR PARKING*\n\n' +
            `📦 Disponibles: ${db.disponibles.length}\n` +
            `📤 Entregadas: ${db.entregadas.length}`
        },
        { quoted: msg }
      );
    }

    if (comando === 'cuenta') {
      return conBloqueo(async () => {
        const db = leerDB();

        if (db.disponibles.length === 0) {
          return sock.sendMessage(
            msg.key.remoteJid,
            { text: '❌ No hay cuentas disponibles.' },
            { quoted: msg }
          );
        }

        const cuenta = db.disponibles[0];

        // En grupos, se intenta enviar la cuenta al solicitante por privado.
        const privado = esGrupo
          ? obtenerChatPrivado(msg, ctx)
          : msg.key.remoteJid;

        if (!privado || privado.endsWith('@g.us')) {
          return sock.sendMessage(
            msg.key.remoteJid,
            {
              text:
                '⚠️ No pude identificar tu chat privado. ' +
                'Escribe al bot por privado y vuelve a usar .cuenta.'
            },
            { quoted: msg }
          );
        }

        try {
          await sock.sendMessage(privado, {
            text:
              '🚗 *CUENTA CAR PARKING*\n\n' +
              `📧 Correo: ${cuenta.correo}\n` +
              `🔑 Contraseña: ${cuenta.contrasena}\n\n` +
              '⚠️ Guarda tus datos de acceso.'
          });
        } catch {
          return sock.sendMessage(
            msg.key.remoteJid,
            {
              text:
                '❌ No pude enviarte la cuenta por privado. ' +
                'Abre un chat con el bot y vuelve a intentarlo.'
            },
            { quoted: msg }
          );
        }

        db.disponibles.shift();
        db.entregadas.push({
          ...cuenta,
          entregadaA: remitente,
          entregadaEn: new Date().toISOString()
        });

        guardarDB(db);

        if (esGrupo) {
          await sock.sendMessage(
            msg.key.remoteJid,
            { text: '✅ Te envié la cuenta por privado.' },
            { quoted: msg }
          );
        }

        return;
      });
    }
  }
};
