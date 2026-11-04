
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

    const URL_STICKER = 'https://qu.ax/rls30.mp4';

    let tempDir;

    try {
      await sock.sendMessage(
        jid,
        { text: '⏳ Preparando tu sticker animado...' },
        { quoted: msg }
      );

      tempDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'sonic-sticker-')
      );

      const input = path.join(tempDir, 'video.mp4');
      const output = path.join(tempDir, 'sticker.webp');

      // Descargar video
      const response = await fetch(URL_STICKER);

      if (!response.ok) {
        throw new Error('No se pudo descargar el video');
      }

      const type = response.headers.get('content-type') || '';

      if (type.includes('text/html')) {
        throw new Error('El enlace devuelve una página web y no el video');
      }

      const buffer = Buffer.from(
        await response.arrayBuffer()
      );

      if (!buffer.length || buffer.length > 15 * 1024 * 1024) {
        throw new Error('Archivo vacío o demasiado grande');
      }

      // Guardar video temporalmente
      await fs.promises.writeFile(input, buffer);

      // Convertir MP4 a sticker WebP animado
      await exec('ffmpeg', [
        '-y',
        '-i', input,
        '-t', '6',
        '-vf',
        'fps=12,scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000',
        '-an',
        '-c:v', 'libwebp',
        '-quality', '55',
        '-compression_level', '6',
        '-loop', '0',
        output
      ]);

      const sticker = await fs.promises.readFile(output);

      if (!sticker.length) {
        throw new Error('No se pudo generar el sticker');
      }

      // Enviar sticker animado
      await sock.sendMessage(
        jid,
        { sticker },
        { quoted: msg }
      );

    } catch (error) {
      console.error('ERROR STICKERS2:', error);

      await sock.sendMessage(
        jid,
        {
          text: '❌ No pude descargar o convertir el sticker. Revisa el enlace.'
        },
        { quoted: msg }
      );

    } finally {
      if (tempDir) {
        await fs.promises.rm(tempDir, {
          recursive: true,
          force: true
        });
      }
    }
  }
};
