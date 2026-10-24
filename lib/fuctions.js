import fs from "fs";
import path from "path";
import os from "os";
import { spawn } from "child_process";

export async function writeExifImg(
  buffer,
  { packname = "ADRIBOT", author = "Adri" } = {}
) {
  const tmp = Date.now() + "_" + Math.random().toString(36).substring(2, 6);
  const tmpDir = os.tmpdir();

  const input = path.join(tmpDir, `qc_${tmp}.png`);
  const output = path.join(tmpDir, `qc_${tmp}.webp`);

  fs.writeFileSync(input, buffer);

  try {
    // 🔥 STICKER REAL WHATSAPP (SIN FONDO BLANCO)
    await run("ffmpeg", [
      "-y",
      "-i", input,
      "-vf",
      "format=rgba," +
      "scale=512:512:force_original_aspect_ratio=decrease," +
      "pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000",
      "-vcodec", "libwebp",
      "-lossless", "0",
      "-q:v", "90",
      "-preset", "default",
      "-an",
      output
    ]);
  } finally {
    try { fs.unlinkSync(input); } catch {}
  }

  return output;
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args);
    p.on("error", reject);
    p.on("close", code =>
      code === 0 ? resolve() : reject(new Error(`Command ${cmd} exited with code ${code}`))
    );
  });
}
