
import fs from 'fs';
import path from 'path';

const OWNER_IDS = [
  '190886046613743@lid',
  '5212731307252@s.whatsapp.net'
];

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'carparking-accounts.json');
const PREMIUM_FILE = path.join(DB_DIR, 'premium-users.json');

let cola = Promise.resolve();

function conBloqueo(fn) {
  const tarea = cola.then(fn, fn);
  cola = tarea.catch(() => {});
  return tarea;
}

function esperar(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizarJid(jid = '') {
  return String(jid).trim().replace(/:\d+@/, '@');
}

function obtenerIdentificadores(msg, ctx) {
  return [
    ctx?.sender,
    ctx?.participant,
    ctx?.senderPn,
    ctx?.jid,
    msg?.key?.participant,
    msg?.key?.participantAlt,
    msg?.key?.participantPn,
    msg?.participant
  ]
    .filter(jid => typeof jid === 'string' && jid.length > 0)
    .map(normalizarJid);
}

function esPropietario(msg, ctx) {
  const propietarios = OWNER_IDS.map(normalizarJid);
  const identificadores = obtenerIdentificadores(msg, ctx);

  return identificadores.some(id => propietarios.includes(id));
}

function esPremium(msg, ctx) {
  try {
    if (!fs.existsSync(PREMIUM_FILE)) return false;

    const db = JSON.parse(
      fs.readFileSync(PREMIUM_FILE, 'utf8')
    );

    const usuarios = Array.isArray(db.users) ? db.users : [];
    const identificadores = obtenerIdentificadores(msg, ctx);

    return usuarios.some(usuario => {
      if (!usuario?.jid || usuario.expiresAt == null) {
        return false;
      }

      const jidPremium = normalizarJid(usuario.jid);
      const valor = usuario.expiresAt;

      const expiracion =
        typeof valor === 'number'
          ? valor
          : /^\d+$/.test(String(valor))
            ? Number(valor)
            : Date.parse(valor);

      return (
        identificadores.includes(jidPremium) &&
        Number.isFinite(expiracion) &&
        expiracion > Date.now()
      );
    });
  } catch (error) {
    console.error('Error consultando Premium:', error);
    return false;
  }
}

function tieneAcceso(msg, ctx) {
  return esPropietario(msg, ctx) || esPremium(msg, ctx);
}

function leerDB() {
  fs.mkdirSync(DB_DIR, { recursive: true });

  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(
      DB_FILE,
      JSON.stringify(
        { disponibles: [], entregadas: [] },
        null,
        2
      )
    );
  }

  const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

  return {
    disponibles: Array.isArray(db.disponibles)
      ? db.disponibles
      : [],
    entregadas: Array.isArray(db.entregadas)
      ? db.entregadas
      : []
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

function obtenerChatPrivado(msg, ctx) {
  const candidatos = [
    msg?.key?.participantPn,
    msg?.key?.participantAlt,
    ctx?.senderPn,
    msg?.key?.participant,
    msg?.participant,
    ctx?.participant,
    ctx?.sender,
    ctx?.jid
  ];

  return candidatos.find(jid => {
    if (typeof jid !== 'string') return false;

    const destino = jid.trim();

    return (
      destino.endsWith('@s.whatsapp.net') ||
      destino.endsWith('@lid')
    ) && !destino.endsWith('@g.us');
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

async function generarAnimacion(sock, chat, msg, cuentaEnviada) {
  const frames = [
    '▱▱▱▱▱▱▱▱▱▱ 0%',
    '▰▱▱▱▱▱▱▱▱▱ 10%',
    '▰▰▱▱▱▱▱▱▱▱ 20%',
    '▰▰▰▱▱▱▱▱▱▱ 30%',
    '▰▰▰▰▱▱▱▱▱▱ 40%',
    '▰▰▰▰▰▱▱▱▱▱ 50%',
    '▰▰▰▰▰▰▱▱▱▱ 60%',
    '▰▰▰▰▰▰▰▱▱▱ 70%',
    '▰▰▰▰▰▰▰▰▱▱ 80%',
    '▰▰▰▰▰▰▰▰▰▱ 90%',
    '▰▰▰▰▰▰▰▰▰▰ 100%'
  ];

  let mensaje;

  try {
    mensaje = await sock.sendMessage(chat, {
      text:
        '🚗 *SONICBOT PRO — CAR PARKING*\n\n' +
        '⚙️ Generando cuenta...\n\n' +
        frames[0],
      ...(msg ? { quoted: msg } : {})
    });

    for (let i = 1; i < frames.length; i++) {
      await esperar(350);

      const finalizado = i === frames.length - 1;

      await sock.sendMessage(chat, {
        text: finalizado
          ? cuentaEnviada
            ? '🚗 *SONICBOT PRO — CAR PARKING*\n\n' +
              '✅ Cuenta enviada por privado.'
            : '🚗 *SONICBOT PRO — CAR PARKING*\n\n' +
              '❌ No se pudo enviar la cuenta por privado.'
          : '🚗 *SONICBOT PRO — CAR PARKING*\n\n' +
            '⚙️ Generando cuenta...\n\n' +
            frames[i],
        edit: mensaje.key
      });
    }

    return mensaje;
  } catch (error) {
    console.error('Error en la barra de progreso:', error);
    return mensaje || null;
  }
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
      ctx?.sender ||
      msg?.key?.participantAlt ||
      msg?.key?.participant ||
      '';

    // AGREGAR CUENTAS: SOLO EL PROPIETARIO
    if (comando === 'agg') {
      if (!esPropietario(msg, ctx)) {
        return sock.sendMessage(
          chat,
          { text: '⛔ Solo el creador del bot puede agregar cuentas.' },
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

        const existe = [
          ...db.disponibles,
          ...db.entregadas
        ].some(
          cuenta => String(cuenta.correo).toLowerCase() === correo
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

    // CUENTA Y STOCK: PROPIETARIO O PREMIUM ACTIVO
    if (comando === 'cuenta' || comando === 'stockcuentas') {
      if (!tieneAcceso(msg, ctx)) {
        return sock.sendMessage(
          chat,
          {
            text:
              '🔒 *COMANDO PREMIUM*\n\n' +
              'No tienes Premium activo o tu usuario no está registrado correctamente.\n\n' +
              'Contacta al creador del bot para obtener acceso.'
          },
          { quoted: msg }
        );
      }
    }

    // CONSULTAR INVENTARIO
    if (comando === 'stockcuentas') {
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

    // SOLICITAR CUENTA
    if (comando === 'cuenta') {
      return conBloqueo(async () => {
        const inventario = leerDB();

        if (inventario.disponibles.length === 0) {
          return sock.sendMessage(
            chat,
            { text: '❌ No hay cuentas disponibles.' },
            { quoted: msg }
          );
        }

        const privado = esGrupo
          ? obtenerChatPrivado(msg, ctx)
          : chat;

        if (!privado || privado.endsWith('@g.us')) {
          return sock.sendMessage(
            chat,
            {
              text:
                '❌ No pude obtener el identificador del solicitante. ' +
                'Revisa que el cargador conserve los datos del remitente.'
            },
            { quoted: msg }
          );
        }

        const cuenta = inventario.disponibles[0];
        let enviada = false;

        // Enviar la cuenta antes de mostrar la confirmación final
        try {
          await sock.sendMessage(privado, {
            text:
              '🚗 *CUENTA CAR PARKING*\n\n' +
              `📧 Correo: ${cuenta.correo}\n` +
              `🔑 Contraseña: ${cuenta.contrasena}\n\n` +
              '⚠️ Guarda tus datos de acceso.'
          });

          enviada = true;
        } catch (error) {
          console.error('Error enviando cuenta por privado:', error);
        }

        if (enviada) {
          inventario.disponibles.shift();

          inventario.entregadas.push({
            ...cuenta,
            entregadaA: remitente,
            entregadaEn: new Date().toISOString()
          });

          guardarDB(inventario);
        }

        // La confirmación reemplaza la barra en el mismo mensaje
        await generarAnimacion(sock, chat, msg, enviada);

        if (!enviada) {
          console.error('La cuenta no se pudo entregar; no se descontó del inventario.');
        }
      });
    }
  }
};
