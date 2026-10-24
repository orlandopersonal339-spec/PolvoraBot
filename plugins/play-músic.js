import fs from "fs";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import yts from "yt-search";

const execFileAsync = promisify(execFile);

export default {
  commands: ["play", "musicdl", "mp3"],
  category: "descargas",
  admin: false,
  description: "Descarga audio de YouTube",

  async run(sock, msg, args, ctx) {
    const jid = msg.key.remoteJid;
    const text = args.join(" ").trim();

    if (!text) {
      return sock.sendMessage(
        jid,
        {
          text: `🪐 Ingresa un título o link de YouTube\nEjemplo: *${ctx.prefix || "."}play autos edits*`
        },
        { quoted: msg }
      );
    }

    let video = null;
    const isLink = text.includes("youtube.com") || text.includes("youtu.be");

    try {
      if (isLink) {
        const id =
          text.split("v=")[1]?.split("&")[0] ||
          text.split("/").pop()?.split("?")[0];

        const res = await yts({ videoId: id });
        video = res;
      } else {
        const res = await yts(text);
        video = res?.videos?.[0] || null;
      }

      if (!video || !video.url) {
        throw new Error("No se encontró ningún video con esa búsqueda.");
      }

      if (video.seconds && video.seconds > 600) {
        throw new Error(`El audio es muy largo (${video.timestamp}). Límite: 10 minutos.`);
      }

      await sock.sendMessage(
        jid,
        {
          text: `🪐 Descargando audio de *${video.title}* (${video.timestamp || "Audio"})...`
        },
        { quoted: msg }
      );

      const tmpBase = path.join(os.tmpdir(), `play_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
      const outPattern = `${tmpBase}.%(ext)s`;
      const outMp3 = `${tmpBase}.mp3`;

      try {
        await execFileAsync(
          "yt-dlp",
          [
            "--js-runtimes",
            "node",
            "-f",
            "ba/b",
            "-x",
            "--audio-format",
            "mp3",
            "--audio-quality",
            "128K",
            "--no-playlist",
            "--max-filesize",
            "30M",
            "-o",
            outPattern,
            video.url
          ],
          { timeout: 70000 }
        );

        if (!fs.existsSync(outMp3)) {
          throw new Error("No se pudo generar el archivo MP3.");
        }

        const audioBuffer = fs.readFileSync(outMp3);
        const safeTitle = (video.title || "audio").replace(/[/\\?%*:|"<>]/g, "");

        await sock.sendMessage(
          jid,
          {
            audio: audioBuffer,
            mimetype: "audio/mpeg",
            fileName: `${safeTitle}.mp3`
          },
          { quoted: msg }
        );
      } finally {
        // Limpieza de archivos temporales
        try {
          if (fs.existsSync(outMp3)) fs.unlinkSync(outMp3);
          const webmFile = `${tmpBase}.webm`;
          if (fs.existsSync(webmFile)) fs.unlinkSync(webmFile);
        } catch {}
      }

    } catch (e) {
      console.error("❌ Error en play:", e);
      const errMsg = e?.message || e?.stderr || String(e);
      await sock.sendMessage(
        jid,
        { text: `🌱 Error al descargar:\n${errMsg}` },
        { quoted: msg }
      );
    }
  }
};
