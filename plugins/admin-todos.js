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
          { text: '❌ No se encontraron integrantes.' },
          { quoted: msg }
        )
      }

      const info = args.join(' ') || 'Sin información'

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
        ['1', '🇺🇸']
      ]

      function obtenerNumero(participant) {
        const candidatos = [
          participant.phoneNumber,
          participant.id,
          participant.jid,
          participant.lid
        ]

        for (const candidato of candidatos) {
          if (!candidato) continue

          const valor = String(candidato)

          if (valor.includes('@s.whatsapp.net')) {
            return valor.split('@')[0].replace(/\D/g, '')
          }

          if (!valor.includes('@') && /^\d+$/.test(valor)) {
            return valor
          }
        }

        return null
      }

      function obtenerBandera(numero) {
        if (!numero) return '🌍'

        const pais = paises.find(([codigo]) =>
          numero.startsWith(codigo)
        )

        return pais ? pais[1] : '🌍'
      }

      const mentions = participants.map(p => p.id)

      const miembros = participants.map(p => {
        const numero = obtenerNumero(p)
        const id = p.id
        const bandera = obtenerBandera(numero)

        return `┊» ${bandera} @${id.split('@')[0]}`
      }).join('\n')

      const texto = `！ 𝗠𝗘𝗡𝗖𝗜𝗢𝗡 𝗚𝗘𝗡𝗘𝗥𝗔𝗟 ！

ㅤ 𝗣𝗔𝗥𝗔 ${mentions.length} 𝗠𝗘𝗠𝗕𝗘𝗥𝗦 🤖

» 𝗜𝗡𝗙𝗢: ${info}

╭ ⊹  .  ⊹
${miembros}
╰ㅤㅤㅤ𝗦𝗼𝗻𝗶𝗰𝗕𝗼𝘁 𝗣𝗿𝗼`

      await sock.sendMessage(
        jid,
        { text: texto, mentions },
        { quoted: msg }
      )

    } catch (error) {
      console.error('Error en todos:', error)

      await sock.sendMessage(
        jid,
        { text: '❌ Ocurrió un error al mencionar a los integrantes.' },
        { quoted: msg }
      )
    }
  }
}
