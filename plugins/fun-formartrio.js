export default {
  commands: ["formartrio", "formartrios"],
  category: "fun",
  group: true,
  description: "Forma un trío al azar en el grupo",

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

    if (ps.length < 3) {
      return sock.sendMessage(
        ctx.jid,
        { text: "❌ Necesito al menos 3 personas en el grupo para formar un trío." },
        { quoted: msg }
      );
    }

    await sock.sendMessage(
      ctx.jid,
      { text: "⌛ Buscando a los indicados..." },
      { quoted: msg }
    );

    await new Promise(r => setTimeout(r, 1500));

    const getRandom = () => ps[Math.floor(Math.random() * ps.length)];

    let a = getRandom();
    let b;
    do { b = getRandom(); } while (b === a);

    let c;
    do { c = getRandom(); } while (c === a || c === b);

    const tagA = "@" + a.split("@")[0];
    const tagB = "@" + b.split("@")[0];
    const tagC = "@" + c.split("@")[0];

    await sock.sendMessage(
      ctx.jid,
      {
        text: `😏 *Hey! ${tagA}, ${tagB} y ${tagC} hacen una combinación perfecta para un trío* 🔥`,
        mentions: [a, b, c]
      },
      { quoted: msg }
    );
  }
};
