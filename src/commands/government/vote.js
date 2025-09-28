const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require("discord.js");
const fs = require('fs');
const path = require('path');

// Helper functions
function loadElections() {
  try {
    const electionsPath = path.join(__dirname, '../../data/elections.json');
    if (fs.existsSync(electionsPath)) {
      const data = JSON.parse(fs.readFileSync(electionsPath, 'utf8'));
      return new Map(Object.entries(data));
    }
  } catch (error) {
    console.error('Error loading elections:', error);
  }
  return new Map();
}

function loadVoteLog() {
  try {
    const voteLogPath = path.join(__dirname, '../../data/vote_log.json');
    if (fs.existsSync(voteLogPath)) {
      return JSON.parse(fs.readFileSync(voteLogPath, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading vote log:', error);
  }
  return [];
}

function isAccountOldEnough(user) {
  const accountAge = Date.now() - user.createdTimestamp;
  const sixMonths = 6 * 30 * 24 * 60 * 60 * 1000;
  return accountAge >= sixMonths;
}

function hasUserVoted(userId, electionId, voteLog) {
  return voteLog.some(vote => vote.userId === userId && vote.electionId === electionId);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("vote")
    .setDescription("Vote in a Chatmandu election")
    .addStringOption(option =>
      option.setName('election_id')
        .setDescription('Election ID to vote in')
        .setRequired(true)),

  async execute(interaction) {
    const electionId = interaction.options.getString('election_id');
    const elections = loadElections();
    const voteLog = loadVoteLog();
    const election = elections.get(electionId);

    if (!election) {
      await interaction.reply({ 
        content: '❌ Election not found. Please check the election ID.', 
        ephemeral: true 
      });
      return;
    }

    if (!election.active || election.ended) {
      await interaction.reply({ 
        content: '❌ This election has ended or is not active.', 
        ephemeral: true 
      });
      return;
    }

    // Check if election has expired
    if (election.endTime && Date.now() >= election.endTime) {
      await interaction.reply({ 
        content: '❌ This election has expired.', 
        ephemeral: true 
      });
      return;
    }

    if (!isAccountOldEnough(interaction.user)) {
      await interaction.reply({ 
        content: '❌ Your account must be at least 6 months old to vote in Chatmandu elections.', 
        ephemeral: true 
      });
      return;
    }

    if (hasUserVoted(interaction.user.id, electionId, voteLog)) {
      await interaction.reply({ 
        content: '❌ You have already voted in this election. Each member can only vote once.', 
        ephemeral: true 
      });
      return;
    }

    // Create voting interface
    const voteEmbed = new EmbedBuilder()
      .setColor("#00FF00")
      .setTitle(`🗳️ ${election.title}`)
      .setDescription(`**${election.description}**\n\n**Your Vote Counts!**\nChoose your preferred candidate below.`)
      .setFooter({ text: "Chatmandu Nepal" })
      .setThumbnail("https://images-ext-1.discordapp.net/external/f1tn-LE_EvySwmkymL264Izopx06GmnnjOxD0KtxiMM/%3Fsize%3D4096/https/cdn.discordapp.com/icons/1169608414352121886/ae62814f93ca817f4decbbb448018301.png?format=webp&quality=lossless&width=281&height=281");

    // Add current vote counts
    election.options.forEach(option => {
      voteEmbed.addFields({
        name: `${option.emoji} ${option.text}`,
        value: `Current votes: ${option.votes}`,
        inline: true
      });
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`chatmandu_vote_${electionId}`)
      .setPlaceholder('Choose your candidate...')
      .addOptions(
        election.options.map(option => ({
          label: option.text,
          value: option.id.toString(),
          emoji: option.emoji || '📋'
        }))
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.reply({
      content: `🗳️ **Vote in: ${election.title}**\n*This is your chance to participate in Chatmandu's democratic process!*`,
      embeds: [voteEmbed],
      components: [row],
      ephemeral: true
    });
  }
};
