/**
 * PulseGuard AI - Frontend Dashboard Application
 */

const PDF_SAMPLE_PAYLOAD = [
  {
    api_name: "PatientDataAPI",
    response_time_ms: 1200,
    status_code: 200,
    records_returned: 50
  },
  {
    api_name: "AppointmentAPI",
    response_time_ms: 5500,
    status_code: 500,
    records_returned: 0
  }
];

class DashboardApp {
  constructor() {
    this.currentStatusFilter = 'ACTIVE';
    this.currentSeverityFilter = 'ALL';
    this.searchQuery = '';
    this.autoRefreshEnabled = true;
    this.autoRefreshInterval = null;
    this.cachedAlerts = [];

    this.initElements();
    this.bindEvents();
    this.start();
  }

  initElements() {
    // Stats elements
    this.statMonitored = document.getElementById('stat-total-monitored');
    this.statActiveAnomalies = document.getElementById('stat-active-anomalies');
    this.statCriticalCount = document.getElementById('stat-critical-count');
    this.statAnomalyRate = document.getElementById('stat-anomaly-rate');
    this.statAvgLatency = document.getElementById('stat-avg-latency');
    this.aiEngineStatus = document.getElementById('ai-engine-status');
    this.alertsCountPill = document.getElementById('alerts-count-pill');

    // Feeds & containers
    this.alertsContainer = document.getElementById('alerts-container');
    this.statusTabGroup = document.getElementById('status-tab-group');
    this.selectSeverity = document.getElementById('select-severity');
    this.inputSearch = document.getElementById('input-search');
    this.btnToggleRefresh = document.getElementById('btn-toggle-auto-refresh');
    this.autoRefreshText = document.getElementById('auto-refresh-text');

    // Simulation buttons
    this.btnSimPdf = document.getElementById('btn-sim-pdf');
    this.btnSim500 = document.getElementById('btn-sim-500');
    this.btnSimLatency = document.getElementById('btn-sim-latency');
    this.btnSimZero = document.getElementById('btn-sim-zero');
    this.btnSimHealthy = document.getElementById('btn-sim-healthy');
    this.btnSimChaotic = document.getElementById('btn-sim-chaotic');

    // Modals
    this.modalIngest = document.getElementById('modal-ingest');
    this.modalDetails = document.getElementById('modal-details');
    this.textareaPayload = document.getElementById('textarea-payload');
    this.checkboxSendEmail = document.getElementById('checkbox-send-email');
    this.btnOpenIngestModal = document.getElementById('btn-open-ingest-modal');
    this.btnCloseModal = document.getElementById('btn-close-modal');
    this.btnCancelModal = document.getElementById('btn-cancel-modal');
    this.btnSubmitPayload = document.getElementById('btn-submit-payload');
    this.btnFillPdfSample = document.getElementById('btn-fill-pdf-sample');
    this.btnCloseDetails = document.getElementById('btn-close-details');
    this.btnDismissDetails = document.getElementById('btn-dismiss-details');
    this.inputFileUpload = document.getElementById('input-file-upload');
    this.btnClearDb = document.getElementById('btn-clear-db');
    this.toastContainer = document.getElementById('toast-container');
  }

  bindEvents() {
    // Tab filters
    this.statusTabGroup.addEventListener('click', (e) => {
      const tab = e.target.closest('.tab');
      if (!tab) return;
      this.statusTabGroup.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      this.currentStatusFilter = tab.dataset.status;
      this.fetchAlerts();
    });

    // Severity select filter
    this.selectSeverity.addEventListener('change', (e) => {
      this.currentSeverityFilter = e.target.value;
      this.fetchAlerts();
    });

    // Search input debounce
    let searchTimeout;
    this.inputSearch.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.searchQuery = e.target.value.trim();
        this.fetchAlerts();
      }, 300);
    });

    // Auto-refresh toggle
    this.btnToggleRefresh.addEventListener('click', () => {
      this.autoRefreshEnabled = !this.autoRefreshEnabled;
      if (this.autoRefreshEnabled) {
        this.autoRefreshText.textContent = 'Auto-Refresh: ON (5s)';
        this.startAutoRefresh();
        this.showToast('Auto-refresh enabled (5s)', 'info');
      } else {
        this.autoRefreshText.textContent = 'Auto-Refresh: OFF';
        this.stopAutoRefresh();
        this.showToast('Auto-refresh paused', 'info');
      }
    });

    // Ingest Modal handlers
    this.btnOpenIngestModal.addEventListener('click', () => {
      if (!this.textareaPayload.value.trim()) {
        this.textareaPayload.value = JSON.stringify(PDF_SAMPLE_PAYLOAD, null, 2);
      }
      this.modalIngest.classList.add('active');
    });

    this.btnFillPdfSample.addEventListener('click', () => {
      this.textareaPayload.value = JSON.stringify(PDF_SAMPLE_PAYLOAD, null, 2);
    });

    const closeModal = () => this.modalIngest.classList.remove('active');
    this.btnCloseModal.addEventListener('click', closeModal);
    this.btnCancelModal.addEventListener('click', closeModal);

    const closeDetails = () => this.modalDetails.classList.remove('active');
    this.btnCloseDetails.addEventListener('click', closeDetails);
    this.btnDismissDetails.addEventListener('click', closeDetails);

    // Submit Payload via POST /monitor
    this.btnSubmitPayload.addEventListener('click', () => this.handlePayloadSubmit());

    // File Upload Handler
    this.inputFileUpload.addEventListener('change', (e) => this.handleFileUpload(e));

    // Reset Database
    this.btnClearDb.addEventListener('click', () => this.handleClearDb());

    // Scenario Simulator Quick Buttons
    this.btnSimPdf.addEventListener('click', () => this.runSimulation('pdf-sample'));
    this.btnSim500.addEventListener('click', () => this.runSimulation('outage-500'));
    this.btnSimLatency.addEventListener('click', () => this.runSimulation('latency-spike'));
    this.btnSimZero.addEventListener('click', () => this.runSimulation('zero-records'));
    this.btnSimHealthy.addEventListener('click', () => this.runSimulation('healthy-batch'));
    this.btnSimChaotic.addEventListener('click', () => this.runSimulation('chaotic-traffic'));
  }

  start() {
    this.fetchStats();
    this.fetchAlerts();
    this.startAutoRefresh();
  }

  startAutoRefresh() {
    this.stopAutoRefresh();
    this.autoRefreshInterval = setInterval(() => {
      this.fetchStats();
      this.fetchAlerts(true);
    }, 5000);
  }

  stopAutoRefresh() {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
    }
  }

  async fetchStats() {
    try {
      const res = await fetch('/api/stats');
      if (!res.ok) return;
      const data = await res.json();
      const { stats, system } = data;

      this.statMonitored.textContent = (stats.totalMonitored || 0).toLocaleString();
      this.statActiveAnomalies.textContent = stats.activeAnomalies || 0;
      this.statAnomalyRate.textContent = `${stats.anomalyRatePercent || 0}%`;
      this.statAvgLatency.innerHTML = `${stats.avgLatencyMs || 0} <span class="unit">ms</span>`;

      const criticalCount = stats.bySeverity?.CRITICAL || 0;
      this.statCriticalCount.textContent = `${criticalCount} Critical`;

      // System badge
      const provider = system.aiProvider?.toUpperCase() || 'HEURISTIC';
      const hasKey = system.isGeminiConfigured || system.isOpenAiConfigured;
      this.aiEngineStatus.textContent = `AI: ${provider} ${hasKey ? '(Online API)' : '(Reasoning Engine)'}`;
    } catch (err) {
      console.warn('Error fetching stats:', err);
    }
  }

  async fetchAlerts(isSilent = false) {
    try {
      const params = new URLSearchParams();
      if (this.currentStatusFilter) params.append('status', this.currentStatusFilter);
      if (this.currentSeverityFilter && this.currentSeverityFilter !== 'ALL') params.append('severity', this.currentSeverityFilter);
      if (this.searchQuery) params.append('search', this.searchQuery);

      const res = await fetch(`/alerts?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load alerts');

      const data = await res.json();
      this.cachedAlerts = data.alerts || [];
      this.alertsCountPill.textContent = this.cachedAlerts.length;
      this.renderAlerts(this.cachedAlerts);
    } catch (err) {
      if (!isSilent) {
        this.alertsContainer.innerHTML = `
          <div class="empty-state">
            <p>⚠️ Unable to fetch alerts from server: ${err.message}</p>
          </div>
        `;
      }
    }
  }

  renderAlerts(alerts) {
    if (!alerts || alerts.length === 0) {
      this.alertsContainer.innerHTML = `
        <div class="empty-state">
          <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/>
          </svg>
          <h3>All Systems Operating Normally</h3>
          <p>No active anomalies detected matching current criteria.</p>
        </div>
      `;
      return;
    }

    this.alertsContainer.innerHTML = alerts.map((alert) => this.renderAlertCard(alert)).join('');

    // Attach dynamic card actions
    this.alertsContainer.querySelectorAll('.btn-resolve').forEach((btn) => {
      btn.addEventListener('click', () => this.handleResolveAlert(btn.dataset.id));
    });

    this.alertsContainer.querySelectorAll('.btn-view-details').forEach((btn) => {
      btn.addEventListener('click', () => this.handleOpenDetails(btn.dataset.id));
    });

    this.alertsContainer.querySelectorAll('.btn-send-email').forEach((btn) => {
      btn.addEventListener('click', () => this.handleSendTestEmail(btn.dataset.id));
    });
  }

  renderAlertCard(alert) {
    const isResolved = alert.status === 'RESOLVED';
    const statusPillClass = alert.status_code >= 400 ? 'pill-error' : 'pill-success';
    const latencyPillClass = alert.response_time_ms >= 3000 ? 'pill-latency-high' : '';
    const severityLower = (alert.severity || 'high').toLowerCase();

    const formattedTime = new Date(alert.created_at || alert.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const tagsHtml = (alert.anomaly_types || [])
      .map((t) => `<span class="type-tag">${t}</span>`)
      .join('');

    return `
      <div class="alert-card severity-${alert.severity} status-${alert.status}" id="alert-card-${alert.id}">
        <!-- Header -->
        <div class="alert-card-header">
          <div class="alert-identity">
            <span class="severity-chip chip-${severityLower}">${alert.severity}</span>
            <span class="alert-api-name">${alert.api_name}</span>
          </div>

          <div class="alert-meta-pills">
            <span class="meta-pill ${statusPillClass}">HTTP ${alert.status_code}</span>
            <span class="meta-pill ${latencyPillClass}">⚡ ${alert.response_time_ms} ms</span>
            <span class="meta-pill">📋 ${alert.records_returned} records</span>
          </div>

          <div class="alert-timestamp">
            ${formattedTime} ${isResolved ? '• <span style="color:#10b981;font-weight:600;">RESOLVED</span>' : ''}
          </div>
        </div>

        <!-- AI Alert Hero Statement -->
        <div class="ai-alert-box">
          <div class="ai-sparkle-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <span>AI Alert</span>
          </div>
          <div class="ai-summary-text">${alert.ai_alert_summary}</div>
        </div>

        <!-- Diagnostic Breakdown -->
        <div class="alert-diagnostics-grid">
          <div class="diagnostic-card">
            <h4>
              <svg style="width:14px;height:14px;color:#38bdf8;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              Probable Root Cause
            </h4>
            <p>${alert.ai_root_cause || 'Service latency degradation or unhandled exception.'}</p>
          </div>

          <div class="diagnostic-card">
            <h4>
              <svg style="width:14px;height:14px;color:#10b981;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
              Recommended Engineering Actions
            </h4>
            <p>${alert.ai_recommendation || 'Inspect microservice logs and network dependencies.'}</p>
          </div>
        </div>

        <!-- Footer -->
        <div class="alert-card-footer">
          <div class="alert-tags">
            ${tagsHtml}
          </div>

          <div class="card-action-buttons">
            <button class="btn btn-secondary btn-view-details" data-id="${alert.id}" style="padding:6px 12px;font-size:0.8rem;">
              View Payload
            </button>
            <button class="btn btn-ghost btn-send-email" data-id="${alert.id}" title="Send Email Alert Report" style="padding:6px 10px;font-size:0.8rem;">
              📧 Send Email
            </button>
            ${
              isResolved
                ? `<span class="btn-resolved-state">✓ Resolved</span>`
                : `<button class="btn btn-resolve" data-id="${alert.id}">Resolve Alert</button>`
            }
          </div>
        </div>
      </div>
    `;
  }

  async handlePayloadSubmit() {
    const raw = this.textareaPayload.value.trim();
    if (!raw) {
      this.showToast('Please enter JSON payload', 'error');
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      this.showToast('Invalid JSON syntax: ' + e.message, 'error');
      return;
    }

    try {
      const sendEmail = this.checkboxSendEmail.checked;
      const res = await fetch(`/monitor?sendEmail=${sendEmail}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');

      this.showToast(`Processed ${data.summary.totalProcessed} records. ${data.summary.anomaliesDetected} anomaly(ies) detected!`, 'success');
      this.modalIngest.classList.remove('active');
      this.fetchStats();
      this.fetchAlerts();
    } catch (err) {
      this.showToast('Submission failed: ' + err.message, 'error');
    }
  }

  async handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/monitor/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      this.showToast(`File processed! Found ${data.summary.anomaliesDetected} anomaly(ies).`, 'success');
      this.fetchStats();
      this.fetchAlerts();
    } catch (err) {
      this.showToast('Upload error: ' + err.message, 'error');
    } finally {
      event.target.value = '';
    }
  }

  async runSimulation(scenario) {
    try {
      this.showToast(`Running simulation: ${scenario}...`, 'info');
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Simulation failed');

      this.showToast(`Simulation complete: ${data.summary.anomaliesDetected} anomaly(ies) detected.`, 'success');
      this.fetchStats();
      this.fetchAlerts();
    } catch (err) {
      this.showToast('Simulation error: ' + err.message, 'error');
    }
  }

  async handleResolveAlert(id) {
    try {
      const res = await fetch(`/alerts/${id}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: 'Resolved by dashboard operator' }),
      });

      if (!res.ok) throw new Error('Failed to resolve alert');
      this.showToast('Incident marked as RESOLVED', 'success');
      this.fetchStats();
      this.fetchAlerts();
    } catch (err) {
      this.showToast('Resolve error: ' + err.message, 'error');
    }
  }

  async handleSendTestEmail(id) {
    try {
      this.showToast('Sending email report via Nodemailer...', 'info');
      const res = await fetch(`/alerts/${id}/email-test`, {
        method: 'POST',
      });

      const data = await res.json();
      if (data.emailResult?.previewUrl) {
        this.showToast('Email preview URL generated!', 'success');
        window.open(data.emailResult.previewUrl, '_blank');
      } else if (data.emailResult?.sent) {
        this.showToast('Alert email dispatched to recipient!', 'success');
      } else {
        this.showToast('Email alert disabled or no preview available.', 'info');
      }
    } catch (err) {
      this.showToast('Email error: ' + err.message, 'error');
    }
  }

  handleOpenDetails(id) {
    const alert = this.cachedAlerts.find((a) => a.id === id);
    if (!alert) return;

    const modalBody = document.getElementById('details-modal-body');
    const modalTitle = document.getElementById('details-modal-title');
    const modalSubtitle = document.getElementById('details-modal-subtitle');

    modalTitle.textContent = `Anomaly Details: ${alert.api_name}`;
    modalSubtitle.textContent = `Incident ID: ${alert.id} | Created: ${alert.created_at || alert.timestamp}`;

    modalBody.innerHTML = `
      <div>
        <h4 style="font-size:0.85rem;color:#94a3b8;margin-bottom:6px;text-transform:uppercase;">AI Summary</h4>
        <p style="font-size:0.95rem;color:#f8fafc;background:#1e293b;padding:12px;border-radius:6px;">${alert.ai_alert_summary}</p>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="diagnostic-card">
          <h4>Probable Root Cause</h4>
          <p>${alert.ai_root_cause || 'N/A'}</p>
        </div>
        <div class="diagnostic-card">
          <h4>Recommended Actions</h4>
          <p>${alert.ai_recommendation || 'N/A'}</p>
        </div>
      </div>

      <div>
        <h4 style="font-size:0.85rem;color:#94a3b8;margin-bottom:6px;text-transform:uppercase;">Raw JSON Payload (POST /monitor Input)</h4>
        <pre class="pre-box">${JSON.stringify(alert.raw_payload || {}, null, 2)}</pre>
      </div>

      <div>
        <h4 style="font-size:0.85rem;color:#94a3b8;margin-bottom:6px;text-transform:uppercase;">Database Record Metadata</h4>
        <pre class="pre-box">${JSON.stringify(alert, null, 2)}</pre>
      </div>
    `;

    this.modalDetails.classList.add('active');
  }

  async handleClearDb() {
    if (!confirm('Are you sure you want to clear all anomalies and metrics?')) return;
    try {
      const res = await fetch('/api/alerts/clear', { method: 'DELETE' });
      if (res.ok) {
        this.showToast('All alerts and metrics reset.', 'info');
        this.fetchStats();
        this.fetchAlerts();
      }
    } catch (err) {
      this.showToast('Failed to reset: ' + err.message, 'error');
    }
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
      <span>${message}</span>
    `;

    this.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  window.pulseGuardApp = new DashboardApp();
});
