
export default {
  commands: ['stickers2'],
  category: 'multimedia',
  description: 'El bot te dará sticker.',

  async run(sock, msg, args, ctx) {
    const jid = msg.key?.remoteJid || ctx.jid;

    // Colección de stickers
    const STICKERS = [
      'https://qu.ax/rls30'
    ];

    try {
      const url = STICKERS[
        Math.floor(Math.random() * STICKERS.length)
      ];

      await sock.sendMessage(
        jid,
        { text: '⏳ Enviando tu sticker...' },
        { quoted: msg }
      );

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('No se pudo descargar el sticker');
      }

      const buffer = Buffer.from(
        await response.arrayBuffer()
      );

      await sock.sendMessage(
        jid,
        { sticker: buffer },
        { quoted: msg }
      );

    } catch (error) {
      console.error('Error stickers2:', error);

      await sock.sendMessage(
        jid,
        {
          text: '❌ No pude enviar el sticker. Revisa el enlace.'
        },
        { quoted: msg }
      );
    }
  }
};
