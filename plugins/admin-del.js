export default {
  commands: ["del", "delete"],
  category: "admin",
  admin: true,
  description: "Elimina un mensaje del grupo respondiendo a él.",

  async run(sock, msg, args, ctx) {
    const jid = msg.key.remoteJid;

    if (!ctx.isGroup) {
      return sock.sendMessage(
        jid,
        { text: "❌ Este comando solo funciona en grupos." },
        { quoted: msg }
      );
    }

    const quoted = msg.message?.extendedTextMessage?.contextInfo;
    if (!quoted?.stanzaId) {
      return sock.sendMessage(
        jid,
        { text: "❌ Responde al mensaje que deseas eliminar con *.del*" },
        { quoted: msg }
      );
    }

    let canDelete = ctx.isBotAdmin || (msg.key?.fromMe && ctx.isAdmin);

    if (!canDelete) {
      try {
        const fresh = await sock.groupMetadata(jid);
        const botDigits = [
          sock.user?.id?.replace(/\D/g, ""),
          sock.user?.lid?.replace(/\D/g, "")
        ].filter(Boolean);

        canDelete = fresh?.participants?.some(p => {
          const pid = p.id?.replace(/\D/g, "");
          const isAdm = p.admin === "admin" || p.admin === "superadmin";
          return isAdm && botDigits.includes(pid);
        }) || false;

        const ownerDigits = fresh?.owner?.replace(/\D/g, "");
        if (!canDelete && ownerDigits && botDigits.includes(ownerDigits)) {
          canDelete = true;
        }
      } catch {}
    }

    if (!canDelete) {
      return sock.sendMessage(
        jid,
        { text: "❌ El bot necesita ser administrador del grupo para eliminar mensajes." },
        { quoted: msg }
      );
    }

    try {
      const deleteKey = {
        remoteJid: jid,
        fromMe: false,
        id: quoted.stanzaId,
        participant: quoted.participant
      };

      await sock.sendMessage(jid, { delete: deleteKey });
    } catch (e) {
      console.error("❌ Error en admin-del:", e);
      await sock.sendMessage(
        jid,
        { text: "❌ No pude eliminar el mensaje (¿el mensaje es muy antiguo o no tengo permisos?)." },
        { quoted: msg }
      );
    }
  }
};
