const { Events, EmbedBuilder } = require("discord.js");
const fs = require('fs');
const path = require('path');

// Helper functions
function loadElections() {
  try {
    const electionsPath = path.join(__dirname, '../data/elections.json');
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
    const voteLogPath = path.join(__dirname, '../data/vote_log.json');
    if (fs.existsSync(voteLogPath)) {
      return JSON.parse(fs.readFileSync(voteLogPath, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading vote log:', error);
  }
  return [];
}

function saveElections(elections) {
  try {
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const electionsPath = path.join(dataDir, 'elections.json');
    fs.writeFileSync(electionsPath, JSON.stringify(Object.fromEntries(elections), null, 2));
  } catch (error) {
    console.error('Error saving elections:', error);
  }
}

function saveVoteLog(voteLog) {
  try {
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const voteLogPath = path.join(dataDir, 'vote_log.json');
    fs.writeFileSync(voteLogPath, JSON.stringify(voteLog, null, 2));
  } catch (error) {
    console.error('Error saving vote log:', error);
  }
}

function isAccountOldEnough(user) {
  const accountAge = Date.now() - user.createdTimestamp;
  const sixMonths = 6 * 30 * 24 * 60 * 60 * 1000;
  return accountAge >= sixMonths;
}

function hasUserVoted(userId, electionId, voteLog) {
  return voteLog.some(vote => vote.userId === userId && vote.electionId === electionId);
}

async function updateLiveVoteCounter(client, electionId) {
  try {
    const elections = loadElections();
    const election = elections.get(electionId);

    if (!election || !election.publicMessageId || !election.publicChannelId) {
      return;
    }

    const channel = client.channels.cache.get(election.publicChannelId);
    if (!channel) return;

    const message = await channel.messages.fetch(election.publicMessageId);
    if (!message) return;

    // Create updated embed with vote counts
    const voteEmbed = new EmbedBuilder()
      .setColor("#00FF00")
      .setTitle(`🗳️ ${election.title}`)
      .setDescription(`**${election.description}**\n\n**Live Vote Counter** - Updates in real-time!`)
      .setFooter({ text: "Chatmandu Nepal" })
      .setTimestamp()
      .setThumbnail("https://images-ext-1.discordapp.net/external/f1tn-LE_EvySwmkymL264Izopx06GmnnjOxD0KtxiMM/%3Fsize%3D4096/https/cdn.discordapp.com/icons/1169608414352121886/ae62814f93ca817f4decbbb448018301.png?format=webp&quality=lossless&width=281&height=281");

    // Get voter information for each option
    const voteLog = loadVoteLog();
    const optionVoters = {};

    voteLog.forEach(vote => {
      if (vote.electionId === electionId) {
        if (!optionVoters[vote.optionId]) {
          optionVoters[vote.optionId] = [];
        }
        optionVoters[vote.optionId].push(vote.userId);
      }
    });

    // Add fields for each candidate with voter names
    for (const option of election.options) {
      const voters = optionVoters[option.id] || [];
      let voterNames = [];

      for (const userId of voters) {
        try {
          const user = await client.users.fetch(userId);
          voterNames.push(user.displayName || user.username);
        } catch (error) {
          voterNames.push(`Unknown User`);
        }
      }

      const voterList = voterNames.length > 0 ? `\nVoters: ${voterNames.join(', ')}` : '';

      voteEmbed.addFields({
        name: `${option.emoji} ${option.text}`,
        value: `Votes: ${option.votes}${voterList}`,
        inline: true
      });
    }

    await message.edit({
      content: `🗳️ **CHATMANDU ELECTION** - ${election.title}\n*Live vote counter - Results update automatically!*`,
      embeds: [voteEmbed],
      components: message.components // Keep existing components
    });
  } catch (error) {
    console.error('Error updating live vote counter:', error);
  }
}

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isStringSelectMenu()) return;

    // Handle Chatmandu election voting
    if (interaction.customId.startsWith('chatmandu_vote_')) {
      const electionId = interaction.customId.replace('chatmandu_vote_', '');
      const elections = loadElections();
      let voteLog = loadVoteLog();
      const election = elections.get(electionId);

      if (!election || !election.active || election.ended) {
        await interaction.reply({
          content: '❌ This election is no longer active.',
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
          content: '❌ You have already voted in this election. Each citizen can only vote once!',
          ephemeral: true
        });
        return;
      }

      const selectedOptionId = parseInt(interaction.values[0]);
      const option = election.options.find(opt => opt.id === selectedOptionId);

      if (!option) {
        await interaction.reply({
          content: '❌ Invalid candidate selected.',
          ephemeral: true
        });
        return;
      }

      // Record the vote
      option.votes++;
      elections.set(electionId, election);

      voteLog.push({
        userId: interaction.user.id,
        electionId,
        optionId: selectedOptionId,
        optionText: option.text,
        timestamp: Date.now(),
        guild: interaction.guild.id
      });

      saveElections(elections);
      saveVoteLog(voteLog);

      // Update the live vote counter
      await updateLiveVoteCounter(interaction.client, electionId);

      const user = interaction.user;
      const displayName = user.displayName || user.username;

      await interaction.reply({
        content: `✅ **Vote Cast Successfully!**\n**${displayName}** voted for: **${option.emoji} ${option.text}**\n\nThank you for participating in Chatmandu's democratic process!\n\n*This message will disappear in 10 seconds.*`,
        ephemeral: true
      });

      // Auto-delete the confirmation after 10 seconds
      setTimeout(() => {
        interaction.deleteReply().catch(console.error);
      }, 10000);
    }
  }
};
