
import fs from 'fs';
import path from 'path';

const OWNER_JID = '190886046613743@lid';
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

function obtenerJids(msg, ctx) {
  return [
    ctx?.sender,
    ctx?.participant,
    ctx?.senderPn,
    msg?.key?.participant,
    msg?.key?.participantAlt,
    msg?.key?.participantPn,
    msg?.participant,
    msg?.key?.remoteJid
  ].filter(jid => typeof jid === 'string' && jid.length > 0);
}

function esPropietario(msg, ctx) {
  const owner = normalizarJid(OWNER_JID);

  return obtenerJids(msg, ctx).some(
    jid => normalizarJid(jid) === owner
  );
}

function obtenerRemitente(msg, ctx) {
  return (
    msg?.key?.participantAlt ||
    msg?.key?.participantPn ||
    msg?.key?.participant ||
    ctx?.senderPn ||
    ctx?.sender ||
    msg?.key?.remoteJid ||
    ''
  );
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

  if (menciones.length > 0) {
    return menciones[0];
  }

  const partes = String(texto).trim().split(/\s+/);

  // Admite un JID escrito directamente.
  const jid = partes.find(p =>
    /@(s\.whatsapp\.net|lid)$/i.test(p)
  );

  if (jid) return jid;

  // Admite un número de teléfono internacional.
  const numero = partes.find(p =>
    /^\+?\d{8,15}$/.test(p)
  );

  if (numero) {
    return numero.replace(/\D/g, '') + '@s.whatsapp.net';
  }

  // Algunos cargadores proporcionan los argumentos por separado.
  if (Array.isArray(args)) {
    const valor = args.find(p =>
      typeof p === 'string' &&
      /^\+?\d{8,15}$/.test(p)
    );

    if (valor) {
      return valor.replace(/\D/g, '') + '@s.whatsapp.net';
    }
  }

  return '';
}

function obtenerDuracion(texto, args) {
  const partes = String(texto).trim().split(/\s+/);
  const duracion = [...partes, ...(args || [])].find(p =>
    /^\d+[dhm]$/i.test(String(p))
  );

  if (!duracion) {
    return 30 * 24 * 60 * 60 * 1000;
  }

  const coincidencia = String(duracion).match(/^(\d+)([dhm])$/i);
  const cantidad = Number(coincidencia[1]);
  const unidad = coincidencia[2].toLowerCase();

  if (!Number.isSafeInteger(cantidad) || cantidad < 1) {
    return 0;
  }

  const multiplicadores = {
    d: 24 * 60 * 60 * 1000,
    h: 60 * 60 * 1000,
    m: 60 * 1000
  };

  return cantidad * multiplicadores[unidad];
}

function buscarPremium(db, jid) {
  const objetivo = normalizarJid(jid);

  return db.users.find(
    usuario => normalizarJid(usuario.jid) === objetivo
  );
}

function estaActivo(usuario) {
  return Boolean(
    usuario &&
    Number.isFinite(Date.parse(usuario.expiresAt)) &&
    Date.parse(usuario.expiresAt) > Date.now()
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

    const remitente = obtenerRemitente(msg, ctx);
    const propietario = esPropietario(msg, ctx);

    // AGREGAR PREMIUM: SOLO EL CREADOR
    if (comando === 'addprem') {
      if (!propietario) {
        return sock.sendMessage(
          chat,
          { text: '⛔ Solo el creador puede dar Premium.' },
          { quoted: msg }
        );
      }

      const objetivo = obtenerObjetivo(msg, texto, args);

      if (!objetivo) {
        return sock.sendMessage(
          chat,
          {
            text:
              '❌ Debes mencionar al usuario o escribir su número.\n\n' +
              'Ejemplos:\n' +
              '.addprem @usuario 30d\n' +
              '.addprem 5212345678901 7d\n\n' +
              'Si no indicas duración, se asignan 30 días.'
          },
          { quoted: msg }
        );
      }

      const duracion = obtenerDuracion(texto, args);

      if (!duracion) {
        return sock.sendMessage(
          chat,
          { text: '❌ Duración no válida. Ejemplos: 30d, 12h o 60m.' },
          { quoted: msg }
        );
      }

      return conBloqueo(async () => {
        const db = leerDB();
        limpiarExpirados(db);

        const jid = normalizarJid(objetivo);
        const existente = buscarPremium(db, jid);

        const ahora = Date.now();
        const base = existente
          ? Math.max(ahora, Date.parse(existente.expiresAt))
          : ahora;

        const expiresAt = new Date(base + duracion).toISOString();

        if (existente) {
          existente.expiresAt = expiresAt;
          existente.addedBy = remitente;
          existente.updatedAt = new Date().toISOString();
        } else {
          db.users.push({
            jid,
            addedAt: new Date().toISOString(),
            expiresAt,
            addedBy: remitente
          });
        }

        guardarDB(db);

        return sock.sendMessage(
          chat,
          {
            text:
              '💎 *PREMIUM ACTIVADO*\n\n' +
              `👤 Usuario: ${jid}\n` +
              `⏳ Duración agregada: ${Math.floor(duracion / 60000)} minutos\n` +
              `📅 Vence: ${formatoFecha(expiresAt)}`
          },
          { quoted: msg }
        );
      });
    }

    // QUITAR PREMIUM: SOLO EL CREADOR
    if (comando === 'delprem') {
      if (!propietario) {
        return sock.sendMessage(
          chat,
          { text: '⛔ Solo el creador puede quitar Premium.' },
          { quoted: msg }
        );
      }

      const objetivo = obtenerObjetivo(msg, texto, args);

      if (!objetivo) {
        return sock.sendMessage(
          chat,
          { text: '❌ Menciona al usuario o escribe su número.\nEjemplo: .delprem @usuario' },
          { quoted: msg }
        );
      }

      return conBloqueo(async () => {
        const db = leerDB();
        const jid = normalizarJid(objetivo);
        const antes = db.users.length;

        db.users = db.users.filter(
          usuario => normalizarJid(usuario.jid) !== jid
        );

        guardarDB(db);

        return sock.sendMessage(
          chat,
          {
            text: antes === db.users.length
              ? '⚠️ Ese usuario no estaba en la lista Premium.'
              : `✅ Se eliminó Premium de ${jid}.`
          },
          { quoted: msg }
        );
      });
    }

    // LISTAR PREMIUM ACTIVOS: SOLO EL CREADOR
    if (comando === 'listaprem') {
      if (!propietario) {
        return sock.sendMessage(
          chat,
          { text: '⛔ Solo el creador puede consultar la lista Premium.' },
          { quoted: msg }
        );
      }

      const db = leerDB();
      limpiarExpirados(db);
      guardarDB(db);

      if (db.users.length === 0) {
        return sock.sendMessage(
          chat,
          { text: '💎 No hay usuarios Premium activos.' },
          { quoted: msg }
        );
      }

      const lista = db.users.map((usuario, i) =>
        `${i + 1}. ${usuario.jid}\n   📅 Vence: ${formatoFecha(usuario.expiresAt)}`
      ).join('\n\n');

      return sock.sendMessage(
        chat,
        {
          text:
            '💎 *USUARIOS PREMIUM ACTIVOS*\n\n' +
            `${lista}\n\n` +
            `👥 Total: ${db.users.length}`
        },
        { quoted: msg }
      );
    }

    // CONSULTAR ESTADO PREMIUM
    if (comando === 'prem') {
      const db = leerDB();
      limpiarExpirados(db);
      guardarDB(db);

      const objetivo = propietario
        ? (obtenerObjetivo(msg, texto, args) || remitente)
        : remitente;

      const usuario = buscarPremium(db, objetivo);

      if (!estaActivo(usuario)) {
        return sock.sendMessage(
          chat,
          {
            text:
              '❌ *NO TIENES PREMIUM ACTIVO*\n\n' +
              'Contacta al creador del bot para obtener acceso.'
          },
          { quoted: msg }
        );
      }

      return sock.sendMessage(
        chat,
        {
          text:
            '💎 *PREMIUM ACTIVO*\n\n' +
            `👤 Usuario: ${usuario.jid}\n` +
            `📅 Vence: ${formatoFecha(usuario.expiresAt)}`
        },
        { quoted: msg }
      );
    }
  }
};
