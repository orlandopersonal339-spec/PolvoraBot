
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
    "https://litter.catbox.moe/lub4flq2633a8gw3.mov"
];

export default {
    commands: ["porno"],
    category: "hot",
    description: "Envía un video aleatorio en MP4",

    async run(sock, msg, args, ctx) {
        const jid = ctx?.jid || msg.key.remoteJid;
        const tempDir = path.join(
            os.tmpdir(),
            "sonic-porno-" + crypto.randomUUID()
        );

        try {
            await fs.mkdir(tempDir, { recursive: true });

            await sock.sendMessage(jid, {
                text: "🎬 Descargando video, espera un momento..."
            }, { quoted: msg });

            const url = VIDEOS[
                Math.floor(Math.random() * VIDEOS.length)
            ];

            const response = await fetch(url, {
                signal: AbortSignal.timeout(120000)
            });

            if (!response.ok) {
                throw new Error(`Error descargando: HTTP ${response.status}`);
            }

            const buffer = Buffer.from(await response.arrayBuffer());

            if (!buffer.length || buffer.length > 64 * 1024 * 1024) {
                throw new Error("Video vacío o demasiado pesado (máximo 64 MB).");
            }

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
            console.error("[PORNO ERROR]", error);

            await sock.sendMessage(jid, {
                text: "❌ No pude enviar el video.\n\nError: " +
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
