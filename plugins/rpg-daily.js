export default {
  commands: ["4vs4"],
  category: "juegos",

  async run(sock, msg, args, ctx) {
    let vs = `🩵 4 VS 4 - FREE FIRE\n\n`;
    vs += `🛡️ PARTICIPANTES:\n`;
    vs += `•\n•\n•\n•\n•\n•\n•\n•\n`;
    vs += `💫 REGLAS:\n`;
    vs += `•\n•\n•\n`;
    vs += `🍨 Sala organizada\n`;

    const vsimg = "https://files.catbox.moe/ev7gjp.jpg";

    await sock.sendMessage(
      ctx.jid,
      { image: { url: vsimg }, caption: vs },
      { quoted: msg }
    );
  }
};
