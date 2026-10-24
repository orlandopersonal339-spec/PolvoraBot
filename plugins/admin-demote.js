export default {
  commands: ["demote", "quitaradmin", "degradar"],
  category: "admin",
  admin: true,
  description: "Quita admin al usuario respondido o mencionado.",

  async run(sock, msg, args, ctx) {
    const jid = msg.key?.remoteJid || ctx.jid;

    if (!ctx.isGroup) {
      return sock.sendMessage(
        jid,
        { text: "❌ Este comando solo funciona en grupos." },
        { quoted: msg }
      );
    }

    let canDemote = ctx.isBotAdmin || (msg.key?.fromMe && ctx.isAdmin);

    if (!canDemote) {
      try {
        const fresh = await sock.groupMetadata(jid);
        const botDigits = [
          sock.user?.id?.replace(/\D/g, ""),
          sock.user?.lid?.replace(/\D/g, "")
        ].filter(Boolean);

        canDemote = fresh?.participants?.some(p => {
          const pid = p.id?.replace(/\D/g, "");
          const isAdm = p.admin === "admin" || p.admin === "superadmin";
          return isAdm && botDigits.includes(pid);
        }) || false;

        const ownerDigits = fresh?.owner?.replace(/\D/g, "");
        if (!canDemote && ownerDigits && botDigits.includes(ownerDigits)) {
          canDemote = true;
        }
      } catch {}
    }

    if (!canDemote) {
      return sock.sendMessage(
        jid,
        { text: "❌ El bot necesita ser administrador del grupo para degradar admins." },
        { quoted: msg }
      );
    }

    const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
    let targets = [];

    // Si responde a un mensaje
    if (contextInfo?.participant) {
      targets.push(contextInfo.participant);
    }

    // Si menciona usuarios
    if (contextInfo?.mentionedJid?.length) {
      targets.push(...contextInfo.mentionedJid);
    }

    // Eliminar duplicados
    targets = [...new Set(targets)];

    if (!targets.length) {
      return sock.sendMessage(
        jid,
        { text: "❌ Responde a un mensaje o menciona a los usuarios (@usuario) para degradarlos." },
        { quoted: msg }
      );
    }

    try {
      await sock.groupParticipantsUpdate(jid, targets, "demote");

      const mentionsText = targets.map(u => `@${u.split("@")[0]}`).join(" ");
      await sock.sendMessage(
        jid,
        {
          text: `⬇️ Se le quitó el admin a: ${mentionsText}`,
          mentions: targets
        },
        { quoted: msg }
      );
    } catch (e) {
      console.error("❌ Error demote:", e);
      await sock.sendMessage(
        jid,
        { text: "❌ No pude degradar a uno o más usuarios (¿tienen mayor rango o falló WhatsApp?)." },
        { quoted: msg }
      );
    }
  }
};
