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

function generateElectionId() {
  return Math.random().toString(36).substring(2, 8);
}

function parseDuration(durationStr) {
  if (!durationStr) return 3 * 24 * 60 * 60 * 1000; // Default: 3 days
  
  const match = durationStr.match(/^(\d+)([dhwm])$/i);
  if (!match) return 3 * 24 * 60 * 60 * 1000;
  
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  
  switch (unit) {
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    case 'w': return value * 7 * 24 * 60 * 60 * 1000;
    default: return 3 * 24 * 60 * 60 * 1000;
  }
}

function formatDuration(ms) {
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("create-election")
    .setDescription("Create a new Chatmandu election")
    .addStringOption(option =>
      option.setName('title')
        .setDescription('Election title')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('description')
        .setDescription('Election description')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('options')
        .setDescription('Candidates separated by commas (can use @mentions)')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('duration')
        .setDescription('Election duration (e.g., 3d, 1w, 24h)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('emoji')
        .setDescription('Election emoji')
        .setRequired(false)),

  async execute(interaction) {
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description');
    const durationStr = interaction.options.getString('duration');
    const emoji = interaction.options.getString('emoji') || '🗳️';
    const optionsText = interaction.options.getString('options');

    const optionsList = optionsText.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);
    
    if (optionsList.length < 2) {
      await interaction.reply({ 
        content: '❌ You need at least 2 candidates for an election.', 
        ephemeral: true 
      });
      return;
    }

    // Process candidates (handle @mentions)
    const processedOptions = [];
    for (let i = 0; i < optionsList.length; i++) {
      const optionText = optionsList[i];
      let displayText = optionText;

      const userIdMatch = optionText.match(/<@!?(\d+)>/);
      if (userIdMatch) {
        try {
          const userId = userIdMatch[1];
          const user = await interaction.client.users.fetch(userId);
          displayText = user.displayName || user.username;
        } catch (error) {
          displayText = optionText;
        }
      }
      
      processedOptions.push({
        id: i + 1,
        text: displayText,
        originalText: optionText,
        emoji: null,
        votes: 0
      });
    }

    const electionId = generateElectionId();
    const durationMs = parseDuration(durationStr);
    
    const election = {
      id: electionId,
      title,
      description,
      emoji,
      options: processedOptions,
      duration: durationMs,
      endTime: Date.now() + durationMs,
      createdAt: Date.now(),
      active: true,
      ended: false,
      publicMessageId: null,
      publicChannelId: null,
      creatorId: interaction.user.id,
      guildId: interaction.guild.id
    };

    // Save election
    const elections = loadElections();
    elections.set(electionId, election);
    saveElections(elections);

    // Show duration selection or proceed to emoji selection
    const durationSelectMenu = new StringSelectMenuBuilder()
      .setCustomId(`chatmandu_duration_${electionId}`)
      .setPlaceholder('Choose election duration')
      .addOptions([
        { label: '1 Hour', value: '1h', emoji: '⏰' },
        { label: '6 Hours', value: '6h', emoji: '🕕' },
        { label: '12 Hours', value: '12h', emoji: '🕛' },
        { label: '1 Day', value: '1d', emoji: '📅' },
        { label: '3 Days (Default)', value: '3d', emoji: '🗓️' },
        { label: '1 Week', value: '1w', emoji: '📆' },
        { label: '2 Weeks', value: '2w', emoji: '🗓️' }
      ]);

    const row = new ActionRowBuilder().addComponents(durationSelectMenu);

    const setupEmbed = new EmbedBuilder()
      .setColor("#00FF00")
      .setTitle("⏰ Chatmandu Election Setup")
      .setDescription(`**Election:** ${title}\n**Description:** ${description}\n\nDuration set to: ${formatDuration(durationMs)}\n\nElection ID: \`${electionId}\``)
      .addFields({
        name: "📋 Candidates",
        value: processedOptions.map((opt, i) => `${i + 1}. ${opt.text}`).join('\n'),
        inline: false
      })
      .setFooter({ text: "Chatmandu Nepal" })
      .setThumbnail("https://images-ext-1.discordapp.net/external/f1tn-LE_EvySwmkymL264Izopx06GmnnjOxD0KtxiMM/%3Fsize%3D4096/https/cdn.discordapp.com/icons/1169608414352121886/ae62814f93ca817f4decbbb448018301.png?format=webp&quality=lossless&width=281&height=281");

    await interaction.reply({
      content: `🗳️ **Election Created Successfully!**\nElection ID: \`${electionId}\``,
      embeds: [setupEmbed],
      ephemeral: true
    });

    // Create public voting message immediately (simplified version)
    await this.createPublicVote(interaction, election);
  },

  async createPublicVote(interaction, election) {
    const defaultEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    
    // Set default emojis for candidates
    election.options.forEach((option, index) => {
      option.emoji = defaultEmojis[index] || `${index + 1}️⃣`;
    });

    const voteEmbed = new EmbedBuilder()
      .setColor("#00FF00")
      .setTitle(`🗳️ ${election.title}`)
      .setDescription(`**${election.description}**\n\n**Duration:** ${formatDuration(election.duration)}\n**Election ID:** \`${election.id}\``)
      .setFooter({ text: "Chatmandu Nepal" })
      .setTimestamp()
      .setThumbnail("https://images-ext-1.discordapp.net/external/f1tn-LE_EvySwmkymL264Izopx06GmnnjOxD0KtxiMM/%3Fsize%3D4096/https/cdn.discordapp.com/icons/1169608414352121886/ae62814f93ca817f4decbbb448018301.png?format=webp&quality=lossless&width=281&height=281");

    // Add candidates as fields
    election.options.forEach(option => {
      voteEmbed.addFields({
        name: `${option.emoji} ${option.text}`,
        value: `Votes: ${option.votes}`,
        inline: true
      });
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`chatmandu_vote_${election.id}`)
      .setPlaceholder('Choose your candidate...')
      .addOptions(
        election.options.map(option => ({
          label: option.text,
          value: option.id.toString(),
          emoji: option.emoji
        }))
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const publicMessage = await interaction.followUp({
      content: `🗳️ **CHATMANDU ELECTION** - ${election.title}\n*Vote for your preferred candidate!*`,
      embeds: [voteEmbed],
      components: [row]
    });

    // Update election with public message info
    election.publicMessageId = publicMessage.id;
    election.publicChannelId = interaction.channel.id;
    
    const elections = loadElections();
    elections.set(election.id, election);
    saveElections(elections);
  }
};
