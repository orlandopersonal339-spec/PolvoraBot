
import { totalmem, freemem } from 'os'

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    sizes.length - 1
  )
  const value = bytes / Math.pow(1024, i)
  return `${value.toFixed(2).replace(/\.00$/, '')} ${sizes[i]}`
}

function clockString(ms) {
  if (isNaN(ms)) return '--:--:--'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor(ms / 60000) % 60
  const s = Math.floor(ms / 1000) % 60

  return [h, m, s]
    .map(v => v.toString().padStart(2, '0'))
    .join(':')
}

export default {
  commands: ['speed', 'ping'],
  category: 'info',

  run: async (sock, msg, args, ctx) => {
    try {
      const jid = ctx?.jid || msg?.key?.remoteJid
      if (!jid) return

      const botName =
        global.namebot || sock?.user?.name || 'SonicBot'

      const t0 = process.hrtime.bigint()

      const upMs = process.uptime() * 1000
      const muptime = clockString(upMs)

      const storeChats = ctx?.store?.chats || {}
      const chatIds = Object.keys(storeChats)

      const privateChats = chatIds.filter(
        id => !id.endsWith('@g.us')
      ).length

      const groups = chatIds.filter(
        id => id.endsWith('@g.us')
      ).length

      const usedRam = totalmem() - freemem()
      const totalRam = totalmem()

      const texto = `🚩 *${botName}*

🚀 *Velocidad:*
→ Midiendo...

🕒 *Activo durante:*
→ ${muptime}

💫 *Chats:*
→ ${privateChats} *Chats privados*
→ ${groups} *Grupos*

🏆 *Servidor:*
➤ *RAM utilizada ⪼* ${formatBytes(usedRam)} / ${formatBytes(totalRam)}`.trim()

      const latencyMs =
        Number(process.hrtime.bigint() - t0) / 1e6

      const respuesta = texto.replace(
        '→ Midiendo...',
        `→ ${latencyMs.toFixed(4)} ms`
      )

      await sock.sendMessage(
        jid,
        { text: respuesta },
        { quoted: msg }
      )
    } catch (err) {
      console.error('Error en plugin speed:', err)

      const jid = ctx?.jid || msg?.key?.remoteJid

      if (jid) {
        await sock.sendMessage(
          jid,
          { text: `❌ Error:\n${err.message}` },
          { quoted: msg }
        )
      }
    }
  }
}
