export default {
  commands: ["anal"],
  category: "diversion",

  async run(sock, msg, args, ctx) {
    const jid = ctx.jid;
    const m = msg.message || {};
    const quoted = m?.extendedTextMessage?.contextInfo;

    let who = null;
    if (quoted?.mentionedJid?.length) {
      who = quoted.mentionedJid[0];
    } else if (quoted?.participant) {
      who = quoted.participant;
    } else {
      who = ctx.sender;
    }

    const name = await sock.getName(who);
    const name2 = await sock.getName(ctx.sender);

    try {
      await sock.sendMessage(jid, { react: { text: "🥵", key: msg.key } });
    } catch {}

    let str;
    if (quoted?.mentionedJid?.length) {
      str = `\`${name2}\` le partió el culo a \`${name || who}\`.`;
    } else if (quoted?.participant) {
      str = `\`${name2}\` se la metió a \`${name || who}\`.`;
    } else {
      str = `\`${name2}\` está haciendo un anal`;
    }

    if (ctx.isGroup) {
      const videos = [
        "https://qu.ax/KKazS.mp4",
        "https://qu.ax/ieJeB.mp4",
        "https://qu.ax/MCdGn.mp4"
      ];

      const video = videos[Math.floor(Math.random() * videos.length)];

      await sock.sendMessage(
        jid,
        {
          video: { url: video },
          gifPlayback: true,
          caption: str,
          mentions: [who]
        },
        { quoted: msg }
      );
    } else {
      await sock.sendMessage(
        jid,
        { text: str, mentions: [who] },
        { quoted: msg }
      );
    }
  }
};
