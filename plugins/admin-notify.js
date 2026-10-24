export default {
  commands: ["n", "notify", "hidetag"],
  admin: true,
  group: true,
  category: "admin",
  description: "Notifica a todos los miembros del grupo (hidetag)",

  async run(sock, msg, args, ctx) {
    const jid = msg.key?.remoteJid || ctx.jid;

    if (!ctx.isGroup) {
      return sock.sendMessage(
        jid,
        { text: "❌ Este comando solo funciona en grupos." },
        { quoted: msg }
      );
    }

    try {
      const texto = args.join(" ").trim();
      const participants = ctx.participants || [];
      const mentions = participants.map(p => p.id);

      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

      // ===============================
      // 1️⃣ RESPONDIENDO A ALGO → REENVÍO
      // ===============================
      if (quoted) {
        const fullQuoted = msg.message.extendedTextMessage.contextInfo;

        await sock.sendMessage(
          jid,
          {
            forward: {
              key: fullQuoted.stanzaId
                ? {
                    remoteJid: jid,
                    fromMe: false,
                    id: fullQuoted.stanzaId,
                    participant: fullQuoted.participant
                  }
                : msg.key,
              message: quoted
            },
            mentions
          }
        );

        if (texto) {
          await sock.sendMessage(jid, {
            text: texto,
            mentions
          });
        }

        return;
      }

      // ===============================
      // 2️⃣ SIN RESPONDER → TEXTO NORMAL
      // ===============================
      if (!texto) {
        return await sock.sendMessage(
          jid,
          { text: `⚠️ Usa *${ctx.prefix || "."}n <texto>* o responde a cualquier mensaje.` },
          { quoted: msg }
        );
      }

      return await sock.sendMessage(
        jid,
        {
          text: texto,
          mentions
        }
      );

    } catch (err) {
      console.error("❌ ERROR EN HIDETAG:", err);
      await sock.sendMessage(
        jid,
        { text: "❌ Error al enviar la notificación a todos." },
        { quoted: msg }
      );
    }
  }
};
