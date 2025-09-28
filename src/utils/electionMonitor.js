const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

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

function checkAndEndElections() {
  const now = Date.now();
  const elections = loadElections();
  const endedElections = [];
  
  for (const [electionId, election] of elections) {
    if (election.endTime && now >= election.endTime && !election.ended && election.active) {
      endedElections.push(electionId);
    }
  }
  
  return { endedElections, elections };
}

async function endElection(client, electionId, elections) {
  const election = elections.get(electionId);
  if (!election || election.ended) return null;

  election.ended = true;
  election.active = false;
  election.actualEndTime = Date.now();

  // Sort candidates by votes
  const sortedCandidates = election.options
    .sort((a, b) => b.votes - a.votes)
    .filter(candidate => candidate.votes > 0);

  const primeMinister = sortedCandidates[0] || null;
  const candidatesAfterPm = sortedCandidates.slice(1);
  const ministers = candidatesAfterPm.slice(0, 4);

  // Handle ties for minister positions
  if (ministers.length > 0) {
    const cutoffVotes = ministers[ministers.length - 1].votes;
    for (let i = 4; i < candidatesAfterPm.length; i++) {
      if (candidatesAfterPm[i].votes === cutoffVotes) {
        ministers.push(candidatesAfterPm[i]);
      } else {
        break;
      }
    }
  }

  // Create results embed
  const resultsEmbed = new EmbedBuilder()
    .setTitle('🏛️ **CHATMANDU ELECTION RESULTS** 🏛️')
    .setDescription(`**Election:** ${election.title}\n**Total Votes:** ${election.options.reduce((sum, opt) => sum + opt.votes, 0)}\n**Duration:** Completed`)
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
    value: allResults || 'No votes were cast',
    inline: false
  });

  // Post results and update messages
  try {
    if (election.publicChannelId) {
      const channel = client.channels.cache.get(election.publicChannelId);
      if (channel) {
        // Send results
        await channel.send({ 
          content: '🏛️ **ELECTION TIME COMPLETED** 🏛️\nThe democratic process has concluded!',
          embeds: [resultsEmbed] 
        });

        // Update the original voting message
        if (election.publicMessageId) {
          try {
            const message = await channel.messages.fetch(election.publicMessageId);
            const endedEmbed = new EmbedBuilder()
              .setTitle(`🗳️ ${election.title}`)
              .setDescription(`**${election.description}**\n\n⏰ **ELECTION CONCLUDED** ⏰\n*Time has expired. Final results announced above!*`)
              .setColor("#FF0000")
              .setTimestamp()
              .setFooter({ text: "Chatmandu Nepal" })
              .setThumbnail("https://images-ext-1.discordapp.net/external/f1tn-LE_EvySwmkymL264Izopx06GmnnjOxD0KtxiMM/%3Fsize%3D4096/https/cdn.discordapp.com/icons/1169608414352121886/ae62814f93ca817f4decbbb448018301.png?format=webp&quality=lossless&width=281&height=281");
            
            await message.edit({ 
              content: '🗳️ **ELECTION ENDED** 🗳️\n*Voting period has concluded. Check the results above!*',
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

function startElectionMonitoring(client) {
  console.log('🔧 Starting Chatmandu election monitoring...');
  
  // Check for elections that ended while bot was offline
  const { endedElections, elections } = checkAndEndElections();
  if (endedElections.length > 0) {
    console.log(`📋 Found ${endedElections.length} elections that ended while offline`);
    endedElections.forEach(async (electionId) => {
      try {
        console.log(`🏁 Ending offline election: ${electionId}`);
        await endElection(client, electionId, elections);
        saveElections(elections);
      } catch (error) {
        console.error(`Error ending offline election ${electionId}:`, error);
      }
    });
  }

  // Set up monitoring interval
  const monitoringInterval = setInterval(async () => {
    try {
      const { endedElections, elections } = checkAndEndElections();
      
      if (endedElections.length > 0) {
        console.log(`[${new Date().toISOString()}] 🏁 Ending ${endedElections.length} election(s)...`);
        
        for (const electionId of endedElections) {
          try {
            console.log(`🏁 Auto-ending election: ${electionId}`);
            await endElection(client, electionId, elections);
          } catch (error) {
            console.error(`Error ending election ${electionId}:`, error);
          }
        }
        
        saveElections(elections);
      }
    } catch (error) {
      console.error('Error in election monitoring:', error);
    }
  }, 60000); // Check every minute

  console.log('⏰ Election monitoring started (checking every minute)');
  return monitoringInterval;
}

module.exports = {
  startElectionMonitoring,
  checkAndEndElections,
  endElection
};
