import fs from "fs";
import path from "path";
import os from "os";
import { spawn } from "child_process";

export default {
  commands: ["hd", "remini", "enhance"],
  category: "tools",

  async run(sock, msg, args, ctx) {
    const jid = ctx.jid;

    try {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const target = quoted || msg.message;
      const imageMsg = target?.imageMessage;

      if (!imageMsg) {
        return sock.sendMessage(jid, {
          text: "❌ *Debes enviar o responder a una imagen con .hd*"
        }, { quoted: msg });
      }

      await sock.sendMessage(jid, {
        text: "✨ *Mejorando imagen a HD, espera un momento...*"
      }, { quoted: msg });

      const buffer = await ctx.download().catch(() => null);
      if (!buffer) {
        return sock.sendMessage(jid, {
          text: "❌ No se pudo descargar la imagen."
        }, { quoted: msg });
      }

      const tmp = Date.now() + "_" + Math.random().toString(36).substring(2, 6);
      const tmpDir = os.tmpdir();
      const input = path.join(tmpDir, `hd_in_${tmp}.png`);
      const output = path.join(tmpDir, `hd_out_${tmp}.png`);

      fs.writeFileSync(input, buffer);

      try {
        await new Promise((resolve, reject) => {
          const ff = spawn("ffmpeg", [
            "-y",
            "-i", input,
            "-vf", "scale=iw*2:ih*2:flags=lanczos,unsharp=5:5:1.2:5:5:0.0,eq=contrast=1.06:saturation=1.05",
            "-vframes", "1",
            "-q:v", "2",
            output
          ]);

          let errLog = "";
          ff.stderr?.on("data", d => { errLog += d.toString(); });
          ff.on("error", reject);
          ff.on("close", code =>
            code === 0 ? resolve() : reject(new Error(`FFmpeg error ${code}: ${errLog.slice(-200)}`))
          );
        });

        if (!fs.existsSync(output)) {
          throw new Error("No se pudo generar la imagen HD.");
        }

        const hdBuffer = fs.readFileSync(output);

        await sock.sendMessage(jid, {
          image: hdBuffer,
          caption: "✨ *Imagen mejorada a HD con éxito.*"
        }, { quoted: msg });

      } finally {
        try { fs.unlinkSync(input); } catch {}
        try { fs.unlinkSync(output); } catch {}
      }

    } catch (e) {
      console.error("HD ERROR:", e);
      return sock.sendMessage(jid, {
        text: `❌ Error procesando imagen en HD:\n> ${e.message || e}`
      }, { quoted: msg });
    }
  }
};
