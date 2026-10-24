import fs from "fs";
import path from "path";
import os from "os";
import { spawn } from "child_process";
import crypto from "crypto";

export async function writeExif(buffer, metadata = {}) {
  const tmp = crypto.randomBytes(6).toString("hex");
  const tmpDir = os.tmpdir();

  const input = path.join(tmpDir, `${tmp}.webp`);
  const output = path.join(tmpDir, `${tmp}_exif.webp`);
  const exifFile = path.join(tmpDir, `${tmp}.exif`);

  await fs.promises.writeFile(input, buffer);

  const exif = {
    "sticker-pack-name": metadata.packname || "",
    "sticker-pack-publisher": metadata.author || "",
    emojis: []
  };

  const exifAttr = Buffer.from(
    JSON.stringify(exif),
    "utf-8"
  );

  const exifHeader = Buffer.concat([
    Buffer.from([
      0x49, 0x49, 0x2A, 0x00,
      0x08, 0x00, 0x00, 0x00,
      0x01, 0x00,
      0x41, 0x57,
      0x07, 0x00,
      exifAttr.length & 0xff,
      (exifAttr.length >> 8) & 0xff,
      0x00, 0x00
    ]),
    exifAttr
  ]);

  await fs.promises.writeFile(exifFile, exifHeader);

  await new Promise((resolve, reject) => {
    const proc = spawn("webpmux", [
      "-set", "exif", exifFile,
      input,
      "-o", output
    ]);
    proc.on("close", resolve);
    proc.on("error", reject);
  });

  const result = await fs.promises.readFile(output);

  // limpiar
  try { fs.unlinkSync(input); } catch {}
  try { fs.unlinkSync(output); } catch {}
  try { fs.unlinkSync(exifFile); } catch {}

  return result;
}
