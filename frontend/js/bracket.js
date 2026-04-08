// Tournament Bracket Renderer

class TournamentBracket {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.options = {};
  }

  render(matches, options = {}) {
    this.options = options;
    
    if (!matches || matches.length === 0) {
      this.container.innerHTML = '<p class="empty-state">No matches available</p>';
      return;
    }

    // Group matches by round
    const rounds = this.groupByRound(matches);
    
    // Create bracket container
    const bracketContainer = document.createElement('div');
    bracketContainer.className = 'bracket-container';

    // Render each round
    rounds.forEach((roundMatches, roundIndex) => {
      const roundDiv = document.createElement('div');
      roundDiv.className = 'bracket-round';
      
      const roundName = this.getRoundName(roundIndex + 1, rounds.length);
      roundDiv.innerHTML = `<h3>${roundName}</h3>`;

      roundMatches.forEach(match => {
        roundDiv.appendChild(this.createMatchCard(match));
      });

      bracketContainer.appendChild(roundDiv);
    });

    this.container.innerHTML = '';
    this.container.appendChild(bracketContainer);
  }

  groupByRound(matches) {
    const rounds = {};
    
    matches.forEach(match => {
      if (!rounds[match.round]) {
        rounds[match.round] = [];
      }
      rounds[match.round].push(match);
    });

    return Object.values(rounds);
  }

  getRoundName(round, totalRounds) {
    if (round === totalRounds) return 'Final';
    if (round === totalRounds - 1) return 'Semifinals';
    if (round === totalRounds - 2) return 'Quarterfinals';
    return `Round ${round}`;
  }

  createMatchCard(match) {
    const matchDiv = document.createElement('div');
    matchDiv.className = `bracket-match ${match.status}`;

    const isCompleted = match.status === 'completed';
    const player1IsWinner = isCompleted && match.winner_id === match.player1_id;
    const player2IsWinner = isCompleted && match.winner_id === match.player2_id;

    const player1Slot = this.createPlayerSlot(
      match.player1_username,
      match.player1_logo,
      match.player1_score,
      player1IsWinner,
      !match.player1_id
    );

    const player2Slot = this.createPlayerSlot(
      match.player2_username,
      match.player2_logo,
      match.player2_score,
      player2IsWinner,
      !match.player2_id
    );

    const vsDivider = document.createElement('div');
    vsDivider.className = 'vs-divider';
    vsDivider.textContent = isCompleted ? 'FINAL' : 'VS';

    matchDiv.appendChild(player1Slot);
    matchDiv.appendChild(vsDivider);
    matchDiv.appendChild(player2Slot);

    // Add admin controls if pending and admin mode
    if (!isCompleted && this.options.isAdmin && match.player1_id && match.player2_id) {
      matchDiv.appendChild(this.createAdminControls(match));
    }

    return matchDiv;
  }

  createPlayerSlot(username, logoUrl, score, isWinner, isTBD) {
    const slot = document.createElement('div');
    slot.className = `player-slot ${isWinner ? 'winner' : ''} ${isTBD ? 'tbd' : ''}`;

    if (isTBD) {
      slot.innerHTML = '<span class="player-name">TBD</span>';
      return slot;
    }

    const playerInfo = document.createElement('div');
    playerInfo.className = 'player-info';

    const logo = document.createElement('img');
    logo.className = 'player-logo';
    logo.src = logoUrl || 'https://api.dicebear.com/7.x/initials/svg?seed=User';
    logo.alt = username;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'player-name';
    nameSpan.textContent = username;

    if (isWinner) {
      const badge = document.createElement('span');
      badge.className = 'winner-badge';
      badge.textContent = 'WINNER';
      nameSpan.appendChild(badge);
    }

    playerInfo.appendChild(logo);
    playerInfo.appendChild(nameSpan);

    slot.appendChild(playerInfo);

    if (score !== null && score !== undefined) {
      const scoreSpan = document.createElement('span');
      scoreSpan.className = 'player-score';
      scoreSpan.textContent = score;
      slot.appendChild(scoreSpan);
    }

    return slot;
  }

  createAdminControls(match) {
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'admin-controls';

    const label = document.createElement('div');
    label.className = 'admin-label';
    label.textContent = 'Select Winner:';
    controlsDiv.appendChild(label);

    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'admin-buttons';

    // Player 1 win button
    const btn1 = document.createElement('button');
    btn1.className = 'btn-win';
    btn1.textContent = match.player1_username;
    btn1.onclick = () => this.submitResult(match.id, match.player1_id, match.player2_id);
    buttonsContainer.appendChild(btn1);

    // Player 2 win button
    const btn2 = document.createElement('button');
    btn2.className = 'btn-win';
    btn2.textContent = match.player2_username;
    btn2.onclick = () => this.submitResult(match.id, match.player2_id, match.player1_id);
    buttonsContainer.appendChild(btn2);

    controlsDiv.appendChild(buttonsContainer);

    return controlsDiv;
  }

  async submitResult(matchId, winnerId, loserId) {
    if (!this.options.token) {
      alert('Authentication required');
      return;
    }

    if (!confirm('Confirm this result?')) {
      return;
    }

    try {
      // Get tournament ID from URL or options
      const tournamentId = this.options.tournamentId || window.currentTournamentId;
      
      const response = await fetch(`/api/tournament/${tournamentId}/match/${matchId}/result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.options.token}`
        },
        body: JSON.stringify({
          winner_id: winnerId,
          player1_score: winnerId === this.options.player1Id ? 1 : 0,
          player2_score: winnerId === this.options.player2Id ? 1 : 0
        })
      });

      const data = await response.json();

      if (data.success) {
        if (this.options.onResultSubmit) {
          this.options.onResultSubmit();
        }
      } else {
        alert(data.message || 'Failed to submit result');
      }
    } catch (error) {
      console.error('Submit result error:', error);
      alert('Failed to submit result');
    }
  }
}
