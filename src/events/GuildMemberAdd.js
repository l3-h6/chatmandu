const { Events, EmbedBuilder } = require("discord.js");
require("dotenv").config();
const channelID = process.env.channelId;

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    console.log(member);
    const embed = new EmbedBuilder()
      .setColor("#ffffff")
      .setTitle("Welcome to the server!")
      .setAuthor({
        name: "Chatmandu",
        iconURL:
          "https://media.discordapp.net/attachments/1170728124783280160/1176127911842029618/CHatmandu-removebg-preview.png?format=webp&quality=lossless&width=550&height=550",
      })
      .setDescription(`${member}, तपाईलाई स्वागत छ`)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setImage(
        "https://images-ext-1.discordapp.net/external/VY8iSTQpLPeD0ZbqNGu0RopDf0T2s8OLbm0IlzigXfo/https/images-ext-2.discordapp.net/external/u95rX_l8_ZNyG79B1krf3llQx-qGfFdEEzkaHuQ0Ehc/https/media.tenor.com/SpXWQo0Mq7EAAAAd/welcome-michael-scott.gif?width=704&height=585",
      )
      .setFooter({
        text: "discord.gg/chatmandu",
        iconURL:
          "https://media.discordapp.net/attachments/1170728124783280160/1176127911842029618/CHatmandu-removebg-preview.png?format=webp&quality=lossless&width=550&height=550",
      });

    const channel = member.guild.channels.cache.get(channelID);

    if (channel) {
      channel.send(`Hello ${member} welcome to Chatmandu`);
      channel.send({ embeds: [embed] });
    }
  },
};
