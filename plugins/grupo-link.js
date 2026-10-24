export default {
  commands: ["link", "enlace", "linkgc"],
  category: "grupo",
  admin: false,
  description: "Muestra el enlace de invitación del grupo.",

  async run(sock, msg, args, ctx) {
    const jid = msg.key?.remoteJid || ctx.jid;

    if (!ctx.isGroup) {
      return sock.sendMessage(
        jid,
        { text: "❌ Este comando solo funciona en grupos." },
        { quoted: msg }
      );
    }

    let canGetLink = ctx.isBotAdmin || (msg.key?.fromMe && ctx.isAdmin);

    if (!canGetLink) {
      try {
        const fresh = await sock.groupMetadata(jid);
        const botDigits = [
          sock.user?.id?.replace(/\D/g, ""),
          sock.user?.lid?.replace(/\D/g, "")
        ].filter(Boolean);

        canGetLink = fresh?.participants?.some(p => {
          const pid = p.id?.replace(/\D/g, "");
          const isAdm = p.admin === "admin" || p.admin === "superadmin";
          return isAdm && botDigits.includes(pid);
        }) || false;

        const ownerDigits = fresh?.owner?.replace(/\D/g, "");
        if (!canGetLink && ownerDigits && botDigits.includes(ownerDigits)) {
          canGetLink = true;
        }
      } catch {}
    }

    if (!canGetLink) {
      return sock.sendMessage(
        jid,
        { text: "❌ El bot necesita ser administrador del grupo para obtener el enlace de invitación." },
        { quoted: msg }
      );
    }

    try {
      const code = await sock.groupInviteCode(jid);
      await sock.sendMessage(
        jid,
        {
          text: `🔗 *Enlace de invitación:*\nhttps://chat.whatsapp.com/${code}`
        },
        { quoted: msg }
      );
    } catch (e) {
      console.error("❌ Error enlace grupo:", e);
      await sock.sendMessage(
        jid,
        { text: "❌ No se pudo obtener el enlace de invitación." },
        { quoted: msg }
      );
    }
  }
};
