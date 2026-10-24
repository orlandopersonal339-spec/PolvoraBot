
import os from 'os'

function clockString(ms) {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor(ms / 60000) % 60
  const s = Math.floor(ms / 1000) % 60
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':')
}

export default {
  commands: ['menu', 'help'],
  category: 'info',

  async run(sock, msg, args, ctx) {
    const jid = ctx?.jid || msg?.key?.remoteJid
    if (!jid) return

    const userId = msg?.key?.participant || jid
    const nombre = msg?.pushName || 'Usuario'
    const prefix = global.prefix || '.'

    const ahora = new Date()
    const uptime = clockString(process.uptime() * 1000)
    const fecha = ahora.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
    const dia = ahora.toLocaleDateString('es-MX', {
      weekday: 'long'
    })

    const storeChats = ctx?.store?.chats || {}
    const totalChats = Object.keys(storeChats).length

    // Obtener los comandos registrados por categoría
    const plugins = global.plugins || {}

    const admin = []
    const grupo = []
    const descargas = []
    const multi = []
    const tools = []
    const funny = []
    const info = []
    const onoff = []
    const owner = []
    const ventas = []
    const hot = []

    for (const plugin of Object.values(plugins)) {
      if (!plugin || !plugin.commands) continue

      const commands = Array.isArray(plugin.commands)
        ? plugin.commands
        : [plugin.commands]

      const category = String(plugin.category || 'info').toLowerCase()

      let destino = info

      if (['admin', 'administracion'].includes(category)) destino = admin
      else if (['group', 'grupo'].includes(category)) destino = grupo
      else if (['download', 'descargas'].includes(category)) destino = descargas
      else if (['media', 'multimedia', 'audio', 'image'].includes(category)) destino = multi
      else if (['tools', 'tool', 'utility', 'herramientas'].includes(category)) destino = tools
      else if (['fun', 'funny', 'diversion'].includes(category)) destino = funny
      else if (['onoff', 'switch', 'config'].includes(category)) destino = onoff
      else if (['owner', 'propietario'].includes(category)) destino = owner
      else if (['ventas', 'store', 'shop'].includes(category)) destino = ventas
      else if (['hot', 'nsfw', '+18'].includes(category)) destino = hot

      destino.push(...commands.map(c => String(c).replace(/^\./, '')))
    }

    const crearCategoria = (titulo, comandos) => {
      const unicos = [...new Set(comandos)].sort()
      return unicos.length
        ? `├──「 ${titulo} 」\n${unicos.map(c => `│ • ${prefix}${c}`).join('\n')}`
        : null
    }

    const categorias = [
      crearCategoria('🛠️ ADMIN', admin),
      crearCategoria('👥 GRUPO', grupo),
      crearCategoria('📥 DESCARGAS', descargas),
      crearCategoria('🔀 MULTIMEDIA', multi),
      crearCategoria('🧰 HERRAMIENTAS', tools),
      crearCategoria('😂 FUNNY', funny),
      crearCategoria('📘 INFO', info),
      crearCategoria('🔧 ON / OFF', onoff),
      crearCategoria('👑 OWNER', owner),
      ventas.length ? `├──「 🛍️ VENTAS 」\n│ • ${prefix}menustore` : null,
      crearCategoria('🔞 +18', hot)
    ].filter(Boolean).join('\n')

    const menu = `╭━─━──────━─━╮
╰╮ » 𝗦𝗼𝗻𝗶𝗰𝗕𝗼𝘁 𝗣𝗿𝗼
╭━─━──────━─━╯
┊› ¡𝙂𝙤𝙤𝙙 𝙉𝙞𝙜𝙝𝙩! 🌜☁
┊› 𝖧𝗈𝗅𝖺 @${userId.split('@')[0]}
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
┊» 𝖧𝗈𝗌𝗍: ${os.hostname()}
┊» 𝖯𝗅𝖺𝗍𝖺𝖿𝗈𝗋𝗆𝖺: ${os.platform()}
┊» 𝖳𝗈𝗍𝖺𝗅 𝖽𝖾 𝖼𝗁𝖺𝗍𝗌: ${totalChats}
┊» 𝖠𝗉𝗈𝖽𝗈: ${nombre}
┊» 𝖣𝗂𝖺: ${dia}
┊» 𝖥𝖾𝖼𝗁𝖺: ${fecha}
╰─────────────

╭━─━──────━─━╮
╰╮ » 𝗖𝗢𝗠𝗔𝗡𝗗𝗢𝗦 📂
╭━─━──────━─━╯
${categorias || '│ • No hay comandos registrados'}
╰─────────────

ㅤㅤㅤㅤ𝗦𝗼𝗻𝗶𝗰𝗕𝗼𝘁 𝗣𝗿𝗼 🤖`

    await sock.sendMessage(jid, {
      text: menu,
      mentions: [userId]
    }, { quoted: msg })
  }
}
