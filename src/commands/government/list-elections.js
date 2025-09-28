const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
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

function formatDuration(ms) {
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function getTimeRemaining(endTime) {
  const remaining = endTime - Date.now();
  if (remaining <= 0) return "Ended";
  return formatDuration(remaining);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("list-elections")
    .setDescription("List all active Chatmandu elections"),

  async execute(interaction) {
    const elections = loadElections();
    const activeElections = Array.from(elections.values()).filter(e => e.active && !e.ended);
    
    if (activeElections.length === 0) {
      const noElectionsEmbed = new EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("📋 No Active Elections")
        .setDescription("There are currently no active elections in Chatmandu.\n\nUse `/create-election` to start a new election!")
        .setFooter({ text: "Chatmandu Nepal" })
        .setThumbnail("https://images-ext-1.discordapp.net/external/f1tn-LE_EvySwmkymL264Izopx06GmnnjOxD0KtxiMM/%3Fsize%3D4096/https/cdn.discordapp.com/icons/1169608414352121886/ae62814f93ca817f4decbbb448018301.png?format=webp&quality=lossless&width=281&height=281");

      await interaction.reply({ embeds: [noElectionsEmbed], ephemeral: true });
      return;
    }

    const electionsEmbed = new EmbedBuilder()
      .setColor("#00FF00")
      .setTitle("🗳️ Active Chatmandu Elections")
      .setDescription("Here are all the currently active elections:")
      .setFooter({ text: "Chatmandu Nepal" })
      .setTimestamp()
      .setThumbnail("https://images-ext-1.discordapp.net/external/f1tn-LE_EvySwmkymL264Izopx06GmnnjOxD0KtxiMM/%3Fsize%3D4096/https/cdn.discordapp.com/icons/1169608414352121886/ae62814f93ca817f4decbbb448018301.png?format=webp&quality=lossless&width=281&height=281");

    activeElections.forEach(election => {
      const totalVotes = election.options.reduce((sum, opt) => sum + opt.votes, 0);
      const timeRemaining = getTimeRemaining(election.endTime);
      const topCandidate = election.options.reduce((prev, current) => 
        (prev.votes > current.votes) ? prev : current
      );

      let candidatesList = election.options
        .sort((a, b) => b.votes - a.votes)
        .slice(0, 3)
        .map((opt, i) => `${i + 1}. ${opt.emoji} ${opt.text} (${opt.votes} votes)`)
        .join('\n');

      if (election.options.length > 3) {
        candidatesList += `\n... and ${election.options.length - 3} more`;
      }

      electionsEmbed.addFields({
        name: `${election.emoji} ${election.title}`,
        value: `**ID:** \`${election.id}\`\n**Status:** ${timeRemaining}\n**Total Votes:** ${totalVotes}\n**Leading:** ${topCandidate.emoji} ${topCandidate.text}\n\n**Top Candidates:**\n${candidatesList}`,
        inline: false
      });
    });

    // Add instruction at the end
    electionsEmbed.addFields({
      name: "📝 How to Vote",
      value: "Use `/vote election_id:[ID]` to cast your vote!\nExample: `/vote election_id:abc123`",
      inline: false
    });

    await interaction.reply({ embeds: [electionsEmbed], ephemeral: true });
  }
};
