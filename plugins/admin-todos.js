
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

    const metadata = await sock.groupMetadata(jid)
    const participants = metadata.participants || []
    const mentions = participants.map(p => p.id)
    const info = args.join(' ') || 'hola despierten'

    const miembros = mentions.map(
      id => `┊» 🌍 @${id.split('@')[0]}`
    ).join('\n')

    const texto = `！ 𝗠𝗘𝗡𝗖𝗜𝗢𝗡 𝗚𝗘𝗡𝗘𝗥𝗔𝗟  ！
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
  }
}
