import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'carparking-accounts.json');

// REEMPLAZA ESTO CON EL JID DEL DUEÑO DEL BOT
const OWNER_JID = 'PON_AQUI_TU_NUMERO@s.whatsapp.net';

let cola = Promise.resolve();

function conBloqueo(fn) {
  const tarea = cola.then(fn, fn);
  cola = tarea.catch(() => {});
  return tarea;
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

function obtenerJidUsuario(sock, msg, ctx) {
  const remoto = msg?.key?.remoteJid || '';
  const participante =
    msg?.key?.participant ||
    msg?.key?.participantPn ||
    '';

  const remitente =
    ctx?.sender ||
    participante ||
    remoto;

  if (!remitente) return '';

  // Si es un grupo, nunca enviar la cuenta al JID del grupo.
  if (remoto.endsWith('@g.us')) {
    return participante || ctx?.sender || '';
  }

  return remitente;
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
  return (texto.match(/^[.!/#]?([^\s]+)/)?.[1] || '')
    .toLowerCase();
}

function obtenerArgumentos(msg, args, ctx) {
  if (Array.isArray(args) && args.length) {
    return args.join(' ').trim();
  }

  if (Array.isArray(ctx?.args) && ctx.args.length) {
    return ctx.args.join(' ').trim();
  }

  const texto = obtenerTexto(msg);
  return texto.replace(/^[.!/#]?\S+\s*/, '').trim();
}

async function responder(sock, jid, texto) {
  return sock.sendMessage(jid, { text: texto });
}

export default {
  commands: [
    'cuenta',
    'agregarcuenta',
    'stockcuentas'
  ],

  category: 'owner',
  admin: false,

  async run(sock, msg, args, ctx = {}) {
    const remoto = msg?.key?.remoteJid || '';
    const esGrupo = remoto.endsWith('@g.us');

    const usuario = obtenerJidUsuario(sock, msg, ctx);
    const comando = obtenerComando(msg, ctx);
    const argumentos = obtenerArgumentos(msg, args, ctx);

    if (!usuario || !remoto) return;

    const esDueno =
      normalizarJid(usuario) === normalizarJid(OWNER_JID);

    // AGREGAR CUENTAS:
    // .agregarcuenta correo@ejemplo.com|contraseña
    if (comando === 'agregarcuenta') {
      if (!esDueno) {
        return responder(
          sock,
          remoto,
          '❌ Este comando solo lo puede usar el dueño del bot.'
        );
      }

      const separador = argumentos.indexOf('|');

      if (separador < 1 || separador === argumentos.length - 1) {
        return responder(
          sock,
          remoto,
          'Formato incorrecto.\n\nUso:\n.agregarcuenta correo@ejemplo.com|contraseña'
        );
      }

      const correo = argumentos.slice(0, separador).trim();
      const contrasena = argumentos.slice(separador + 1).trim();

      if (!correo || !contrasena) {
        return responder(sock, remoto, '❌ Correo o contraseña vacíos.');
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
            '⚠️ Esa cuenta ya está registrada y no se agregará otra vez.'
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
          `✅ Cuenta agregada correctamente.\n📦 Disponibles: ${datos.disponibles.length}`
        );
      });
    }

    // CONSULTAR STOCK:
    // .stockcuentas
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
          `📊 STOCK DE CUENTAS\n\n` +
          `🟢 Disponibles: ${datos.disponibles.length}\n` +
          `📤 Entregadas: ${datos.entregadas.length}`
        );
      });
    }

    // SOLICITAR CUENTA:
    // .cuenta
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

      // El usuario del grupo recibe la cuenta en su chat privado.
      const destinoPrivado = usuario;

      if (!destinoPrivado || destinoPrivado.endsWith('@g.us')) {
        return responder(
          sock,
          remoto,
          '❌ No pude identificar tu chat privado. Inténtalo de nuevo.'
        );
      }

      const cuenta = datos.disponibles[0];

      // Registrar antes de enviar evita entregar la misma cuenta
      // dos veces si el proceso se interrumpe durante el envío.
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
            '🚗 *CAR PARKING — TU CUENTA*\n\n' +
            `📧 Correo: ${cuenta.correo}\n` +
            `🔐 Contraseña: ${cuenta.contrasena}\n\n` +
            '⚠️ Guarda tus datos en un lugar seguro.\n' +
            'Gracias por tu compra.'
        });

        if (esGrupo) {
          return responder(
            sock,
            remoto,
            '📩 Revisé tu solicitud. Te envié la cuenta por privado.'
          );
        }

        return;
      } catch (error) {
        // No se vuelve a poner en stock automáticamente:
        // un error de red no siempre significa que el mensaje no llegó.
        console.error('[CARPARKING] Falló el envío privado:', error);

        if (esGrupo) {
          return responder(
            sock,
            remoto,
            '⚠️ No pude confirmar el envío por privado. Contacta al administrador para revisar tu entrega.'
          );
        }

        return responder(
          sock,
          remoto,
          '⚠️ No pude confirmar el envío. Contacta al administrador para revisar tu entrega.'
        );
      }
    });
  }
};