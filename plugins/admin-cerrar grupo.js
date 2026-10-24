export default {
  commands: ["cerrar", "cerrargrupo"],
  category: "grupo",
  admin: true,
  description: "Cierra el grupo para que solo administradores puedan escribir.",

  async run(sock, msg, args, ctx) {
    const jid = msg.key?.remoteJid || ctx.jid;

    if (!ctx.isGroup) {
      return sock.sendMessage(
        jid,
        { text: "❌ Este comando solo funciona en grupos." },
        { quoted: msg }
      );
    }

    let canModify = ctx.isBotAdmin || (msg.key?.fromMe && ctx.isAdmin);

    if (!canModify) {
      try {
        const fresh = await sock.groupMetadata(jid);
        const botDigits = [
          sock.user?.id?.replace(/\D/g, ""),
          sock.user?.lid?.replace(/\D/g, "")
        ].filter(Boolean);

        canModify = fresh?.participants?.some(p => {
          const pid = p.id?.replace(/\D/g, "");
          const isAdm = p.admin === "admin" || p.admin === "superadmin";
          return isAdm && botDigits.includes(pid);
        }) || false;

        const ownerDigits = fresh?.owner?.replace(/\D/g, "");
        if (!canModify && ownerDigits && botDigits.includes(ownerDigits)) {
          canModify = true;
        }
      } catch {}
    }

    if (!canModify) {
      return sock.sendMessage(
        jid,
        { text: "❌ El bot necesita ser administrador del grupo para modificar los ajustes." },
        { quoted: msg }
      );
    }

    try {
      await sock.groupSettingUpdate(jid, "announcement");
      await sock.sendMessage(
        jid,
        { text: "🔒 *Grupo cerrado.*\nSolo los administradores pueden enviar mensajes." },
        { quoted: msg }
      );
    } catch (e) {
      console.error("❌ Error cerrar grupo:", e);
      await sock.sendMessage(
        jid,
        { text: "❌ No pude cerrar el grupo." },
        { quoted: msg }
      );
    }
  }
};
