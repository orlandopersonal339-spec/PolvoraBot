
export default {
  commands: ["escupir"],
  category: "admin",
  admin: true,
  description: "Expulsa usuarios con un mensaje grosero.",

  async run(sock, msg, args, ctx) {
    const jid = msg.key?.remoteJid || ctx.jid;

    // Verificar que sea un grupo
    if (!ctx.isGroup) {
      return sock.sendMessage(
        jid,
        { text: "❌ Este comando solo funciona en grupos, genio." },
        { quoted: msg }
      );
    }

    // Comprobar permisos de administrador del bot
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
      } catch (e) {
        console.error("Error verificando administradores:", e);
      }
    }

    if (!canKick) {
      return sock.sendMessage(
        jid,
        {
          text: "❌ El bot necesita ser administrador del grupo para expulsar usuarios."
        },
        { quoted: msg }
      );
    }

    // Obtener usuarios mencionados o el usuario del mensaje respondido
    const m = msg.message || {};
    let targets = [];

    const contextInfo =
      m?.extendedTextMessage?.contextInfo ||
      m?.imageMessage?.contextInfo ||
      m?.videoMessage?.contextInfo ||
      m?.documentMessage?.contextInfo;

    const replied = contextInfo?.participant;

    if (replied) {
      targets.push(replied);
    }

    const mentioned = contextInfo?.mentionedJid || [];

    if (mentioned.length) {
      targets.push(...mentioned);
    }

    // Verificar que haya objetivos
    if (targets.length === 0) {
      return sock.sendMessage(
        jid,
        {
          text: "💀 Usa .escupir @usuario o responde al mensaje de alguien."
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
      const digits = u.replace(/\D/g, "");
      return !botIdentifiers.includes(digits);
    });

    if (targets.length === 0) {
      return sock.sendMessage(
        jid,
        { text: "🤡 No puedo expulsarme a mí mismo." },
        { quoted: msg }
      );
    }

    try {
      // ENVIAR EL MENSAJE ANTES DE EXPULSAR
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

      // EXPULSAR DESPUÉS DE ENVIAR EL MENSAJE
      await sock.groupParticipantsUpdate(
        jid,
        targets,
        "remove"
      );

      console.log(
        `✅ Comando .escupir ejecutado. Usuarios expulsados: ${targets.length}`
      );

    } catch (e) {
      console.error("❌ Error en .escupir:", e);

      await sock.sendMessage(
        jid,
        {
          text:
            "❌ No pude completar la expulsión. " +
            "Verifica que el bot sea administrador y que los usuarios sigan en el grupo."
        },
        { quoted: msg }
      );
    }
  }
};
