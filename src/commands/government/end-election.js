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

function saveElections(elections) {
  try {
    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const electionsPath = path.join(dataDir, 'elections.json');
    fs.writeFileSync(electionsPath, JSON.stringify(Object.fromEntries(elections), null, 2));
  } catch (error) {
    console.error('Error saving elections:', error);
  }
}

// Check if user is an admin or election creator
function hasPermission(userId, election) {
  // Add your admin user IDs here or load from environment variables
  const adminIds = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(id => id.trim()) : [];
  return adminIds.includes(userId) || election.creatorId === userId;
}

async function endElection(client, election) {
  election.ended = true;
  election.active = false;
  election.endTime = Date.now();

  // Sort candidates by votes
  const sortedCandidates = election.options
    .sort((a, b) => b.votes - a.votes)
    .filter(candidate => candidate.votes > 0);

  const primeMinister = sortedCandidates[0] || null;
  const candidates = sortedCandidates.slice(1);
  const ministers = candidates.slice(0, 4);

  // Handle ties for the 4th minister position
  if (ministers.length > 0) {
    const cutoffVotes = ministers[ministers.length - 1].votes;
    for (let i = 4; i < candidates.length; i++) {
      if (candidates[i].votes === cutoffVotes) {
        ministers.push(candidates[i]);
      } else {
        break;
      }
    }
  }

  // Create results embed
  const resultsEmbed = new EmbedBuilder()
    .setTitle('🏛️ **CHATMANDU ELECTION RESULTS** 🏛️')
    .setDescription(`**Election:** ${election.title}\n**Total Votes:** ${election.options.reduce((sum, opt) => sum + opt.votes, 0)}`)
    .setColor("#00FF00")
    .setTimestamp()
    .setFooter({ text: "Chatmandu Nepal" })
    .setThumbnail("https://images-ext-1.discordapp.net/external/f1tn-LE_EvySwmkymL264Izopx06GmnnjOxD0KtxiMM/%3Fsize%3D4096/https/cdn.discordapp.com/icons/1169608414352121886/ae62814f93ca817f4decbbb448018301.png?format=webp&quality=lossless&width=281&height=281");

  if (primeMinister) {
    resultsEmbed.addFields({
      name: '👑 **PRIME MINISTER** 👑',
      value: `${primeMinister.emoji} **${primeMinister.text}** - ${primeMinister.votes} votes`,
      inline: false
    });
  }

  if (ministers.length > 0) {
    const ministersText = ministers.map((minister, index) => 
      `${index + 1}. ${minister.emoji} **${minister.text}** - ${minister.votes} votes`
    ).join('\n');
    
    resultsEmbed.addFields({
      name: '🏛️ **MINISTERS** 🏛️',
      value: ministersText,
      inline: false
    });
  }

  // Add complete results
  const allResults = election.options
    .sort((a, b) => b.votes - a.votes)
    .map((candidate, index) => 
      `${index + 1}. ${candidate.emoji} **${candidate.text}** - ${candidate.votes} votes`
    ).join('\n');
  
  resultsEmbed.addFields({
    name: '📊 **COMPLETE RESULTS** 📊',
    value: allResults || 'No votes cast',
    inline: false
  });

  // Post results to the channel where election was created
  try {
    if (election.publicChannelId) {
      const channel = client.channels.cache.get(election.publicChannelId);
      if (channel) {
        await channel.send({ 
          content: '🏛️ **ELECTION CONCLUDED** 🏛️\nThe Chatmandu democratic process has spoken!',
          embeds: [resultsEmbed] 
        });

        // Update the original election message if it exists
        if (election.publicMessageId) {
          try {
            const message = await channel.messages.fetch(election.publicMessageId);
            const endedEmbed = new EmbedBuilder()
              .setTitle(`🗳️ ${election.title}`)
              .setDescription(`**${election.description}**\n\n⏰ **ELECTION ENDED** ⏰\n*Results have been announced above!*`)
              .setColor("#FF0000")
              .setTimestamp()
              .setFooter({ text: "Chatmandu Nepal" })
              .setThumbnail("https://images-ext-1.discordapp.net/external/f1tn-LE_EvySwmkymL264Izopx06GmnnjOxD0KtxiMM/%3Fsize%3D4096/https/cdn.discordapp.com/icons/1169608414352121886/ae62814f93ca817f4decbbb448018301.png?format=webp&quality=lossless&width=281&height=281");
            
            await message.edit({ 
              content: '🗳️ **ELECTION ENDED** 🗳️\n*Voting is now closed. Check results above!*',
              embeds: [endedEmbed],
              components: [] // Remove voting components
            });
          } catch (error) {
            console.error('Error updating election message:', error);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error posting election results:', error);
  }

  return {
    primeMinister,
    ministers,
    totalVotes: election.options.reduce((sum, opt) => sum + opt.votes, 0)
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("end-election")
    .setDescription("End a Chatmandu election early and announce results (Admin/Creator only)")
    .addStringOption(option =>
      option.setName('election_id')
        .setDescription('The ID of the election to end')
        .setRequired(true)),

  async execute(interaction) {
    const electionId = interaction.options.getString('election_id');
    const elections = loadElections();
    const election = elections.get(electionId);
    
    if (!election) {
      await interaction.reply({
        content: '❌ Election not found. Please check the election ID.',
        ephemeral: true
      });
      return;
    }
    
    if (election.ended) {
      await interaction.reply({
        content: '❌ This election has already ended.',
        ephemeral: true
      });
      return;
    }

    // Check permissions
    if (!hasPermission(interaction.user.id, election)) {
      await interaction.reply({
        content: '❌ You do not have permission to end this election. Only admins or the election creator can end elections early.',
        ephemeral: true
      });
      return;
    }
    
    await interaction.reply({ 
      content: '🏁 Ending election and calculating results...', 
      ephemeral: true 
    });
    
    try {
      const results = await endElection(interaction.client, election);
      elections.set(electionId, election);
      saveElections(elections);
      
      // Send confirmation to command user
      await interaction.followUp({ 
        content: `✅ Election ended successfully! Public results have been posted.`, 
        ephemeral: true 
      });

      // Send public summary to the channel
      const publicSummary = new EmbedBuilder()
        .setColor("#00FF00")
        .setTitle("🏛️ Election Ended Early")
        .setDescription(`**${election.title}** has been concluded by an administrator.`)
        .addFields(
          { 
            name: "👑 Prime Minister", 
            value: results.primeMinister ? `${results.primeMinister.emoji} ${results.primeMinister.text} (${results.primeMinister.votes} votes)` : "None", 
            inline: false 
          },
          { 
            name: "🏛️ Ministers", 
            value: results.ministers.length > 0 
              ? results.ministers.map(m => `${m.emoji} ${m.text} (${m.votes} votes)`).join('\n')
              : "None", 
            inline: false 
          },
          { 
            name: "📊 Total Votes", 
            value: results.totalVotes.toString(), 
            inline: true 
          }
        )
        .setFooter({ text: "Chatmandu Nepal" })
        .setTimestamp();

      await interaction.channel.send({ embeds: [publicSummary] });
    } catch (error) {
      console.error('Error ending election:', error);
      await interaction.followUp({ 
        content: '❌ Error ending election. Please try again.', 
        ephemeral: true 
      });
    }
  }
};
