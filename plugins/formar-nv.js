export default {
  commands: ["formarnv"],
  category: "fun",
  group: true,
  description: "Forma una pareja al azar en el grupo",

  async run(sock, msg, args, ctx) {
    if (!ctx.isGroup) {
      return sock.sendMessage(
        ctx.jid,
        { text: "❌ Este comando solo funciona en grupos." },
        { quoted: msg }
      );
    }

    let ps = (ctx.participants || []).map(v => v.id);

    if (!ps.length) {
      try {
        const metadata = await sock.groupMetadata(ctx.jid);
        ps = (metadata?.participants || []).map(v => v.id);
      } catch {}
    }

    if (ps.length < 2) {
      return sock.sendMessage(
        ctx.jid,
        { text: "😏 Ups... se necesitan al menos 2 personas para formar una pareja 💕" },
        { quoted: msg }
      );
    }

    const getRandom = () => ps[Math.floor(Math.random() * ps.length)];

    let a = getRandom();
    let b;

    do {
      b = getRandom();
    } while (b === a);

    const tagA = "@" + a.split("@")[0];
    const tagB = "@" + b.split("@")[0];

    await sock.sendMessage(
      ctx.jid,
      {
        text: `💘 *Pareja traviesa del día:* ${tagA} 😏 + ${tagB} 💖\n\n🔥 ¡Se ven perfectos juntos! Tal vez sea hora de coquetear un poquito 😜💌\n💫 Que la chispa del amor los acompañe ✨`,
        mentions: [a, b]
      },
      { quoted: msg }
    );
  }
};
