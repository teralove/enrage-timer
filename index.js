//vers 2.0
const format = require('./format.js');

module.exports = function EnrageTimer(dispatch) {
	let enraged = false,
	player = null,
	boss = null,
	enragedTimer = null,
	enragedTime = 36,
	nextEnragePercent = 0,
	bossEnrageCount = 1,
	bossTookDamage = false,
	enabled = true,
	sendToParty = false;

	dispatch.hook('S_LOGIN', (event) => { player = event })

	const chatHook = event => {
		let command = format.stripTags(event.message).split(' ');
		
		if ('!et' === command[0].toLowerCase()) {
			toggleModule();
			return false;
		} else if ('!et.party' === command[0].toLowerCase()) {
			togglePartyMessages();
		}
	}
	dispatch.hook('C_CHAT', 1, chatHook)
	dispatch.hook('C_WHISPER', 1, chatHook)
  
	// slash support
	try {
		const Slash = require('slash')
		const slash = new Slash(dispatch)
		slash.on('et', args => toggleModule())
		slash.on('et.party', args => togglePartyMessages())
	} catch (e) {
		// do nothing because slash is optional
	}
	
	function systemMsg(channel, msg) {
		dispatch.toClient('S_CHAT', 1, {
			channel: channel,
			authorID: 0,
			unk1: 0,
			gm: 1,
			unk2: 0,
			authorName: 'ET',
			message: msg
		});
	}
	
	function toggleModule() {
		enabled = !enabled;
		systemMsg(2, enabled ? 'enabled' : 'disabled');
	}
	
	function togglePartyMessages() {
		sendToParty = !sendToParty;
		systemMsg(2, 'Messages are visible to ' + (sendToParty ? 'the party' : 'only you'));
	}
	    
	dispatch.hook('S_BOSS_GAGE_INFO', 2, (event) => {
		boss = event
		// reset data if boss died or resetted
		if (boss.curHp == 0 || (boss.curHp == boss.maxHp && boss.target == 0 && bossTookDamage)) {
			//if (enraged) sendChatMessage('Boss killed, stopping with ' + enragedTime + 's of enrage time left.')
			if (enragedTimer) clearInterval(enragedTimer)
			enragedTime = 36
			boss = null
			enraged = false
			bossEnrageCount = 1
			bossTookDamage = false;
		} else if (boss.curHp < boss.maxHp) {
			bossTookDamage = true;
		}
	})

	dispatch.hook('S_NPC_STATUS', (event) => {
		if (boss && boss.id - event.creature == 0) {
			if (event.enraged == 1 && !enraged) {
				enraged = true
				sendChatMessage('Boss enraged  --  #' + bossEnrageCount);
				bossEnrageCount++
				  
				enragedTimer = setInterval(() => {
					switch (enragedTime) {
					case 20:
						sendChatMessage('20s remaining')
						break
					case 10:
						sendChatMessage('10s remaining')
						break
					case 0:
						nextEnragePercent = Math.floor(boss.curHp / (boss.maxHp * 0.01) - 10)
						if (nextEnragePercent > 0) 
						{
							sendChatMessage('Unenraged, next enrage (#' + bossEnrageCount + ') at ' + nextEnragePercent + '%.')
						}
						clearInterval(enragedTimer)
						enragedTime = 37
						enraged = false
						break
					}
					enragedTime -= 1
				}, 1000)
			}
		}
	})
  
	function sendChatMessage(message) {
		if (enabled === false) return
		
		if (sendToParty) {
			dispatch.toServer('C_CHAT', {
				channel: 21,
				message: message
				})
		} else {
			systemMsg(21, message);
		}
	}
	
}
