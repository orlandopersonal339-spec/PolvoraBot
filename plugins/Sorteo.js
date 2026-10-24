const toM = a => "@" + a.split("@")[0];

export default {
  commands: ["sorteo"],
  category: "grupo",

  async run(sock, msg, args, ctx) {
    const jid = ctx.jid;

    if (!ctx.isGroup) {
      return sock.sendMessage(jid, { text: "❌ Este comando solo es para grupos." }, { quoted: msg });
    }

    const botJid = sock.user?.id ? sock.user.id.split(":")[0] + "@s.whatsapp.net" : "";
    const participantes = (ctx.participants || [])
      .map(p => p.id)
      .filter(id => id && id !== botJid);

    if (participantes.length < 2) {
      return sock.sendMessage(jid, { text: "❌ No hay suficientes participantes en el grupo." }, { quoted: msg });
    }

    // Limpiar premio
    let premio = args.join(" ").trim();
    if (!premio) premio = "un premio sorpresa 🎁";

    // Barra de carga
    const carga = [
      "▒▒▒▒▒▒▒▒▒▒ 0%",
      "██▒▒▒▒▒▒▒▒ 20%",
      "████▒▒▒▒▒▒ 40%",
      "██████▒▒▒▒ 60%",
      "████████▒▒ 80%",
      "██████████ 100%"
    ];

    const sent = await sock.sendMessage(jid, {
      text: "🎰 Iniciando sorteo...\n\n" + carga[0]
    }, { quoted: msg });

    for (let i = 1; i < carga.length; i++) {
      await new Promise(r => setTimeout(r, 600));
      await sock.sendMessage(jid, {
        text: "🎰 Iniciando sorteo...\n\n" + carga[i],
        edit: sent.key
      });
    }

    // Ganador
    const ganador = participantes[Math.floor(Math.random() * participantes.length)];
    await new Promise(r => setTimeout(r, 500));

    await sock.sendMessage(jid, {
      text: `🎉 *SORTEO FINALIZADO*\n\n👑 Ganador: ${toM(ganador)}\n🎁 Premio: ${premio}\n\n¡Felicidades! 🎊`,
      mentions: [ganador],
      edit: sent.key
    });
  }
};
