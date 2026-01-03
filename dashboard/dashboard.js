// State
let adminToken = localStorage.getItem('adminToken');
let currentTab = 'events';
let pollInterval = null;
let allTeams = [];
let allSkus = [];

// API base URL
const API_BASE = window.location.origin + '/api';

// Login
function login() {
  const apiKey = document.getElementById('api-key').value;

  if (!apiKey) {
    showError('Please enter an API key');
    return;
  }

  // Validate API key by fetching teams
  fetch(`${API_BASE}/admin/teams`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  })
    .then(res => {
      if (res.ok) {
        return res.json();
      } else {
        throw new Error('Invalid API key');
      }
    })
    .then(data => {
      adminToken = apiKey;
      localStorage.setItem('adminToken', adminToken);
      showDashboard();
    })
    .catch(err => showError(err.message));
}

function logout() {
  localStorage.removeItem('adminToken');
  adminToken = null;
  stopPolling();
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('login-section').style.display = 'block';
}

function showError(message) {
  const errorEl = document.getElementById('login-error');
  errorEl.textContent = message;
  errorEl.style.display = 'block';
}

// Show dashboard
function showDashboard() {
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';

  // Start polling
  startPolling();
}

// Polling
function startPolling() {
  updateAll();
  pollInterval = setInterval(updateAll, 3000); // Poll every 3 seconds
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

function updateAll() {
  updateTime();
  updatePlatformStatus();
  updateInventory();
  updateTeams();
  updateMessages();
  updateAuditLogs();
}

// API helpers
async function apiGet(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });

  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function apiPost(endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || `API error: ${res.status}`);
  }
  return res.json();
}

// Update functions
function updateTime() {
  document.getElementById('current-time').textContent = new Date().toLocaleString();
}

async function updatePlatformStatus() {
  try {
    const data = await apiGet('/admin/mode');
    const modeBadge = document.getElementById('platform-mode');
    modeBadge.textContent = data.mode.charAt(0).toUpperCase() + data.mode.slice(1);
    modeBadge.className = `mode-badge ${data.mode === 'development' ? 'mode-dev' : 'mode-judging'}`;
  } catch (err) {
    console.error('Failed to fetch platform status:', err);
  }
}

async function updateInventory() {
  try {
    const data = await apiGet('/admin/inventory');
    renderInventoryTable(data.inventory);

    // Extract unique SKUs
    const skus = [...new Set(data.inventory.map(i => i.sku))];
    allSkus = skus;

    // Update SKU dropdowns
    const skuOptions = skus.map(s => `<option value="${s}">${s}</option>`).join('');
    document.getElementById('inventory-filter-sku').innerHTML = '<option value="">All SKUs</option>' + skuOptions;
    document.getElementById('restock-sku').innerHTML = skuOptions;
  } catch (err) {
    console.error('Failed to fetch inventory:', err);
  }
}

async function updateTeams() {
  try {
    const data = await apiGet('/admin/teams');
    allTeams = data.teams;

    // Update all team dropdowns
    const teamOptions = data.teams.map(t => `<option value="${t.teamId}">${t.name}</option>`).join('');

    document.getElementById('inventory-filter-team').innerHTML = '<option value="">All Teams</option>' + teamOptions;
    document.getElementById('restock-team').innerHTML = teamOptions;
    document.getElementById('event-team').innerHTML = teamOptions;
    document.getElementById('message-team').innerHTML = '<option value="all">Broadcast to All</option>' + teamOptions;
  } catch (err) {
    console.error('Failed to fetch teams:', err);
  }
}

async function updateMessages() {
  try {
    const data = await apiGet('/admin/messages?limit=20');
    renderMessages(data.messages);
  } catch (err) {
    console.error('Failed to fetch messages:', err);
  }
}

async function updateAuditLogs() {
  try {
    const data = await apiGet(`/admin/audit/${currentTab}?limit=50`);
    renderAuditLogs(data.logs);
  } catch (err) {
    console.error('Failed to fetch audit logs:', err);
  }
}

// Render functions
function renderInventoryTable(inventory) {
  const tbody = document.getElementById('inventory-body');

  // Apply filters
  const teamFilter = document.getElementById('inventory-filter-team').value;
  const skuFilter = document.getElementById('inventory-filter-sku').value;

  const filtered = inventory.filter(item => {
    if (teamFilter && item.teamId !== teamFilter) return false;
    if (skuFilter && item.sku !== skuFilter) return false;
    return true;
  });

  tbody.innerHTML = filtered.map(item => {
    const stockClass = item.available > 10 ? 'stock-green' : item.available > 5 ? 'stock-yellow' : 'stock-red';
    return `
      <tr>
        <td>${item.teamId}</td>
        <td>${item.sku}</td>
        <td>${item.name}</td>
        <td>${item.stock}</td>
        <td>${item.reserved}</td>
        <td class="${stockClass}">${item.available}</td>
      </tr>
    `;
  }).join('');
}

function renderMessages(messages) {
  const container = document.getElementById('recent-messages');

  if (messages.length === 0) {
    container.innerHTML = '<div class="message-entry" style="padding: 10px; text-align: center; color: #999;">No messages yet</div>';
    return;
  }

  container.innerHTML = messages.slice(0, 10).map(msg => `
    <div class="message-entry">
      <div class="message-from">${msg.from} → ${msg.teamId}</div>
      <div class="message-text">${msg.text}</div>
      <div class="message-time">${new Date(msg.createdAt).toLocaleString()}</div>
    </div>
  `).join('');
}

function renderAuditLogs(logs) {
  const container = document.getElementById('audit-content');

  if (logs.length === 0) {
    container.innerHTML = '<div class="log-entry" style="padding: 10px; text-align: center; color: #999;">No logs yet</div>';
    return;
  }

  container.innerHTML = logs.map(log => {
    const time = log.createdAt || new Date().toISOString();
    return `
      <div class="log-entry">
        <strong>${new Date(time).toLocaleString()}</strong> - ${JSON.stringify(log, null, 2)}
      </div>
    `;
  }).join('');
}

// Actions
async function restock() {
  const teamId = document.getElementById('restock-team').value;
  const sku = document.getElementById('restock-sku').value;
  const qty = parseInt(document.getElementById('restock-qty').value);

  try {
    await apiPost('/admin/inventory', {
      teamId,
      sku,
      quantity: qty,
      type: 'restock'
    });

    alert('Restocked successfully!');
    updateInventory();
  } catch (err) {
    alert('Failed to restock: ' + err.message);
  }
}

async function sendEvent() {
  const teamId = document.getElementById('event-team').value;
  const type = document.getElementById('event-type').value;
  const payloadText = document.getElementById('event-payload').value;

  let payload;
  try {
    payload = JSON.parse(payloadText);
  } catch (e) {
    alert('Invalid JSON payload');
    return;
  }

  try {
    await apiPost('/admin/events', { teamId, type, payload });
    alert('Event sent successfully!');
    updateAuditLogs();
  } catch (err) {
    alert('Failed to send event: ' + err.message);
  }
}

async function sendMessage() {
  const teamId = document.getElementById('message-team').value;
  const text = document.getElementById('message-text').value;

  if (!text) {
    alert('Please enter a message');
    return;
  }

  try {
    await apiPost('/admin/messages', { teamId, text });
    alert('Message sent successfully!');
    document.getElementById('message-text').value = '';
    updateMessages();
  } catch (err) {
    alert('Failed to send message: ' + err.message);
  }
}

async function setMode(mode) {
  const confirmMsg = mode === 'judging'
    ? 'This will disable write operations for all teams. Are you sure?'
    : 'This will enable write operations for all teams. Are you sure?';

  if (!confirm(confirmMsg)) {
    return;
  }

  try {
    await apiPost('/admin/mode', { mode });
    alert(`Platform mode changed to ${mode}`);
    updatePlatformStatus();
  } catch (err) {
    alert('Failed to change mode: ' + err.message);
  }
}

function switchTab(tab) {
  currentTab = tab;

  // Update tab buttons
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');

  // Update logs
  updateAuditLogs();
}

// Initialize
if (adminToken) {
  showDashboard();
}

// Add event listeners for filters
document.getElementById('inventory-filter-team').addEventListener('change', updateInventory);
document.getElementById('inventory-filter-sku').addEventListener('change', updateInventory);
