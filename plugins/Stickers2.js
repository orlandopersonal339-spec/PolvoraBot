
import fs from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import { execFile } from 'child_process';

const exec = promisify(execFile);

export default {
  commands: ['stickers2'],
  category: 'multimedia',
  description: 'El bot te dará sticker.',

  async run(sock, msg, args, ctx) {
    const jid = msg.key?.remoteJid || ctx.jid;

    // Enlace directo del video
    const URL_STICKER = 'https://qu.ax/x/rls30.mp4';

    let tempDir;

    try {
      await sock.sendMessage(
        jid,
        { text: '⏳ Preparando tu sticker animado...' },
        { quoted: msg }
      );

      // Crear carpeta temporal
      tempDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'sonic-sticker-')
      );

      const input = path.join(tempDir, 'video.mp4');
      const output = path.join(tempDir, 'sticker.webp');

      // Descargar video
      await exec('curl', [
        '-fL',
        '--retry', '2',
        '--max-time', '45',
        '-A', 'Mozilla/5.0',
        '-o', input,
        URL_STICKER
      ]);

      // Comprobar archivo
      const buffer = await fs.promises.readFile(input);

      if (buffer.length < 1000) {
        throw new Error('El archivo descargado está vacío o incompleto.');
      }

      if (buffer.toString('ascii', 4, 8) !== 'ftyp') {
        throw new Error('El enlace no entregó un video MP4 válido.');
      }

      // Convertir MP4 a WebP animado
      await exec('ffmpeg', [
        '-y',
        '-i', input,
        '-t', '5',
        '-vf',
        'fps=10,scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000',
        '-an',
        '-c:v', 'libwebp_anim',
        '-quality', '45',
        '-compression_level', '6',
        '-loop', '0',
        output
      ]);

      // Leer sticker convertido
      const sticker = await fs.promises.readFile(output);

      if (sticker.length < 100) {
        throw new Error('El sticker convertido está vacío.');
      }

      // Enviar a WhatsApp
      await sock.sendMessage(
        jid,
        { sticker },
        { quoted: msg }
      );

      console.log('✅ Sticker enviado correctamente.');

    } catch (error) {
      console.error('ERROR STICKERS2:', error);

      await sock.sendMessage(
        jid,
        {
          text:
            '❌ No pude generar el sticker.\n\n' +
            'Error: ' + (error.message || 'Error desconocido')
        },
        { quoted: msg }
      );

    } finally {
      // Eliminar archivos temporales
      if (tempDir) {
        await fs.promises.rm(tempDir, {
          recursive: true,
          force: true
        });
      }
    }
  }
};
