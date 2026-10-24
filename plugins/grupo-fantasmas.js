export default {
  commands: ["fantasmas"],
  admin: true,
  category: "admin",
  description: "Detecta usuarios inactivos en el grupo.",

  async run(sock, msg, args, ctx) {
    const {
      jid,
      isGroup,
      participants,
      groupMetadata,
      store,
      isBotAdmin
    } = ctx;

    if (!isGroup) {
      return sock.sendMessage(
        jid,
        { text: "❌ Este comando solo funciona en grupos." },
        { quoted: msg }
      );
    }

    const normalizeUser = id =>
      id
        ?.toString()
        .replace(/@s\.whatsapp\.net|@lid/g, "")
        .replace(/:\d+/g, "")
        .replace(/\D/g, "");

    const chatStore = store?.chats?.[jid] || {};

    const groupUsers = (participants || []).map(p => {
      const num = normalizeUser(p.id);
      const data = chatStore[num] || null;

      return {
        id: p.id,
        num,
        admin: p.admin === "admin" || p.admin === "superadmin",
        hablo: !!data,
        last: data?.time || null
      };
    });

    const fantasmas = groupUsers.filter(u => !u.hablo && !u.admin);

    // ===============================
    // 🧹 KICK FANTASMAS
    // ===============================
    if (args[0] === "kick") {
      if (!isBotAdmin) {
        return sock.sendMessage(jid, {
          text: "❌ El bot no es admin del grupo, no puedo expulsar usuarios."
        }, { quoted: msg });
      }

      if (args[1] !== "confirmar") {
        return sock.sendMessage(jid, {
          text:
            "⚠️ *CONFIRMACIÓN REQUERIDA*\n\n" +
            `Esto expulsará a los *${fantasmas.length}* fantasmas detectados (no administradores).\n\n` +
            `Usa:\n*${ctx.prefix || "."}fantasmas kick confirmar*`
        }, { quoted: msg });
      }

      if (!fantasmas.length) {
        return sock.sendMessage(jid, {
          text: "✅ No hay usuarios inactivos que expulsar."
        }, { quoted: msg });
      }

      await sock.sendMessage(jid, {
        text: `🧹 Iniciando expulsión de *${fantasmas.length}* fantasmas...`
      }, { quoted: msg });

      const toKick = fantasmas.map(u => u.id);
      const CHUNK = 5;

      for (let i = 0; i < toKick.length; i += CHUNK) {
        const batch = toKick.slice(i, i + CHUNK);
        try {
          await sock.groupParticipantsUpdate(jid, batch, "remove");
        } catch (e) {
          console.error("❌ Error expulsando lote de fantasmas:", e);
        }
        await new Promise(r => setTimeout(r, 1500));
      }

      return sock.sendMessage(jid, {
        text:
          `🧹 *LIMPIEZA COMPLETA*\n\n` +
          `👻 Fantasmas procesados: ${fantasmas.length}\n` +
          `🛡️ Admins protegidos.`
      });
    }

    // ===============================
    // 📩 LISTA DE FANTASMAS
    // ===============================
    if (!fantasmas.length) {
      return sock.sendMessage(jid, {
        text:
          "✅ *No se detectaron fantasmas.*\n" +
          "Todos los miembros han enviado al menos un mensaje recientemente."
      }, { quoted: msg });
    }

    const listText =
      "👻 *USUARIOS QUE NO HAN HABLADO*\n" +
      "_Desde el último reinicio o actividad registrada_\n\n" +
      fantasmas.slice(0, 50).map(u => `👻 @${u.num}`).join("\n") +
      (fantasmas.length > 50 ? `\n... y ${fantasmas.length - 50} más` : "") +
      `\n\n🧹 Para expulsarlos usa:\n*${ctx.prefix || "."}fantasmas kick*`;

    return sock.sendMessage(jid, {
      text: listText,
      mentions: fantasmas.slice(0, 50).map(u => u.id)
    }, { quoted: msg });
  }
};
