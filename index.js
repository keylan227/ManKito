import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, Events } from 'discord.js';
import { joinVoiceChannel } from '@discordjs/voice';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

function validacionBasica(interaction) {
  if (!interaction.guild) return "❌ Este comando no está disponible por mensaje directo.";
  if (!interaction.member.permissions.has("Administrator")) return "❌ No tienes permisos de administrador.";
  return null;
}

function canalDeVoz(member) {
  return member.voice?.channel ?? null;
}

async function limpiar(interaction, mensaje) {
  setTimeout(async () => {
    try {
      await interaction.deleteReply();
      if (mensaje) await mensaje.delete();
    } catch {}
  }, 20000);
}

client.once(Events.ClientReady, () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
});

client.on(Events.MessageCreate, async (msg) => {
  if (!msg.content.startsWith(">") || msg.author.bot) return;

  const comando = msg.content.slice(1).trim().toLowerCase();
  const interaction = msg;

  const error = validacionBasica(interaction);
  if (error) {
    const aviso = await msg.reply(error);
    return limpiar(interaction, aviso);
  }

  const canal = canalDeVoz(interaction.member);
  if (!canal) {
    const aviso = await msg.reply("❌ Debes estar conectado a un canal de voz.");
    return limpiar(interaction, aviso);
  }

  if (comando === "join") {
    joinVoiceChannel({
      channelId: canal.id,
      guildId: canal.guild.id,
      adapterCreator: canal.guild.voiceAdapterCreator
    });
    await msg.react("🔊");
    return limpiar(interaction);
  }

  if (comando === "leave") {
    if (!interaction.guild.members.me.voice.channel) {
      const aviso = await msg.reply("❌ No estoy conectado a ningún canal de voz.");
      return limpiar(interaction, aviso);
    }
    await interaction.guild.members.me.voice.disconnect();
    await msg.react("👋");
    return limpiar(interaction);
  }

  if (comando === "mutear") {
    const autorRol = interaction.member.roles.highest;
    for (const miembro of canal.members.values()) {
      if (miembro.id === interaction.author.id) continue;
      if (miembro.roles.highest.position < autorRol.position) {
        try {
          await miembro.voice.setMute(true);
        } catch {}
      }
    }
    await msg.react("🔇");
    return limpiar(interaction);
  }

  if (comando === "desmutear") {
    for (const miembro of canal.members.values()) {
      try {
        await miembro.voice.setMute(false);
      } catch {}
    }
    await msg.react("🔊");
    return limpiar(interaction);
  }

  if (comando === "ayuda" || comando === "help") {
    const { EmbedBuilder } = await import("discord.js");
    const embed = new EmbedBuilder()
      .setTitle("🛠️ Comandos disponibles")
      .setDescription("Este bot controla el audio en canales de voz.")
      .addFields(
        { name: "🔊 `>join`", value: "El bot se une al canal de voz." },
        { name: "👋 `>leave`", value: "El bot se desconecta del canal de voz." },
        { name: "🔇 `>mutear`", value: "Mutea a miembros con menor jerarquía." },
        { name: "🔊 `>desmutear`", value: "Desmutea a todos los miembros." },
        { name: "❓ `>ayuda` o `>help`", value: "Muestra esta ayuda." }
      )
      .setColor("Blue");
    const enviado = await msg.reply({ embeds: [embed] });
    return limpiar(interaction, enviado);
  }
});

process.on("unhandledRejection", console.error);
client.login(process.env.DISCORD_TOKEN);
