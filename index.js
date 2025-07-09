
import 'dotenv/config';
import { Client, GatewayIntentBits, Events } from 'discord.js';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel]
});

const prefix = ">";

client.once(Events.ClientReady, () => {
    console.log(`✅ Bot conectado como ${client.user.tag}`);
});

function validacionBasica(message) {
    if (!message.guild) return "❌ Este comando no está disponible por mensaje directo.";
    if (!message.member.permissions.has("Administrator")) return "❌ No tienes permisos de administrador.";
    return null;
}

function canalDeVoz(message) {
    return message.member.voice?.channel ?? null;
}

async function limpiar(message, replyMessage = null) {
    setTimeout(async () => {
        try {
            await message.delete().catch(() => {});
            if (replyMessage) await replyMessage.delete().catch(() => {});
        } catch {}
    }, 20000);
}

client.on(Events.MessageCreate, async (message) => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const comando = args.shift().toLowerCase();

    const canal = canalDeVoz(message);
    const error = validacionBasica(message);

    if (comando === "join") {
        if (error) return limpiar(message, await message.reply(error));
        if (!canal) return limpiar(message, await message.reply("❌ Debes estar en un canal de voz."));

        try {
            await canal.join(); // No funcional en v14
        } catch (e) {
            return limpiar(message, await message.reply("❌ No puedo unirme al canal."));
        }

        await message.react("🔊");
        limpiar(message);

    } else if (comando === "leave") {
        if (error) return limpiar(message, await message.reply(error));
        const connection = canal?.guild?.members.me?.voice.channel;
        if (!connection) return limpiar(message, await message.reply("❌ No estoy conectado a ningún canal."));

        try {
            await message.guild.members.me.voice.disconnect();
            await message.react("👋");
            limpiar(message);
        } catch {
            await message.reply("❌ No puedo desconectarme.");
        }

    } else if (comando === "mutear") {
        if (error) return limpiar(message, await message.reply(error));
        if (!canal) return limpiar(message, await message.reply("❌ Debes estar en un canal de voz."));

        const autorRol = message.member.roles.highest;
        let fallos = 0;

        for (const miembro of canal.members.values()) {
            if (miembro.id === message.author.id) continue;
            if (miembro.roles.highest.comparePositionTo(autorRol) < 0) {
                try {
                    await miembro.voice.setMute(true);
                } catch {
                    fallos++;
                }
            }
        }

        if (fallos > 0) message.channel.send(`⚠️ No se pudo mutear a ${fallos} miembro(s).`);
        await message.react("🔇");
        limpiar(message);

    } else if (comando === "desmutear") {
        if (error) return limpiar(message, await message.reply(error));
        if (!canal) return limpiar(message, await message.reply("❌ Debes estar en un canal de voz."));

        let fallos = 0;
        for (const miembro of canal.members.values()) {
            try {
                await miembro.voice.setMute(false);
            } catch {
                fallos++;
            }
        }

        if (fallos > 0) message.channel.send(`⚠️ No se pudo desmutear a ${fallos} miembro(s).`);
        await message.react("🔊");
        limpiar(message);

    } else if (comando === "prioridad") {
        if (error) return limpiar(message, await message.reply(error));
        if (!canal) return limpiar(message, await message.reply("❌ Debes estar en un canal de voz."));
        const mencionado = message.mentions.members.first();
        if (!mencionado || !canal.members.has(mencionado.id)) {
            return limpiar(message, await message.reply("❌ Debes mencionar a alguien que esté en el canal de voz."));
        }

        const autorRol = message.member.roles.highest;
        let fallos = 0;

        for (const miembro of canal.members.values()) {
            if ([mencionado.id, message.author.id].includes(miembro.id)) continue;
            if (miembro.roles.highest.comparePositionTo(autorRol) < 0) {
                try {
                    await miembro.voice.setMute(true);
                } catch {
                    fallos++;
                }
            }
        }

        await message.channel.send({
            embeds: [{
                title: "🎙️ Prioridad de Voz Activada",
                description: `${mencionado} tiene la palabra.
Los demás han sido silenciados.`,
                color: 0xFFA500,
                fields: fallos ? [{ name: "⚠️ Advertencia", value: `${fallos} miembros no pudieron ser silenciados.` }] : []
            }]
        });

        await message.react("🎤");
        limpiar(message);

    } else if (comando === "desprioridad") {
        if (error) return limpiar(message, await message.reply(error));
        if (!canal) return limpiar(message, await message.reply("❌ Debes estar en un canal de voz."));

        let fallos = 0;
        for (const miembro of canal.members.values()) {
            try {
                await miembro.voice.setMute(false);
            } catch {
                fallos++;
            }
        }

        await message.channel.send({
            embeds: [{
                title: "🔊 Fin de Prioridad de Voz",
                description: "Todos han sido desmuteados.",
                color: 0x00FF00,
                fields: fallos ? [{ name: "⚠️ Advertencia", value: `${fallos} miembros no fueron desmuteados.` }] : []
            }]
        });

        await message.react("✅");
        limpiar(message);

    } else if (["ayuda", "help"].includes(comando)) {
        if (!message.guild) return limpiar(message, await message.reply("❌ No disponible por DM."));

        await message.channel.send({
            embeds: [{
                title: "🛠️ Comandos disponibles",
                description: "Control de voz por roles y administración.",
                color: 0x3498DB,
                fields: [
                    { name: "🔊 `>join`", value: "El bot se une al canal de voz.", inline: false },
                    { name: "👋 `>leave`", value: "El bot se desconecta del canal de voz.", inline: false },
                    { name: "🔇 `>mutear`", value: "Silencia a miembros con menor rol.", inline: false },
                    { name: "🔊 `>desmutear`", value: "Desmutea a todos los miembros.", inline: false },
                    { name: "🎤 `>prioridad @usuario`", value: "Da la palabra a alguien silenciando al resto.", inline: false },
                    { name: "✅ `>desprioridad`", value: "Desmutea a todos los miembros.", inline: false },
                    { name: "❓ `>ayuda`", value: "Muestra esta ayuda.", inline: false }
                ]
            }]
        });

        limpiar(message);
    }
});

client.login(process.env.DISCORD_TOKEN);
