export default {
  commands: ["kick", "ban", "expulsar"],
  category: "admin",
  admin: true,
  description: "Expulsa uno o varios usuarios (respondiendo o mencionando).",

  async run(sock, msg, args, ctx) {
    const jid = msg.key?.remoteJid || ctx.jid;

    if (!ctx.isGroup) {
      return sock.sendMessage(
        jid,
        { text: "❌ Este comando solo funciona en grupos." },
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
          const isAdm = p.admin === "admin" || p.admin === "superadmin";
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
        { text: "❌ El bot necesita ser administrador del grupo para expulsar usuarios." },
        { quoted: msg }
      );
    }

    const m = msg.message || {};
    let targets = [];

    // 1️⃣ Si responde a un mensaje
    const replied = m?.extendedTextMessage?.contextInfo?.participant;
    if (replied) targets.push(replied);

    // 2️⃣ Si menciona con @
    const mentioned = m?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (mentioned.length) targets.push(...mentioned);

    // ❌ Si no hay usuarios
    if (targets.length === 0) {
      return sock.sendMessage(
        jid,
        { text: "❌ Responde a un mensaje o menciona uno o varios usuarios (@usuario)." },
        { quoted: msg }
      );
    }

    // 🔁 Eliminar duplicados
    targets = [...new Set(targets)];

    // 🚫 Evitar auto-kick del bot
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
        { text: "❌ No puedo expulsarme a mí mismo." },
        { quoted: msg }
      );
    }

    try {
      await sock.groupParticipantsUpdate(jid, targets, "remove");

      await sock.sendMessage(
        jid,
        { text: `🦶 Usuarios expulsados: ${targets.length}` },
        { quoted: msg }
      );
    } catch (e) {
      console.error("❌ Error kick:", e);
      await sock.sendMessage(
        jid,
        { text: "❌ No pude expulsar a uno o más usuarios (¿faltan permisos de admin?)." },
        { quoted: msg }
      );
    }
  }
};
