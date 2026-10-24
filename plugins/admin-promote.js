export default {
  commands: ["promote", "admin", "daradmin"],
  category: "admin",
  admin: true,
  description: "Da admin a uno o varios usuarios.",

  async run(sock, msg, args, ctx) {
    const jid = msg.key?.remoteJid || ctx.jid;

    // validar grupo
    if (!ctx.isGroup) {
      return sock.sendMessage(
        jid,
        { text: "❌ Este comando solo funciona en grupos." },
        { quoted: msg }
      );
    }

    let canPromote = ctx.isBotAdmin || (msg.key?.fromMe && ctx.isAdmin);

    if (!canPromote) {
      try {
        const fresh = await sock.groupMetadata(jid);
        const botDigits = [
          sock.user?.id?.replace(/\D/g, ""),
          sock.user?.lid?.replace(/\D/g, "")
        ].filter(Boolean);

        canPromote = fresh?.participants?.some(p => {
          const pid = p.id?.replace(/\D/g, "");
          const isAdm = p.admin === "admin" || p.admin === "superadmin";
          return isAdm && botDigits.includes(pid);
        }) || false;

        const ownerDigits = fresh?.owner?.replace(/\D/g, "");
        if (!canPromote && ownerDigits && botDigits.includes(ownerDigits)) {
          canPromote = true;
        }
      } catch {}
    }

    if (!canPromote) {
      return sock.sendMessage(
        jid,
        { text: "❌ El bot necesita ser administrador del grupo para promover usuarios." },
        { quoted: msg }
      );
    }

    const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
    let targets = [];

    // responder
    if (contextInfo?.participant) {
      targets.push(contextInfo.participant);
    }

    // menciones
    if (contextInfo?.mentionedJid?.length) {
      targets.push(...contextInfo.mentionedJid);
    }

    // quitar duplicados
    targets = [...new Set(targets)];

    if (!targets.length) {
      return sock.sendMessage(
        jid,
        { text: "❌ Responde a un mensaje o menciona a uno o más usuarios (@usuario)." },
        { quoted: msg }
      );
    }

    // promover
    try {
      await sock.groupParticipantsUpdate(jid, targets, "promote");
    } catch (e) {
      console.error("❌ Error promote:", e);
      return sock.sendMessage(
        jid,
        { text: "❌ No pude promover a los usuarios (¿permisos insuficientes?)." },
        { quoted: msg }
      );
    }

    const mentionsText = targets
      .map(u => `@${u.split("@")[0]}`)
      .join(" ");

    const text = `👑 ${mentionsText} ahora es administrador del grupo.`;

    await sock.sendMessage(
      jid,
      {
        text,
        mentions: targets
      },
      { quoted: msg }
    );
  }
};
