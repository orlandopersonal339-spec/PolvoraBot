export default {
  commands: ["colaboradores", "staff"],
  category: "info",

  async run(sock, msg, args, ctx) {
    const staff = `🚩 *EQUIPO OFICIAL DEL BOT*

🤖 *Bot:* SonicBot-MF
🪐 *Versión:* 1.1.0

━━━━━━━━━━━━━━━

🎩 *Propietario*
💛 *Contacto:* wa.me/2731307252

━━━━━━━━━━━━━━━

👨‍💻 *Developers*
🍭 —
🎩 —

━━━━━━━━━━━━━━━

🛡️ *Moderadores*
🍭 —
🍭 —

━━━━━━━━━━━━━━━

✨ Gracias por usar *SonicBot*
🚀 Seguimos mejorando para ustedes`;

    await sock.sendMessage(ctx.jid, { text: staff }, { quoted: msg });
  }
};
