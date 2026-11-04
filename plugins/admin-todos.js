export default {
  commands: ['todos'],
  category: 'group',

  async run(sock, msg, args, ctx) {
    const jid = ctx?.jid || msg?.key?.remoteJid
    if (!jid) return

    if (!jid.endsWith('@g.us')) {
      return sock.sendMessage(
        jid,
        { text: '❌ Este comando solo funciona en grupos.' },
        { quoted: msg }
      )
    }

    try {
      const metadata = await sock.groupMetadata(jid)
      const participants = metadata.participants || []

      if (!participants.length) {
        return sock.sendMessage(
          jid,
          { text: '❌ No se encontraron integrantes del grupo.' },
          { quoted: msg }
        )
      }

      const mentions = participants.map(p => p.id)

      const info = args.join(' ') || 'Sin información'

      // Obtener bandera según prefijo telefónico
      function obtenerBandera(id) {
        const numero = id
          .split('@')[0]
          .replace(/\D/g, '')

        const paises = [
          ['593', '🇪🇨'],
          ['591', '🇧🇴'],
          ['595', '🇵🇾'],
          ['598', '🇺🇾'],
          ['507', '🇵🇦'],
          ['506', '🇨🇷'],
          ['502', '🇬🇹'],
          ['503', '🇸🇻'],
          ['504', '🇭🇳'],
          ['505', '🇳🇮'],
          ['509', '🇭🇹'],
          ['57', '🇨🇴'],
          ['52', '🇲🇽'],
          ['54', '🇦🇷'],
          ['56', '🇨🇱'],
          ['51', '🇵🇪'],
          ['58', '🇻🇪'],
          ['53', '🇨🇺'],
          ['55', '🇧🇷'],
          ['34', '🇪🇸'],
          ['44', '🇬🇧'],
          ['33', '🇫🇷'],
          ['49', '🇩🇪'],
          ['39', '🇮🇹'],
          ['81', '🇯🇵'],
          ['86', '🇨🇳'],
          ['91', '🇮🇳'],
          ['61', '🇦🇺'],
          ['27', '🇿🇦'],
          ['7', '🇷🇺'],
          ['1', '🇺🇸']
        ]

        const pais = paises.find(([codigo]) =>
          numero.startsWith(codigo)
        )

        return pais ? pais[1] : '🌍'
      }

      const miembros = participants.map(p => {
        const id = p.id
        const numero = id.split('@')[0]

        return `┊» ${obtenerBandera(id)} @${numero}`
      }).join('\n')

      const texto = `！ 𝗠𝗘𝗡𝗖𝗜𝗢𝗡 𝗚𝗘𝗡𝗘𝗥𝗔𝗟 ！

ㅤ 𝗣𝗔𝗥𝗔 ${mentions.length} 𝗠𝗘𝗠𝗕𝗘𝗥𝗦 🤖

» 𝗜𝗡𝗙𝗢: ${info}

╭ ⊹  .  ⊹
${miembros}
╰ㅤㅤㅤ𝗦𝗼𝗻𝗶𝗰𝗕𝗼𝘁 𝗣𝗿𝗼`

      await sock.sendMessage(
        jid,
        {
          text: texto,
          mentions
        },
        { quoted: msg }
      )

    } catch (error) {
      console.error('Error en comando todos:', error)

      await sock.sendMessage(
        jid,
        { text: '❌ Ocurrió un error al mencionar a los integrantes.' },
        { quoted: msg }
      )
    }
  }
}
