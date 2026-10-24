
export default {
    commands: ["noticias"],
    category: "info",

    async run(sock, msg, args, ctx) {
        const jid = ctx.jid;

        const texto = `📢 *COMUNICADO OFICIAL*

*Hola usuarios* 👋

✅ *Les informamos que el comando* *.del* *ya se encuentra nuevamente en funcionamiento.*

🚫 *Así mismo, los comandos* *+18* *continúan deshabilitados temporalmente hasta nuevo aviso.*

*Agradecemos su paciencia y comprensión* 🙏
*Estén atentos a próximas actualizaciones* 🚀`;

        await sock.sendMessage(jid, {
            text: texto
        }, { quoted: msg });
    }
};
