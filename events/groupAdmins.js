export default function groupAdmins(sock) {
  sock.ev.on("group-participants.update", async update => {
    try {
      const { id, participants, action } = update;

      if (!["promote", "demote"].includes(action)) return;
      if (!participants || !participants.length) return;

      const extractJid = (p) => {
        if (!p) return "";
        if (typeof p === "string") return p;
        if (typeof p === "object") return p.id || p.jid || p.phoneNumber || "";
        return String(p);
      };

      const mentions = participants.map(extractJid).filter(Boolean);
      if (!mentions.length) return;

      const tags = mentions.map(j => `@${j.split("@")[0]}`).join(" ");

      const texto =
        action === "promote"
          ? `👑 *Nuevo Administrador*\n\n${tags} ahora tiene poderes de administrador.`
          : `⚠️ *Administrador Removido*\n\n${tags} ya no es administrador del grupo.`;

      await sock.sendMessage(id, {
        text: texto,
        mentions
      });

    } catch (e) {
      console.error("❌ Error alerta admin:", e);
    }
  });
}
