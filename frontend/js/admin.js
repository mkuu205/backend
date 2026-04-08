class AdminDashboard {
  constructor() {
    this.token = localStorage.getItem('token');
    this.user = JSON.parse(localStorage.getItem('user') || '{}');
    this.init();
  }

  async init() {
    if (!this.token || this.user.role !== 'admin') {
      window.location.href = '/login';
      return;
    }
    this.setupEventListeners();
    await this.loadDashboard();
    await this.loadMode();
  }

  setupEventListeners() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', () => this.loadDashboard());

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      });
    }

    const saveModeBtn = document.getElementById('saveModeBtn');
    if (saveModeBtn) saveModeBtn.addEventListener('click', () => this.saveMode());
  }

  async loadDashboard() {
    this.showLoading();
    try {
      const response = await fetch('/api/admin-dashboard', {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      const data = await response.json();
      if (data.success) {
        this.renderDashboard(data);
      } else {
        toast.error(data.message || 'Failed to load dashboard');
      }
    } catch (error) {
      toast.error('Failed to load dashboard');
    } finally {
      this.hideLoading();
    }
  }

  async loadMode() {
    const select = document.getElementById('modeSelect');
    if (!select) return;
    const response = await fetch('/api/mode');
    const data = await response.json();
    if (data.mode) select.value = data.mode;
  }

  async saveMode() {
    const select = document.getElementById('modeSelect');
    if (!select) return;

    try {
      const response = await fetch('/api/set-mode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`
        },
        body: JSON.stringify({ mode: select.value })
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Mode updated');
      } else {
        toast.error(data.message || 'Failed to update mode');
      }
    } catch (error) {
      toast.error('Failed to update mode');
    }
  }

  renderDashboard(data) {
    this.renderStats(data.stats);
    this.renderPlayers(data.players);
    this.renderMatches(data.matches);
    this.renderPayments(data.payments);
  }

  renderStats(stats) {
    const statsContainer = document.getElementById('statsContainer');
    if (!statsContainer) return;
    statsContainer.style.display = 'grid';
    statsContainer.innerHTML = `
      <div class="stat-card"><div class="stat-value">${stats.total_players}</div><div class="stat-label">Total Players</div></div>
      <div class="stat-card"><div class="stat-value">${stats.total_matches}</div><div class="stat-label">Total Matches</div></div>
      <div class="stat-card"><div class="stat-value">${stats.completed_payments}</div><div class="stat-label">Completed Payments</div></div>
      <div class="stat-card"><div class="stat-value">${stats.pending_payments}</div><div class="stat-label">Pending Payments</div></div>
    `;
  }

  renderPlayers(players) {
    const container = document.getElementById('playersContainer');
    if (!container) return;
    if (!players?.length) {
      container.innerHTML = '<p class="empty-state">No players registered yet</p>';
      return;
    }
    container.innerHTML = players.map((player) => `
      <div class="player-card">
        <img src="${player.logo_url || 'https://api.dicebear.com/7.x/initials/svg?seed=User'}" alt="${player.username}">
        <div class="player-info">
          <h4>${player.username}</h4>
          <p>${player.email}</p>
          <span class="badge ${player.role}">${player.role}</span>
        </div>
      </div>
    `).join('');
  }

  renderMatches(matches) {
    const container = document.getElementById('matchesContainer');
    if (!container) return;
    if (!matches?.length) {
      container.innerHTML = '<p class="empty-state">No matches scheduled</p>';
      return;
    }
    container.innerHTML = matches.map((match) => `
      <div class="match-card">
        <div class="match-teams"><span>${match.home_team}</span><span class="vs">vs</span><span>${match.away_team}</span></div>
        <div class="match-info"><span>${new Date(match.match_date).toLocaleDateString()}</span><span class="badge ${match.status}">${match.status}</span></div>
      </div>
    `).join('');
  }

  renderPayments(payments) {
    const container = document.getElementById('paymentsContainer');
    if (!container) return;
    if (!payments?.length) {
      container.innerHTML = '<p class="empty-state">No payments recorded</p>';
      return;
    }
    container.innerHTML = payments.map((payment) => `
      <div class="payment-card">
        <div class="payment-info">
          <h4>${payment.username || 'Unknown'}</h4>
          <p>KES ${payment.amount}</p>
        </div>
        <span class="badge ${payment.status}">${payment.status}</span>
      </div>
    `).join('');
  }

  showLoading() {
    const loader = document.getElementById('loadingSpinner');
    if (loader) loader.style.display = 'block';
  }

  hideLoading() {
    const loader = document.getElementById('loadingSpinner');
    if (loader) loader.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new AdminDashboard();
});
