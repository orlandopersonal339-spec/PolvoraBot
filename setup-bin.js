import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

try {
  const termuxDir = "/data/data/com.termux/files/usr/bin";
  const termuxBin = path.join(termuxDir, "bot");

  const scriptContent = `#!/data/data/com.termux/files/usr/bin/bash
BOT_DIR="${__dirname}"
if [ ! -d "$BOT_DIR" ]; then
  BOT_DIR="$HOME/PolvoraBot"
fi
cd "$BOT_DIR" && exec node index.js "$@"
`;

  if (fs.existsSync(termuxDir)) {
    fs.writeFileSync(termuxBin, scriptContent, { mode: 0o755 });
    console.log("✅ Comando 'bot' registrado en Termux exitosamente.");
  }
} catch (e) {
  // Ignorar errores si no tiene permisos en /usr/bin
}
