
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

  const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

  return {
    disponibles: Array.isArray(db.disponibles) ? db.disponibles : [],
    entregadas: Array.isArray(db.entregadas) ? db.entregadas : []
  };
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

function esPropietario(msg, ctx) {
  const posibles = [
    ctx?.sender,
    ctx?.participant,
    msg?.key?.participant,
    msg?.key?.participantAlt,
    msg?.participant,
    msg?.key?.remoteJid
  ].filter(Boolean);

  return posibles.some(
    jid => normalizarJid(jid) === normalizarJid(OWNER_JID)
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

// CORREGIDO: acepta JID de teléfono y JID de tipo LID.
function obtenerChatPrivado(msg, ctx) {
  const candidatos = [
    msg?.key?.participantAlt,
    msg?.key?.participantPn,
    ctx?.senderPn,
    msg?.key?.participant,
    msg?.participant,
    ctx?.participant,
    ctx?.sender
  ];

  return candidatos.find(jid => {
    if (typeof jid !== 'string') return false;

    const destino = jid.trim();

    return (
      (destino.endsWith('@s.whatsapp.net') ||
        destino.endsWith('@lid')) &&
      !destino.endsWith('@g.us')
    );
  }) || '';
}

function extraerCredenciales(texto) {
  const limpio = String(texto)
    .replace(/^[.!/]?agg\s*/i, '')
    .trim();

  const coincidencia = limpio.match(
    /^(?:gmail\s*:\s*)?([^\s@]+@[^\s@]+\.[^\s@]+)\s+(.+)$/i
  );

  if (!coincidencia) return null;

  return {
    correo: coincidencia[1].trim(),
    contrasena: coincidencia[2].trim()
  };
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

    const chat = msg?.key?.remoteJid;

    if (!chat) return;

    const esGrupo = chat.endsWith('@g.us');
    const remitente =
      msg?.key?.participantAlt ||
      msg?.key?.participant ||
      ctx?.sender ||
      '';

    if (comando === 'agg') {
      if (!esPropietario(msg, ctx)) {
        return sock.sendMessage(
          chat,
          { text: '⛔ Solo el propietario puede agregar cuentas.' },
          { quoted: msg }
        );
      }

      const credenciales = extraerCredenciales(texto);

      if (!credenciales) {
        return sock.sendMessage(
          chat,
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
        const correo = credenciales.correo.toLowerCase();

        const existe = [...db.disponibles, ...db.entregadas].some(
          cuenta => cuenta.correo.toLowerCase() === correo
        );

        if (existe) {
          return sock.sendMessage(
            chat,
            { text: '⚠️ Ese correo ya está registrado.' },
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
          chat,
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
          chat,
          { text: '⛔ Solo el propietario puede consultar el inventario.' },
          { quoted: msg }
        );
      }

      const db = leerDB();

      return sock.sendMessage(
        chat,
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
            chat,
            { text: '❌ No hay cuentas disponibles.' },
            { quoted: msg }
          );
        }

        // En privado, el destino es el chat actual.
        // En grupos, buscamos al participante que pidió la cuenta.
        const privado = esGrupo
          ? obtenerChatPrivado(msg, ctx)
          : chat;

        if (!privado || privado.endsWith('@g.us')) {
          return sock.sendMessage(
            chat,
            {
              text:
                '❌ No pude obtener el identificador del solicitante. ' +
                'Revisa que el cargador del bot conserve msg.key.participant.'
            },
            { quoted: msg }
          );
        }

        const cuenta = db.disponibles[0];

        try {
          await sock.sendMessage(privado, {
            text:
              '🚗 *CUENTA CAR PARKING*\n\n' +
              `📧 Correo: ${cuenta.correo}\n` +
              `🔑 Contraseña: ${cuenta.contrasena}\n\n` +
              '⚠️ Guarda tus datos de acceso.'
          });
        } catch (error) {
          console.error('Error enviando cuenta por privado:', error);

          return sock.sendMessage(
            chat,
            {
              text:
                '❌ WhatsApp no permitió enviar la cuenta por privado. ' +
                'No se descontó del inventario.'
            },
            { quoted: msg }
          );
        }

        // Solo descontar la cuenta después de que el envío se acepte.
        db.disponibles.shift();
        db.entregadas.push({
          ...cuenta,
          entregadaA: remitente,
          entregadaEn: new Date().toISOString()
        });

        guardarDB(db);

        if (esGrupo) {
          await sock.sendMessage(
            chat,
            { text: '✅ Cuenta enviada por privado.' },
            { quoted: msg }
          );
        }
      });
    }
  }
};
