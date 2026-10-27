
export default {
  commands: ["escupir"],
  category: "admin",
  admin: true,
  description: "Expulsa usuarios del grupo con un mensaje grosero.",

  async run(sock, msg, args, ctx) {
    const jid = msg.key?.remoteJid || ctx.jid;

    if (!ctx.isGroup) {
      return sock.sendMessage(
        jid,
        { text: "❌ Este comando solo funciona en grupos, genio." },
        { quoted: msg }
      );
    }

    let canKick = ctx.isBotAdmin || (msg.key?.fromMe && ctx.isAdmin);

    if (!canKick) {
      try {
        const fresh = await sock.groupMetadata(jid);
        const botDigits = [
          sock.user?.id?.replace(/\D/g, ""),
          sock.user?.lid?.replace(/\D/g, "")
        ].filter(Boolean);

        canKick = fresh?.participants?.some(p => {
          const pid = p.id?.replace(/\D/g, "");
          const isAdm =
            p.admin === "admin" ||
            p.admin === "superadmin";

          return isAdm && botDigits.includes(pid);
        }) || false;

        const ownerDigits = fresh?.owner?.replace(/\D/g, "");

        if (!canKick && ownerDigits && botDigits.includes(ownerDigits)) {
          canKick = true;
        }
      } catch {}
    }

    if (!canKick) {
      return sock.sendMessage(
        jid,
        {
          text: "❌ No puedo expulsar a nadie si no soy admin, animal. 💀"
        },
        { quoted: msg }
      );
    }

    const m = msg.message || {};
    let targets = [];

    // Usuario al que respondes
    const replied =
      m?.extendedTextMessage?.contextInfo?.participant;

    if (replied) targets.push(replied);

    // Usuarios mencionados
    const mentioned =
      m?.extendedTextMessage?.contextInfo?.mentionedJid || [];

    if (mentioned.length) targets.push(...mentioned);

    if (targets.length === 0) {
      return sock.sendMessage(
        jid,
        {
          text: "💀 Usa .escupir @usuario o responde a su mensaje, no seas inútil."
        },
        { quoted: msg }
      );
    }

    // Eliminar duplicados
    targets = [...new Set(targets)];

    // Evitar expulsar al propio bot
    const botIdentifiers = [
      sock.user?.id?.replace(/\D/g, ""),
      sock.user?.lid?.replace(/\D/g, "")
    ].filter(Boolean);

    targets = targets.filter(u => {
      const uDigits = u.replace(/\D/g, "");
      return !botIdentifiers.includes(uDigits);
    });

    if (targets.length === 0) {
      return sock.sendMessage(
        jid,
        { text: "🤡 ¿Expulsarme a mí mismo? Ni que estuviera pendejo." },
        { quoted: msg }
      );
    }

    try {
      await sock.groupParticipantsUpdate(
        jid,
        targets,
        "remove"
      );

      await sock.sendMessage(
        jid,
        {
          text:
            `🤮 @${targets.map(u => u.split("@")[0]).join(", @")}\n\n` +
            `💦 ¡Fuera de aquí, pinche estorbo! ` +
            `Te escupo y te vas directo a la calle. 🦶💀`,
          mentions: targets
        },
        { quoted: msg }
      );
    } catch (e) {
      console.error("❌ Error escupir:", e);

      await sock.sendMessage(
        jid,
        {
          text: "❌ No pude expulsar al usuario. Revisa mis permisos de administrador."
        },
        { quoted: msg }
      );
    }
  }
};
