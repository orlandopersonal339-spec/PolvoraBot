import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'carparking-accounts.json');

const OWNER_JID = '190886046613743@lid';

let cola = Promise.resolve();

function conBloqueo(fn) {
  const tarea = cola.then(fn, fn);
  cola = tarea.catch(() => {});
  return tarea;
}

async function guardarDatos(datos) {
  await fs.mkdir(DATA_DIR, { recursive: true });

  const temporal = DATA_FILE + '.tmp';

  await fs.writeFile(
    temporal,
    JSON.stringify(datos, null, 2),
    { encoding: 'utf8', mode: 0o600 }
  );

  await fs.rename(temporal, DATA_FILE);

  try {
    await fs.chmod(DATA_FILE, 0o600);
  } catch {}
}

async function prepararArchivo() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(DATA_FILE);
  } catch {
    await guardarDatos({
      disponibles: [],
      entregadas: []
    });
  }
}

async function leerDatos() {
  await prepararArchivo();

  const contenido = await fs.readFile(DATA_FILE, 'utf8');
  const datos = JSON.parse(contenido);

  if (
    !Array.isArray(datos.disponibles) ||
    !Array.isArray(datos.entregadas)
  ) {
    throw new Error('El archivo de cuentas tiene un formato inválido.');
  }

  return datos;
}

function obtenerTexto(msg) {
  const m = msg?.message || {};

  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    ''
  ).trim();
}

function obtenerJidUsuario(msg, ctx) {
  const remoto = msg?.key?.remoteJid || '';
  const participante =
    msg?.key?.participant ||
    msg?.key?.participantPn ||
    '';

  if (remoto.endsWith('@g.us')) {
    return participante || ctx?.sender || '';
  }

  return ctx?.sender || remoto;
}

function normalizarJid(jid) {
  return String(jid || '').trim().split(':')[0];
}

function obtenerComando(msg, ctx) {
  const conocido =
    ctx?.command ||
    ctx?.commandName ||
    ctx?.cmd;

  if (conocido) {
    return String(conocido)
      .replace(/^[.!/#]/, '')
      .toLowerCase();
  }

  const texto = obtenerTexto(msg);

  return (
    texto.match(/^[.!/#]?([^\s]+)/)?.[1] || ''
  ).toLowerCase();
}

function obtenerArgumentos(msg, args, ctx) {
  if (Array.isArray(args) && args.length) {
    return args.join(' ').trim();
  }

  if (Array.isArray(ctx?.args) && ctx.args.length) {
    return ctx.args.join(' ').trim();
  }

  return obtenerTexto(msg)
    .replace(/^[.!/#]?\S+\s*/, '')
    .trim();
}

async function responder(sock, jid, texto) {
  return sock.sendMessage(jid, { text: texto });
}

export default {
  commands: [
    'cuenta',
    'agg',
    'stockcuentas'
  ],

  category: 'owner',
  admin: false,

  async run(sock, msg, args, ctx = {}) {
    const remoto = msg?.key?.remoteJid || '';
    const esGrupo = remoto.endsWith('@g.us');

    const usuario = obtenerJidUsuario(msg, ctx);
    const comando = obtenerComando(msg, ctx);
    const argumentos = obtenerArgumentos(msg, args, ctx);

    if (!usuario || !remoto) return;

    const esDueno =
      normalizarJid(usuario) === normalizarJid(OWNER_JID);

    // AGREGAR CUENTA CON .agg
    // Formato:
    // .agg
    // Gmail: correo@gmail.com
    // Pass: contraseña
    if (comando === 'agg') {
      if (!esDueno) {
        return responder(
          sock,
          remoto,
          '❌ Este comando solo lo puede usar el dueño del bot.'
        );
      }

      const gmailMatch = argumentos.match(/Gmail:\s*([^\r\n]+)/i);
      const passMatch = argumentos.match(/Pass:\s*([^\r\n]+)/i);

      if (!gmailMatch || !passMatch) {
        return responder(
          sock,
          remoto,
          '❌ *FORMATO INCORRECTO*\n\n' +
          '📌 Usa este formato:\n\n' +
          '.agg\n' +
          'Gmail: correo@gmail.com\n' +
          'Pass: contraseña'
        );
      }

      const correo = gmailMatch[1].trim();
      const contrasena = passMatch[1].trim();

      if (!correo || !contrasena) {
        return responder(
          sock,
          remoto,
          '❌ El Gmail y el Pass no pueden estar vacíos.'
        );
      }

      return conBloqueo(async () => {
        const datos = await leerDatos();

        const existe = [
          ...datos.disponibles,
          ...datos.entregadas
        ].some(
          cuenta =>
            cuenta.correo.toLowerCase() === correo.toLowerCase()
        );

        if (existe) {
          return responder(
            sock,
            remoto,
            '⚠️ Esa cuenta ya está registrada.'
          );
        }

        datos.disponibles.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          correo,
          contrasena,
          agregada: new Date().toISOString()
        });

        await guardarDatos(datos);

        return responder(
          sock,
          remoto,
          '╭━━━ 🚗 *CAR PARKING* 🚗 ━━━╮\n' +
          '┃\n' +
          '┃ ✅ *CUENTA AGREGADA*\n' +
          '┃\n' +
          `┃ 📧 Gmail: ${correo}\n` +
          '┃\n' +
          `┃ 📦 Disponibles: ${datos.disponibles.length}\n` +
          '┃\n' +
          '╰━━━━━━━━━━━━━━━━━━━━╯'
        );
      });
    }

    // CONSULTAR INVENTARIO
    if (comando === 'stockcuentas') {
      if (!esDueno) {
        return responder(
          sock,
          remoto,
          '❌ Este comando solo lo puede usar el dueño del bot.'
        );
      }

      return conBloqueo(async () => {
        const datos = await leerDatos();

        return responder(
          sock,
          remoto,
          '╭━━━ 📊 *STOCK DE CUENTAS* ━━━╮\n' +
          '┃\n' +
          `┃ 🟢 Disponibles: ${datos.disponibles.length}\n` +
          `┃ 📤 Entregadas: ${datos.entregadas.length}\n` +
          '┃\n' +
          '╰━━━━━━━━━━━━━━━━━━━━╯'
        );
      });
    }

    // SOLICITAR CUENTA
    if (comando !== 'cuenta') return;

    return conBloqueo(async () => {
      const datos = await leerDatos();

      if (datos.disponibles.length === 0) {
        return responder(
          sock,
          remoto,
          '❌ No hay cuentas disponibles'
        );
      }

      const destinoPrivado = usuario;

      if (destinoPrivado.endsWith('@g.us')) {
        return responder(
          sock,
          remoto,
          '❌ No pude identificar tu chat privado.'
        );
      }

      const cuenta = datos.disponibles[0];

      // Registrar la cuenta para impedir duplicados.
      datos.disponibles.shift();

      datos.entregadas.push({
        ...cuenta,
        entregadaA: destinoPrivado,
        fechaEntrega: new Date().toISOString()
      });

      await guardarDatos(datos);

      try {
        await sock.sendMessage(destinoPrivado, {
          text:
            '╭━━━ 🚗 *CAR PARKING* 🚗 ━━━╮\n' +
            '┃\n' +
            '┃ 🎉 *TU CUENTA*\n' +
            '┃\n' +
            `┃ 📧 Gmail: ${cuenta.correo}\n` +
            `┃ 🔐 Pass: ${cuenta.contrasena}\n` +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━━━━━╯'
        });

        if (esGrupo) {
          return responder(
            sock,
            remoto,
            '📩 Revisa tu chat privado.'
          );
        }
      } catch (error) {
        console.error('[CARPARKING] Error de envío:', error);

        if (esGrupo) {
          return responder(
            sock,
            remoto,
            '⚠️ No se pudo confirmar el envío privado. Contacta al administrador.'
          );
        }

        return responder(
          sock,
          remoto,
          '⚠️ No se pudo confirmar el envío. Contacta al administrador.'
        );
      }
    });
  }
};