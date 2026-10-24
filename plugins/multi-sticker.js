import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { downloadContentFromMessage } from "@whiskeysockets/baileys";

export default {
  commands: ["s", "sticker"],

  async run(sock, msg, args, ctx) {
    const jid = msg.key.remoteJid;

    let mediaMessage;
    let isVideo = false;

    // 1️⃣ MEDIA DIRECTA
    if (
      msg.message?.imageMessage ||
      msg.message?.videoMessage
    ) {
      mediaMessage =
        msg.message.imageMessage ||
        msg.message.videoMessage;
      isVideo = !!msg.message.videoMessage;
    }

    // 2️⃣ MEDIA RESPONDIDA (QUOTED)
    if (!mediaMessage) {
      const quoted =
        msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

      if (quoted?.imageMessage || quoted?.videoMessage) {
        mediaMessage =
          quoted.imageMessage ||
          quoted.videoMessage;
        isVideo = !!quoted.videoMessage;
      }
    }

    // ❌ NADA
    if (!mediaMessage) {
      return sock.sendMessage(
        jid,
        { text: "❌ Responde a una imagen o video para hacer sticker." },
        { quoted: msg }
      );
    }

    try {
      // 3️⃣ DESCARGAR MEDIA REAL
      const mime = mediaMessage.mimetype || "";
      if (mime.includes("video")) isVideo = true;

      const stream = await downloadContentFromMessage(
        mediaMessage,
        isVideo ? "video" : "image"
      );

      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      // =====================
      // STICKER CON FFMPEG (Compatible con FFmpeg 7/8/9)
      // =====================
      const tmp = Date.now() + "_" + Math.random().toString(36).substring(2, 6);
      const tmpDir = os.tmpdir();
      const input = path.join(tmpDir, `input_${tmp}${isVideo ? ".mp4" : ".png"}`);
      const output = path.join(tmpDir, `sticker_${tmp}.webp`);

      fs.writeFileSync(input, buffer);

      const filter = isVideo
        ? "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,fps=15"
        : "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000";

      const ffmpegArgs = [
        "-y",
        "-i", input,
        "-vf", filter,
        "-vcodec", "libwebp",
        "-lossless", "0",
        "-q:v", isVideo ? "65" : "75",
        "-preset", "default",
        "-loop", "0",
        "-an",
        output
      ];

      try {
        await new Promise((resolve, reject) => {
          const ff = spawn("ffmpeg", ffmpegArgs);
          let errLog = "";

          ff.stderr?.on("data", d => {
            errLog += d.toString();
          });

          ff.on("error", reject);
          ff.on("close", code =>
            code === 0 ? resolve() : reject(new Error(`FFmpeg code ${code}: ${errLog.slice(-300)}`))
          );
        });

        const stickerBuffer = fs.readFileSync(output);

        await sock.sendMessage(
          jid,
          { sticker: stickerBuffer },
          { quoted: msg }
        );
      } finally {
        try { fs.unlinkSync(input); } catch {}
        try { fs.unlinkSync(output); } catch {}
      }
    } catch (err) {
      console.error("❌ Error en sticker:", err);
      const isMissingFFmpeg = err?.code === "ENOENT";
      return sock.sendMessage(
        jid,
        {
          text: isMissingFFmpeg
            ? "⚠️ Falta instalar FFmpeg en el sistema para stickers.\nEn Termux ejecuta: *pkg install ffmpeg*"
            : "❌ Error al procesar el sticker."
        },
        { quoted: msg }
      );
    }
  }
};
