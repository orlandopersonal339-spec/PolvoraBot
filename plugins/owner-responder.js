import fs from 'fs';
import path from 'path';

const OWNER_LID = '190886046613743@lid';
const FILE = path.join('./data', 'reportes.json');

export default {
  commands: ['responder'],
  category: 'owner',
  description: 'Responde reportes directamente en el grupo.',

  async run(sock, msg, args, ctx) {
    const jid = msg.key?.remoteJid || ctx.jid;

    const remitente =
      msg.key?.participant ||
      msg.key?.participantAlt ||
      msg.key?.remoteJid;

    // Verificar que sea el dueño
    if (remitente !== OWNER_LID) {
      return sock.sendMessage(jid, {
        text: '❌ Este comando solo puede utilizarlo el dueño del bot.'
      }, { quoted: msg });
    }

    const numero = Number(args[0]);
    const respuesta = args.slice(1).join(' ').trim();

    if (!numero || !respuesta) {
      return sock.sendMessage(jid, {
        text: `❗ *USO DEL COMANDO*

.responder número mensaje

*Ejemplo:*
.responder 2 Ya quedó, puedes probar nuevamente el comando. ✅`
      }, { quoted: msg });
    }

    if (!fs.existsSync(FILE)) {
      return sock.sendMessage(jid, {
        text: '❌ No hay reportes registrados.'
      }, { quoted: msg });
    }

    try {
      const datos = JSON.parse(
        fs.readFileSync(FILE, 'utf8')
      );

      const reporte = datos.reportes?.[numero];

      if (!reporte) {
        return sock.sendMessage(jid, {
          text: `❌ No existe el reporte #${numero}.`
        }, { quoted: msg });
      }

      const grupoJid = reporte.grupo;
      const usuarioJid = reporte.jid;
      const nombre = reporte.nombre || 'Usuario';
      const textoReporte = reporte.reporte || 'Sin descripción';

      if (!grupoJid || !grupoJid.endsWith('@g.us')) {
        return sock.sendMessage(jid, {
          text: '❌ No se encontró el grupo original de este reporte.'
        }, { quoted: msg });
      }

      if (!usuarioJid) {
        return sock.sendMessage(jid, {
          text: '❌ No se encontró el usuario que realizó el reporte.'
        }, { quoted: msg });
      }

      // Mensaje que recibirá el usuario en el grupo
      const mensaje = `➤ *RESPUESTA DEL SOPORTE* 💬

» @${nombre}, 𝗌𝗈𝖻𝗋𝖾 𝗍𝗎 𝗋𝖾𝗉𝗈𝗋𝗍𝖾 *#${numero}*:
> ${textoReporte}

${respuesta}`;

      await sock.sendMessage(grupoJid, {
        text: mensaje,
        mentions: [usuarioJid]
      });

      // Guardar respuesta
      reporte.respondido = true;
      reporte.respuesta = respuesta;

      fs.writeFileSync(
        FILE,
        JSON.stringify(datos, null, 2)
      );

      await sock.sendMessage(jid, {
        text: `✅ *RESPUESTA ENVIADA*

La respuesta al reporte #${numero} fue publicada en el grupo correctamente.`
      }, { quoted: msg });

    } catch (error) {
      console.error('ERROR RESPONDER:', error);

      await sock.sendMessage(jid, {
        text: '❌ No se pudo enviar la respuesta al grupo.'
      }, { quoted: msg });
    }
  }
};