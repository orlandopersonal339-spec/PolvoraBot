import fs from 'fs';
import path from 'path';

const DEVELOPER_JID = '521XXXXXXXXXX@s.whatsapp.net';

const DATA_DIR = './data';
const COUNTER_FILE = path.join(DATA_DIR, 'reportes-counter.json');

function obtenerNumeroReporte() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  let numero = 0;

  if (fs.existsSync(COUNTER_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(COUNTER_FILE, 'utf8'));
      numero = Number(data.numero) || 0;
    } catch {
      numero = 0;
    }
  }

  numero++;

  fs.writeFileSync(
    COUNTER_FILE,
    JSON.stringify({ numero }, null, 2)
  );

  return numero;
}

export default {
  commands: ['reporte', 'reportar'],
  category: 'admin',
  description: 'Envía reportes al dueño del bot.',

  async run(sock, msg, args, ctx) {
    const jid = msg.key?.remoteJid || ctx.jid;
    const reporte = args.join(' ').trim();

    if (!reporte) {
      return sock.sendMessage(jid, {
        text: `➤ *INSTRUCCIONES* ❗

> 𝖢𝗎é𝗇𝗍𝖺𝗇𝗈𝗌 𝗊𝗎é 𝖿𝖺𝗅𝗅ó 𝗈 𝗊𝗎é 𝗍𝖾 𝗀𝗎𝗌𝗍𝖺𝗋í𝖺 𝗊𝗎𝖾 𝗆𝖾𝗃𝗈𝗋𝖾𝗆𝗈𝗌. 𝖫𝗈 𝗅𝖾𝖾 𝖾𝗅 𝖽𝗎𝖾ñ𝗈 𝖽𝖾𝗅 𝖻𝗈𝗍 𝗒 𝗍𝖾 𝗋𝖾𝗌𝗉𝗈𝗇𝖽𝖾 𝖺𝗊𝗎í.

» 𝖤𝗃𝖾𝗆𝗉𝗅𝗈𝗌:
.reporte el .play no envía el audio
.reporte sugiero un comando de trivia

> 𝖳𝖺𝗆𝖻𝗂é𝗇 𝗉𝗎𝖾𝖽𝖾𝗌 𝗋𝖾𝗌𝗉𝗈𝗇𝖽𝖾𝗋 𝖺𝗅 𝗆𝖾𝗇𝗌𝖺𝗃𝖾 𝖽𝖾𝗅 𝖾𝗋𝗋𝗈𝗋 𝖼𝗈𝗇 .reporte 𝗒 𝗎𝗇𝖺 𝖾𝗑𝗉𝗅𝗂𝖼𝖺𝖼𝗂ó𝗇.`
      }, { quoted: msg });
    }

    if (DEVELOPER_JID.includes('XXXXXXXXXX')) {
      return sock.sendMessage(jid, {
        text: '❌ El sistema de reportes aún no está configurado.'
      }, { quoted: msg });
    }

    try {
      const numeroReporte = obtenerNumeroReporte();

      // Aviso que recibe el dueño del bot
      const mensaje = `🚨 *NUEVO REPORTE — SONICBOT PRO*

🔢 *Reporte:* #${numeroReporte}`;

      await sock.sendMessage(DEVELOPER_JID, {
        text: mensaje
      });

      // Confirmación que recibe quien envió el reporte
      await sock.sendMessage(jid, {
        text: `➤ *HECHO* ✅

» 𝖱𝖾𝗉𝗈𝗋𝗍𝖾 *#${numeroReporte}* 𝖾𝗇𝗏𝗂𝖺𝖽𝗈 𝖺𝗅 𝖽𝗎𝖾ñ𝗈 𝖽𝖾𝗅 𝖻𝗈𝗍.
> 𝖳𝖾 𝗋𝖾𝗌𝗉𝗈𝗇𝖽𝖾𝗋á 𝖾𝗇 𝖾𝗌𝗍𝖾 𝖼𝗁𝖺𝗍. 𝖦𝗋𝖺𝖼𝗂𝖺𝗌 𝗉𝗈𝗋 𝖺𝗒𝗎𝖽𝖺𝗋 𝖺 𝗆𝖾𝗃𝗈𝗋𝖺𝗋 𝖭𝖺𝗆𝗂𝖢𝗁𝖺𝗍𝗌.`
      }, { quoted: msg });

    } catch (error) {
      console.error('ERROR REPORTE:', error);

      await sock.sendMessage(jid, {
        text: '❌ No se pudo enviar tu reporte. Inténtalo más tarde.'
      }, { quoted: msg });
    }
  }
};