// lib/converter.js
import { promises as fs } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';
import os from 'os';

// Función base ffmpeg universal (imagen/video → lo que pidas)
function ffmpeg(buffer, args = [], ext = '', ext2 = '') {
  return new Promise(async (resolve, reject) => {
    try {
      const tmpDir = join(os.tmpdir(), 'adribot-converter');
      await fs.mkdir(tmpDir, { recursive: true });

      const timestamp = Date.now() + '_' + Math.random().toString(36).substring(2, 8);
      const tmp = join(tmpDir, `${timestamp}.${ext}`);
      const out = `${tmp}.${ext2}`;

      await fs.writeFile(tmp, buffer);

      const proc = spawn('ffmpeg', [
        '-y',
        '-i', tmp,
        ...args,
        out
      ]);

      proc.on('error', async (err) => {
        try { await fs.unlink(tmp); } catch {}
        reject(err);
      });

      proc.on('close', async (code) => {
        try {
          await fs.unlink(tmp);
          if (code !== 0) return reject(new Error(`FFmpeg exited with code ${code}`));

          const outBuffer = await fs.readFile(out);
          resolve({
            buffer: outBuffer,
            filepath: out,
            async delete() {
              try { await fs.unlink(out); } catch {}
            }
          });
        } catch (e) {
          reject(e);
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}

// Convertir imagen a WEBP (stickers)
export function toSticker(buffer, ext = 'png') {
  return ffmpeg(
    buffer,
    [
      '-vcodec', 'libwebp',
      '-vf', "scale=512:512:force_original_aspect_ratio=decrease,fps=15",
      '-lossless', '1',
      '-preset', 'picture',
      '-qscale', '50',
    ],
    ext,
    'webp'
  );
}

// Convertir video/gif a sticker animado
export function toAnimatedSticker(buffer, ext = 'mp4') {
  return ffmpeg(
    buffer,
    [
      '-vcodec', 'libwebp',
      '-vf', "scale=512:512:force_original_aspect_ratio=decrease,fps=15",
      '-loop', '0',
      '-an',
      '-preset', 'picture',
      '-qscale', '50',
    ],
    ext,
    'webp'
  );
}

// Conversión a PTT (nota de voz)
export function toPTT(buffer, ext) {
  return ffmpeg(buffer, [
    '-vn',
    '-c:a', 'libopus',
    '-b:a', '128k',
    '-vbr', 'on'
  ], ext, 'ogg');
}

// Audio general
export function toAudio(buffer, ext) {
  return ffmpeg(buffer, [
    '-vn',
    '-c:a', 'libopus',
    '-b:a', '128k',
    '-vbr', 'on',
    '-compression_level', '10'
  ], ext, 'opus');
}

// Vídeo normal
export function toVideo(buffer, ext) {
  return ffmpeg(buffer, [
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-ab', '128k',
    '-ar', '44100',
    '-crf', '32',
    '-preset', 'slow'
  ], ext, 'mp4');
}
