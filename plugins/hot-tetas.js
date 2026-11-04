
const VIDEOS_PORNO = [
    "https://litter.catbox.moe/u3xea7ni4ml0b2o2.mov",
    "https://litter.catbox.moe/vkallw81ir0vfwer.mov",
    "https://litter.catbox.moe/lub4flq2633a8gw3.mov"
];

export default {
    commands: ["porno"],
    category: "hot",
    description: "Envía un video aleatorio",

    async run(sock, msg, args, ctx) {
        const jid = ctx.jid;

        try {
            const url = VIDEOS_PORNO[
                Math.floor(Math.random() * VIDEOS_PORNO.length)
            ];

            await sock.sendMessage(jid, {
                video: { url },
                mimetype: "video/quicktime",
                caption: "🎬 Video aleatorio"
            }, { quoted: msg });

        } catch (error) {
            console.error("Error en .porno:", error);

            await sock.sendMessage(jid, {
                text: "❌ No pude enviar el video. Inténtalo nuevamente."
            }, { quoted: msg });
        }
    }
};
