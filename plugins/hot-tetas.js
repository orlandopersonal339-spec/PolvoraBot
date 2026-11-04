
import fs from "fs/promises";
import os from "os";
import path from "path";
import crypto from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const VIDEOS = [
    "https://litter.catbox.moe/u3xea7ni4ml0b2o2.mov",
    "https://litter.catbox.moe/vkallw81ir0vfwer.mov",
    "https://litter.catbox.moe/lub4flq2633a8gw3.mov",

    "https://litter.catbox.moe/nzbpuzwmbb2jtwkd.mov",
    "https://litter.catbox.moe/ciyztc08rkx0bsh4.mov",
    "https://litter.catbox.moe/89hmo89szdlzz24z.mov",
    "https://litter.catbox.moe/hvppnyk5eadcniig.mov",
    "https://litter.catbox.moe/xhbn5g9tfmfhy97x.mov",
    "https://litter.catbox.moe/b38z8zcrwqlaxmuk.mov",
    "https://litter.catbox.moe/v4lbdqs1a9a5wn6v.mov",
    "https://litter.catbox.moe/3kqv6kywlfy79oq9.mov",
    "https://litter.catbox.moe/mdeoqzerzb5auupr.mov",
    "https://litter.catbox.moe/4xn03o5767pfl3d9.mov",

    "https://litter.catbox.moe/yu6xbnx5bgtbbfnc.jpeg"
];

export default {
    commands: ["porno"],
    category: "hot",
    description: "Envía un video o imagen aleatoria",

    async run(sock, msg, args, ctx) {
        const jid = ctx?.jid || msg.key.remoteJid;

        const tempDir = path.join(
            os.tmpdir(),
            "sonic-" + crypto.randomUUID()
        );

        try {
            await fs.mkdir(tempDir, { recursive: true });

            const url = VIDEOS[
                Math.floor(Math.random() * VIDEOS.length)
            ];

            const response = await fetch(url, {
                signal: AbortSignal.timeout(120000)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const buffer = Buffer.from(
                await response.arrayBuffer()
            );

            if (!buffer.length || buffer.length > 64 * 1024 * 1024) {
                throw new Error("Archivo vacío o supera los 64 MB");
            }

            // Si es una imagen JPEG
            if (url.endsWith(".jpeg")) {
                await sock.sendMessage(jid, {
                    image: buffer,
                    mimetype: "image/jpeg",
                    caption: "📸 SONICBOT PRO"
                }, { quoted: msg });

                return;
            }

            // Descargar y convertir video MOV a MP4
            const input = path.join(tempDir, "video.mov");
            const output = path.join(tempDir, "video.mp4");

            await fs.writeFile(input, buffer);

            await execFileAsync("ffmpeg", [
                "-y",
                "-i", input,
                "-c:v", "libx264",
                "-preset", "veryfast",
                "-crf", "28",
                "-c:a", "aac",
                "-b:a", "128k",
                "-movflags", "+faststart",
                output
            ]);

            const video = await fs.readFile(output);

            await sock.sendMessage(jid, {
                video,
                mimetype: "video/mp4",
                fileName: "SonicBotPro.mp4",
                caption: "🎬 SONICBOT PRO"
            }, { quoted: msg });

        } catch (error) {
            console.error("[SONIC PORNO]", error);

            await sock.sendMessage(jid, {
                text: "❌ Error al enviar el archivo.\n\n" +
                    (error.message || "Error desconocido")
            }, { quoted: msg }).catch(() => {});

        } finally {
            await fs.rm(tempDir, {
                recursive: true,
                force: true
            }).catch(() => {});
        }
    }
};
