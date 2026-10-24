
export default {
  commands: ['menu', 'help'],
  category: 'info',

  async run(sock, msg, args, ctx) {
    const jid = ctx?.jid || msg?.key?.remoteJid;
    if (!jid) return;

    const prefix = ctx?.prefix || '.';
    const userId =
      msg?.key?.participant ||
      msg?.key?.remoteJid ||
      '';
    const nombre = msg?.pushName || 'Usuario';

    const clockString = (ms) => {
      const s = Math.floor(ms / 1000);
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;

      return [h, m, sec]
        .map(n => String(n).padStart(2, '0'))
        .join(':');
    };

    const ahora = new Date();
    const dia = ahora.toLocaleDateString('es-MX', {
      weekday: 'long'
    });
    const fecha = ahora.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const chats =
      ctx?.store?.chats ||
      global.store?.chats ||
      {};

    const totalChats = Object.keys(chats).length;
    const uptime = clockString(process.uptime() * 1000);

    // Buscar los plugins registrados en el bot.
    const plugins = global.plugins || ctx?.plugins || {};
    const listaPlugins = Array.isArray(plugins)
      ? plugins
      : Object.values(plugins);

    const categorias = {
      admin: [],
      grupo: [],
      descargas: [],
      multi: [],
      tools: [],
      funny: [],
      info: [],
      onoff: [],
      owner: [],
      ventas: [],
      hot: []
    };

    const clasificar = (plugin, comando) => {
      const categoria = String(
        plugin?.category ||
        plugin?.categoria ||
        ''
      ).toLowerCase();

      const texto = `${categoria} ${comando}`.toLowerCase();

      if (/owner|propietario|dueño/.test(texto))
        return 'owner';

      if (/venta|store|tienda|menustore/.test(texto))
        return 'ventas';

      if (/18\+|adult|nsfw|hot|xxx/.test(texto))
        return 'hot';

      if (/on.?off|activar|desactivar|enable|disable/.test(texto))
        return 'onoff';

      if (/admin|administrador|mod/.test(texto))
        return 'admin';

      if (/grupo|group|tagall|todos|hidetag|antilink/.test(texto))
        return 'grupo';

      if (/descarga|download|youtube|tiktok|instagram|facebook/.test(texto))
        return 'descargas';

      if (/multimedia|media|sticker|imagen|video|audio|play/.test(texto))
        return 'multi';

      if (/funny|diversión|diversion|juego|juegos|meme/.test(texto))
        return 'funny';

      if (/herramienta|tools|utilidad|utilidades|convertir/.test(texto))
        return 'tools';

      return 'info';
    };

    for (const plugin of listaPlugins) {
      if (!plugin || !Array.isArray(plugin.commands)) continue;

      for (const comando of plugin.commands) {
        if (typeof comando !== 'string') continue;

        const nombreComando = comando.trim().toLowerCase();
        if (!nombreComando) continue;

        // No mostrar el propio menú en las categorías.
        if (['menu', 'help'].includes(nombreComando)) continue;

        const categoria = clasificar(plugin, nombreComando);
        categorias[categoria].push(nombreComando);
      }
    }

    const bloque = (titulo, comandos) => {
      const unicos = [...new Set(comandos)].sort();

      return unicos.length
        ? `├──「 ${titulo} 」\n` +
          unicos.map(c => `│ • ${prefix}${c}`).join('\n')
        : null;
    };

    const secciones = [
      bloque('🛠️ ADMIN', categorias.admin),
      bloque('👥 GRUPO', categorias.grupo),
      bloque('📥 DESCARGAS', categorias.descargas),
      bloque('🔀 MULTIMEDIA', categorias.multi),
      bloque('🧰 HERRAMIENTAS', categorias.tools),
      bloque('😂 FUNNY', categorias.funny),
      bloque('📘 INFO', categorias.info),
      bloque('🔧 ON / OFF', categorias.onoff),
      bloque('👑 OWNER', categorias.owner),
      `├──「 🛍️ VENTAS 」\n│ • ${prefix}menustore`,
      bloque('🔞 +18', categorias.hot)
    ].filter(Boolean);

    const menu = `
╭━─━──────━─━╮
╰╮ » 𝗦𝗼𝗻𝗶𝗰𝗕𝗼𝘁 𝗣𝗿𝗼
╭━─━──────━─━╯
┊› ¡𝙂𝙤𝙤𝙙 𝙉𝙞𝙜𝙝𝙩! 🌜☁
┊› 𝖧𝗈𝗅𝖺 ${nombre}
┊› 𝖡𝗈𝗍: SonicBot Pro 🤖
┊› 𝖨𝖦: instagram.com/orland0157 📸
┊› 𝖤𝗇𝗏𝗂𝖺 𝗆𝗌𝗃 𝗉𝖺𝗋𝖺 𝖺𝗒𝗎𝖽𝖺
┊› 𝖢𝗎𝗆𝗉𝗅𝖾 𝗍𝗎𝗌 𝗇𝖾𝖼𝖾𝗌𝗂𝖽𝖺𝖽𝖾𝗌
┊› 𝖤𝗇 𝗍𝗎𝗌 𝗀𝗋𝗎𝗉𝗈𝗌 𝖽𝖾 𝖶𝖠 🧃
╰─────────────

╭━─━──────━─━╮
╰╮ » 𝗥𝗘𝗣𝗢𝗥𝗧𝗔𝗝𝗘 📡
╭━─━──────━─━╯
┊» 𝖳𝗂𝖾𝗆𝗉𝗈 𝖺𝖼𝗍𝗂𝗏𝗈: ${uptime}
┊» 𝖫𝖾𝗇𝗀𝗎𝖺𝗃𝖾: JavaScript
┊» 𝖧𝗈𝗌𝗍: localhost
┊» 𝖯𝗅𝖺𝗍𝖿𝗈𝗋𝗆𝖺: android
┊» 𝖳𝗈𝗍𝖺𝗅 𝖽𝖾 𝖼𝗁𝖺𝗍𝗌: ${totalChats}
┊» 𝖠𝗉𝗈𝖽𝗈: Orlando157
┊» 𝖣𝗂𝖺: ${dia}
┊» 𝖥𝖾𝖼𝗁𝖺: ${fecha}
╰─────────────

╭━─━──────━─━╮
╰╮ » 𝗖𝗢𝗠𝗔𝗡𝗗𝗢𝗦 📚
╭━─━──────━─━╯
${secciones.join('\n\n') || '│ • No hay comandos registrados'}
╰─────────────
`.trim();

    await sock.sendMessage(
      jid,
      {
        text: menu,
        mentions: userId ? [userId] : []
      },
      { quoted: msg }
    );
  }
};
