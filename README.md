# 🤖 PolvoraBot (WhatsApp Multi-Device Bot)

Bot de WhatsApp Multi-Device basado en `@whiskeysockets/baileys` con arquitectura modular de plugins.

---

## 🚀 Instalación en Termux

```bash
# 1. Actualizar paquetes y dependencias
pkg update -y && pkg upgrade -y
pkg install -y git nodejs ffmpeg python python-pip
pip install yt-dlp

# 2. Clonar el repositorio
git clone https://github.com/orlandopersonal339-spec/PolvoraBot.git
cd PolvoraBot

# 3. Instalar dependencias
npm install
```

---

## ⚡ Ejecución

Una vez instalado, puedes iniciar el bot desde cualquier lugar simplemente escribiendo:

```bash
bot
```

O si prefieres el método tradicional:
```bash
npm start
```

---

## 📌 Comandos y Funcionalidades
- **Multimedia:** `.s` (stickers de imagen y video), `.qc` (quote stickers), `.hd` (mejora de resolución con FFmpeg Lanczos 2x).
- **Descargas:** `.play` / `.musicdl` (descarga audios de YouTube en MP3 con yt-dlp).
- **Administración de Grupos:** `.promote`, `.demote`, `.kick`, `.del`, `.abrir`, `.cerrar`, `.link`, `.fantasmas`, `.ficha`, `.todos`, `.hidetag`.
- **Eventos Automáticos:** Bienvenidas y despedidas con imagen personalizada (`.bienvenida on/off`, `.despedida on/off`), alertas de nuevos administradores y antilink.
- **Herramientas e Información:** `.menu`, `.ping`, `.speed`, `.rev`.
