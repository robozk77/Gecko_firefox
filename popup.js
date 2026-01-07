// Load settings
browser.runtime.sendMessage({ type: "getSettings" }).then((response) => {
  const settings = response.settings;

  // Scanners
  document.getElementById('searchQueryValues').checked = settings.scanners.searchQueryValues;
  document.getElementById('searchPath').checked = settings.scanners.searchPath;
  document.getElementById('searchNullUndefined').checked = settings.scanners.searchNullUndefined;

  // Matching
  document.getElementById('partial').checked = settings.matching.partial;
  document.getElementById('caseInsensitive').checked = settings.matching.caseInsensitive;
  document.getElementById('partialMinLength').value = settings.matching.partialMinLength;

  // Display
  document.getElementById('clearOnRefresh').checked = settings.display.clearOnRefresh;
});

// Save settings on change
function saveSettings() {
  const settings = {
    scanners: {
      searchQueryValues: document.getElementById('searchQueryValues').checked,
      searchPath: document.getElementById('searchPath').checked,
      searchNullUndefined: document.getElementById('searchNullUndefined').checked
    },
    matching: {
      partial: document.getElementById('partial').checked,
      caseInsensitive: document.getElementById('caseInsensitive').checked,
      partialMinLength: parseInt(document.getElementById('partialMinLength').value)
    },
    display: {
      clearOnRefresh: document.getElementById('clearOnRefresh').checked
    }
  };

  browser.runtime.sendMessage({
    type: "updateSettings",
    settings: settings
  });
}

// Add listeners to all inputs
document.querySelectorAll('input').forEach((input) => {
  input.addEventListener('change', saveSettings);
});