let allFindings = [];
let searchTerm = '';

// Load findings from storage
function loadFindings() {
  browser.runtime.sendMessage({ type: "getFindings" }).then((response) => {
    allFindings = response.findings || [];
    renderFindings();
  }).catch((err) => {
    console.error("[Gecko Panel] Error loading findings:", err);
  });
}

// Render findings to UI
function renderFindings() {
  const container = document.getElementById('findings');
  const filtered = allFindings.filter(f => {
    if (searchTerm === '') return true;
    const search = searchTerm.toLowerCase();
    return (
      f.source.value.toLowerCase().includes(search) ||
      f.source.type.toLowerCase().includes(search) ||
      f.target.url.toLowerCase().includes(search) ||
      f.source.url.toLowerCase().includes(search)
    );
  });

  const countEl = document.getElementById('count');
  countEl.textContent = `${filtered.length} finding${filtered.length !== 1 ? 's' : ''}`;

  if (filtered.length === 0) {
    if (searchTerm === '') {
      container.innerHTML = `
        <div class="empty">
          <div class="empty-icon">🔍</div>
          <div class="empty-text">
            No CSPT findings yet.<br>
            Navigate to a web application to start detecting vulnerabilities.
          </div>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="empty">
          <div class="empty-icon">🔍</div>
          <div class="empty-text">No findings match your search.</div>
        </div>
      `;
    }
    return;
  }

  container.innerHTML = filtered.map((finding, index) => {
    const source = finding.source;
    const target = finding.target;

    return `
      <div class="finding" data-index="${index}">
        <div class="finding-header">
          <span class="finding-icon">🦎</span>
          <span class="finding-type">CSPT Detected</span>
          <span class="source-badge">${escapeHtml(source.type)}</span>
          <span class="source-value">${escapeHtml(source.value)}</span>
        </div>
        <div class="finding-urls">
          <div class="url-row">
            <span class="url-label">Source:</span>
            <span class="url-value">${escapeHtml(source.url)}</span>
          </div>
          <div class="url-row">
            <span class="url-label">Target:</span>
            <span class="url-value">${escapeHtml(target.url)}</span>
          </div>
        </div>
        <div class="finding-details">
          <strong>How to verify:</strong><br>
          1. The source value "<code>${escapeHtml(source.value)}</code>" from the page URL appears in a network request<br>
          2. This could indicate that modifying this value allows path traversal<br>
          3. Try payloads like: <code>../</code>, <code>../../</code>, <code>%2e%2e%2f</code>
        </div>
      </div>
    `;
  }).join('');

  // Add click handlers to expand/collapse
  document.querySelectorAll('.finding').forEach((el) => {
    el.addEventListener('click', () => {
      el.classList.toggle('expanded');
    });
  });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Event listeners
document.getElementById('refreshBtn').addEventListener('click', () => {
  loadFindings();
});

document.getElementById('clearBtn').addEventListener('click', () => {
  if (confirm('Clear all findings?')) {
    browser.runtime.sendMessage({ type: "clearFindings" }).then(() => {
      loadFindings();
    });
  }
});

document.getElementById('search').addEventListener('input', (e) => {
  searchTerm = e.target.value;
  renderFindings();
});

// Listen for new findings
browser.runtime.onMessage.addListener((message) => {
  if (message.type === "newFinding") {
    loadFindings();
  }
});

// Initial load
loadFindings();
console.log('[Gecko Panel] Loaded');