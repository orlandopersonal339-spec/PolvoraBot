
import fs from 'fs';
import path from 'path';
import config from '../config.js';

const OWNER_IDS = [
  '190886046613743@lid',
  ...(config.owners || []).map(numero =>
    String(numero).includes('@')
      ? String(numero)
      : `${String(numero).replace(/\D/g, '')}@s.whatsapp.net`
  )
];

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'premium-users.json');

let cola = Promise.resolve();

function conBloqueo(fn) {
  const tarea = cola.then(fn, fn);
  cola = tarea.catch(() => {});
  return tarea;
}

function normalizarJid(jid = '') {
  return String(jid).trim().replace(/:\d+@/, '@');
}

function obtenerJids(msg, ctx) {
  const remoto = msg?.key?.remoteJid;

  return [
    ctx?.sender,
    ctx?.participant,
    ctx?.senderPn,
    ctx?.jid,
    msg?.key?.participant,
    msg?.key?.participantAlt,
    msg?.key?.participantPn,
    msg?.participant,
    ...(remoto && !remoto.endsWith('@g.us') ? [remoto] : [])
  ]
    .filter(jid => typeof jid === 'string' && jid.length > 0)
    .map(normalizarJid);
}

function esPropietario(msg, ctx) {
  const propietarios = OWNER_IDS.map(normalizarJid);
  return obtenerJids(msg, ctx).some(jid => propietarios.includes(jid));
}

function obtenerRemitente(msg, ctx) {
  return obtenerJids(msg, ctx)[0] || '';
}

function leerDB() {
  fs.mkdirSync(DB_DIR, { recursive: true });

  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(
      DB_FILE,
      JSON.stringify({ users: [] }, null, 2)
    );
  }

  const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

  return {
    users: Array.isArray(db.users) ? db.users : []
  };
}

function guardarDB(db) {
  fs.mkdirSync(DB_DIR, { recursive: true });

  const temporal = `${DB_FILE}.tmp`;
  fs.writeFileSync(temporal, JSON.stringify(db, null, 2));
  fs.renameSync(temporal, DB_FILE);
}

function obtenerTexto(msg, args) {
  if (Array.isArray(args) && args.length) {
    return args.join(' ');
  }

  return (
    msg?.message?.conversation ||
    msg?.message?.extendedTextMessage?.text ||
    msg?.text ||
    ''
  );
}

function obtenerMenciones(msg) {
  const mensaje = msg?.message || {};
  const contexto =
    mensaje.extendedTextMessage?.contextInfo ||
    mensaje.imageMessage?.contextInfo ||
    mensaje.videoMessage?.contextInfo ||
    mensaje.documentMessage?.contextInfo ||
    {};

  return Array.isArray(contexto.mentionedJid)
    ? contexto.mentionedJid
    : [];
}

function obtenerObjetivo(msg, texto, args) {
  const menciones = obtenerMenciones(msg);
  if (menciones.length) return menciones[0];

  const partes = String(texto).trim().split(/\s+/);

  const jid = partes.find(p =>
    /@(s\.whatsapp\.net|lid)$/i.test(p)
  );
  if (jid) return jid;

  const numero = [...partes, ...(args || [])].find(p =>
    /^\+?\d{8,15}$/.test(String(p))
  );

  if (numero) {
    return String(numero).replace(/\D/g, '') + '@s.whatsapp.net';
  }

  return '';
}

function obtenerDuracion(texto, args) {
  const partes = String(texto).trim().split(/\s+/);
  const valor = [...partes, ...(args || [])].find(p =>
    /^\d+[dhm]$/i.test(String(p))
  );

  if (!valor) return 30 * 24 * 60 * 60 * 1000;

  const coincidencia = String(valor).match(/^(\d+)([dhm])$/i);
  const cantidad = Number(coincidencia[1]);
  const unidad = coincidencia[2].toLowerCase();

  if (!Number.isSafeInteger(cantidad) || cantidad < 1) return 0;

  const multiplicadores = {
    d: 24 * 60 * 60 * 1000,
    h: 60 * 60 * 1000,
    m: 60 * 1000
  };

  return cantidad * multiplicadores[unidad];
}

function obtenerExpiracion(usuario) {
  const valor = usuario?.expiresAt;
  if (valor == null) return NaN;

  if (typeof valor === 'number') return valor;

  const texto = String(valor).trim();

  if (/^\d+$/.test(texto)) return Number(texto);

  return Date.parse(texto);
}

function estaActivo(usuario) {
  const expiracion = obtenerExpiracion(usuario);
  return Number.isFinite(expiracion) && expiracion > Date.now();
}

function buscarPremium(db, jid) {
  const objetivo = normalizarJid(jid);
  return db.users.find(usuario =>
    normalizarJid(usuario?.jid || '') === objetivo
  );
}

function formatoFecha(fecha) {
  return new Date(fecha).toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Mexico_City'
  });
}

function limpiarExpirados(db) {
  db.users = db.users.filter(estaActivo);
}

export default {
  commands: ['addprem', 'delprem', 'listaprem', 'prem'],
  category: 'premium',

  async run(sock, msg, args, ctx) {
    const chat = msg?.key?.remoteJid;
    if (!chat) return;

    const texto = obtenerTexto(msg, args).trim();
    const comando = String(
      ctx?.command ||
      texto.split(/\s+/)[0]?.replace(/^[.!/]/, '') ||
      ''
    ).toLowerCase();

    const propietario = esPropietario(msg, ctx);
    const remitente = obtenerRemitente(msg, ctx);

    if (comando === 'addprem') {
      if (!propietario) {
        return sock.sendMessage(chat, {
          text: '⛔ Solo el creador puede dar Premium.'
        }, { quoted: msg });
      }

      const objetivo = obtenerObjetivo(msg, texto, args);
      if (!objetivo) {
        return sock.sendMessage(chat, {
          text:
            '❌ Menciona al usuario o escribe su número.\n\n' +
            'Ejemplos:\n.addprem 5212345678901 30d\n.addprem 5212345678901 7d'
        }, { quoted: msg });
      }

      const duracion = obtenerDuracion(texto, args);
      if (!duracion) {
        return sock.sendMessage(chat, {
          text: '❌ Duración no válida. Usa 30d, 12h o 60m.'
        }, { quoted: msg });
      }

      return conBloqueo(async () => {
        const db = leerDB();
        limpiarExpirados(db);

        const jid = normalizarJid(objetivo);
        const existente = buscarPremium(db, jid);
        const ahora = Date.now();
        const expiracionAnterior = existente
          ? obtenerExpiracion(existente)
          : ahora;

        const base = Math.max(
          ahora,
          Number.isFinite(expiracionAnterior) ? expiracionAnterior : ahora
        );

        const expiresAt = new Date(base + duracion).toISOString();

        if (existente) {
          existente.expiresAt = expiresAt;
          existente.updatedAt = new Date().toISOString();
          existente.addedBy = remitente;
        } else {
          db.users.push({
            jid,
            addedAt: new Date().toISOString(),
            expiresAt,
            addedBy: remitente
          });
        }

        guardarDB(db);

        return sock.sendMessage(chat, {
          text:
            '💎 *PREMIUM ACTIVADO*\n\n' +
            `👤 Usuario: ${jid}\n` +
            `⏳ Duración: ${Math.floor(duracion / 60000)} minutos\n` +
            `📅 Vence: ${formatoFecha(expiresAt)}`
        }, { quoted: msg });
      });
    }

    if (comando === 'delprem') {
      if (!propietario) {
        return sock.sendMessage(chat, {
          text: '⛔ Solo el creador puede quitar Premium.'
        }, { quoted: msg });
      }

      const objetivo = obtenerObjetivo(msg, texto, args);
      if (!objetivo) {
        return sock.sendMessage(chat, {
          text: '❌ Escribe el número o menciona al usuario.'
        }, { quoted: msg });
      }

      return conBloqueo(async () => {
        const db = leerDB();
        const jid = normalizarJid(objetivo);
        const antes = db.users.length;

        db.users = db.users.filter(
          usuario => normalizarJid(usuario?.jid || '') !== jid
        );

        guardarDB(db);

        return sock.sendMessage(chat, {
          text: antes === db.users.length
            ? '⚠️ Ese usuario no estaba en la lista Premium.'
            : `✅ Se eliminó Premium de ${jid}.`
        }, { quoted: msg });
      });
    }

    if (comando === 'listaprem') {
      if (!propietario) {
        return sock.sendMessage(chat, {
          text: '⛔ Solo el creador puede consultar la lista Premium.'
        }, { quoted: msg });
      }

      const db = leerDB();
      limpiarExpirados(db);
      guardarDB(db);

      if (!db.users.length) {
        return sock.sendMessage(chat, {
          text: '💎 No hay usuarios Premium activos.'
        }, { quoted: msg });
      }

      const lista = db.users.map((usuario, i) =>
        `${i + 1}. ${usuario.jid}\n   📅 Vence: ${formatoFecha(obtenerExpiracion(usuario))}`
      ).join('\n\n');

      return sock.sendMessage(chat, {
        text: `💎 *USUARIOS PREMIUM ACTIVOS*\n\n${lista}\n\n👥 Total: ${db.users.length}`
      }, { quoted: msg });
    }

    if (comando === 'prem') {
      const db = leerDB();
      limpiarExpirados(db);
      guardarDB(db);

      const objetivo = propietario
        ? (obtenerObjetivo(msg, texto, args) || remitente)
        : remitente;

      const usuario = buscarPremium(db, objetivo);

      if (!estaActivo(usuario)) {
        return sock.sendMessage(chat, {
          text:
            propietario
              ? '👑 Eres el creador del bot. No necesitas Premium para administrar el bot.'
              : '❌ *NO TIENES PREMIUM ACTIVO*\n\nContacta al creador del bot para obtener acceso.'
        }, { quoted: msg });
      }

      return sock.sendMessage(chat, {
        text:
          '💎 *PREMIUM ACTIVO*\n\n' +
          `👤 Usuario: ${usuario.jid}\n` +
          `📅 Vence: ${formatoFecha(obtenerExpiracion(usuario))}`
      }, { quoted: msg });
    }
  }
};
