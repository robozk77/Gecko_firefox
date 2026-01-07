// Gecko CSPT Detector - Background Script
// Ported from vitorfhc/gecko TypeScript source

// SourceType enum
const SourceType = {
  QueryValue: "Query Parameter",
  QueryValueEncoded: "Query Parameter (URL encoded)",
  QueryValueDecoded: "Query Parameter (URL decoded)",
  PathValue: "Path",
  PathValueEncoded: "Path (URL encoded)",
  PathValueDecoded: "Path (URL decoded)",
  UndefinedValue: "Undefined Variable",
  NullValue: "Null Variable"
};

// Default settings
const defaultSettings = {
  scanners: {
    searchQueryValues: true,
    searchPath: true,
    searchNullUndefined: true
  },
  matching: {
    partial: false,
    caseInsensitive: true,
    partialMinLength: 3
  },
  display: {
    clearOnRefresh: false
  }
};

let currentTab = null;
let storageLock = Promise.resolve();
const currentSettings = JSON.parse(JSON.stringify(defaultSettings));

// Load settings from storage
browser.storage.local.get("settings").then((items) => {
  if (!items.settings) {
    browser.storage.local.set({ settings: defaultSettings });
  } else {
    Object.assign(currentSettings, items.settings);
  }
});

// Listen for settings changes
browser.storage.local.onChanged.addListener((changes) => {
  if (changes.findings && changes.findings.newValue) {
    const newLength = changes.findings.newValue.length;

    if (newLength === 0) {
      storageLock = storageLock.then(async () => {
        await browser.storage.local.set({ findingsCache: {} });
      });
    }

    if (newLength) {
      browser.browserAction.setBadgeText({ text: `${newLength}` });
      browser.browserAction.setBadgeBackgroundColor({ color: "#cc3300" });
    } else {
      browser.browserAction.setBadgeText({ text: "" });
    }
  }

  if (changes.settings) {
    Object.assign(currentSettings, changes.settings.newValue);
  }
});

// Generate cache key for deduplication
function generateCacheKey(finding) {
  const { source, target } = finding;
  return `${source.url}-${source.value}-${target.url}`;
}

// Store finding with mutex
function storeFinding(finding) {
  storageLock = storageLock.then(async () => {
    const items = await browser.storage.local.get(["findings", "findingsCache"]);

    const cache = items.findingsCache || {};
    const cacheKey = generateCacheKey(finding);
    if (cache[cacheKey]) {
      return;
    }
    cache[cacheKey] = true;

    const findings = Array.isArray(items.findings) ? items.findings : [];
    findings.push(finding);
    await browser.storage.local.set({ findings, findingsCache: cache });

    // Notify devtools panel
    browser.runtime.sendMessage({
      type: "newFinding",
      finding: finding
    }).catch(() => {}); // Ignore if panel not open
  });
}

// Update current tab
function updateCurrentTab() {
  browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    if (tabs.length > 0) {
      currentTab = tabs[0];
    }
  });
}

browser.tabs.onActivated.addListener(updateCurrentTab);
browser.tabs.onUpdated.addListener(updateCurrentTab);

// Clear findings on refresh if enabled
browser.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId === 0 && currentSettings.display.clearOnRefresh) {
    browser.storage.local.set({ findings: [] });
  }
});

updateCurrentTab();

// Main CSPT detection logic
browser.webRequest.onBeforeRequest.addListener(
  (details) => {
    // Skip if no initiator (first-party requests)
    if (!details.originUrl && !details.documentUrl) {
      return;
    }

    if (currentTab && currentTab.url) {
      // Don't check the tab's own URL
      if (details.url === currentTab.url) {
        return;
      }

      // Extract sources from current tab URL
      const sources = urlToSources(currentTab.url);

      // Generate findings by comparing sources to request URL
      const findings = generateFindings(details.url, sources);

      // Store each finding
      findings.forEach((finding) => storeFinding(finding));
    }
  },
  { urls: ["<all_urls>"] }
);

// Extract sources from URL (query params, path parts, null/undefined)
function urlToSources(url) {
  const sources = [];
  const u = new URL(url);

  // Extract query parameter values
  if (currentSettings.scanners.searchQueryValues) {
    const query = u.searchParams;
    query.forEach((v) => {
      sources.push({
        type: SourceType.QueryValue,
        url: url,
        value: v
      });

      // Add decoded version
      const decoded = decodeURIComponent(v);
      if (decoded !== v) {
        sources.push({
          type: SourceType.QueryValueDecoded,
          url: url,
          value: decoded
        });
      }

      // Add encoded version
      const encoded = encodeURIComponent(v);
      if (encoded !== v) {
        sources.push({
          type: SourceType.QueryValueEncoded,
          url: url,
          value: encoded
        });
      }
    });
  }

  // Extract path parts
  if (currentSettings.scanners.searchPath) {
    const pathParts = u.pathname.split("/");
    pathParts.forEach((part) => {
      sources.push({
        type: SourceType.PathValue,
        url: url,
        value: part
      });

      // Add decoded version
      const decoded = decodeURIComponent(part);
      if (decoded !== part) {
        sources.push({
          type: SourceType.PathValueDecoded,
          url: url,
          value: decoded
        });
      }

      // Add encoded version
      const encoded = encodeURIComponent(part);
      if (encoded !== part) {
        sources.push({
          type: SourceType.PathValueEncoded,
          url: url,
          value: encoded
        });
      }
    });
  }

  // Add null and undefined as sources
  if (currentSettings.scanners.searchNullUndefined) {
    sources.push({
      type: SourceType.UndefinedValue,
      url: url,
      value: "undefined"
    });

    sources.push({
      type: SourceType.NullValue,
      url: url,
      value: "null"
    });
  }

  // Filter out empty values
  return sources.filter((source) => source.value.length > 0);
}

// Generate findings by comparing sources to target URL
function generateFindings(url, sources) {
  const findings = [];

  const u = new URL(url);
  const pathParts = u.pathname.split("/");

  // Ignore ad networks
  const ignoredTargetOrigins = [
    /adservice\.google\.com/,
    /ad\.doubleclick\.net/
  ];

  const isIgnored = ignoredTargetOrigins.some((origin) => origin.test(u.hostname));
  if (isIgnored) {
    return findings;
  }

  // Compare each source value against each path part
  sources.forEach((source) => {
    pathParts.forEach((part) => {
      let mPart = part;
      let mSourceValue = source.value;

      // Case insensitive matching
      if (currentSettings.matching.caseInsensitive) {
        mPart = part.toLowerCase();
        mSourceValue = source.value.toLowerCase();
      }

      // Determine if we should use partial matching
      let usePartialMatch = currentSettings.matching.partial;
      if (!usePartialMatch || mSourceValue.length < currentSettings.matching.partialMinLength) {
        usePartialMatch = false;
      }

      // Check for match (exact or partial)
      const match = usePartialMatch
        ? mPart.includes(mSourceValue)
        : mPart === mSourceValue;

      if (mPart.length !== 0 && match) {
        findings.push({
          source,
          target: { url }
        });
      }
    });
  });

  return findings;
}

// Message handler
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "getFindings") {
    browser.storage.local.get("findings").then((items) => {
      sendResponse({ findings: items.findings || [] });
    });
    return true;
  }

  if (message.type === "clearFindings") {
    browser.storage.local.set({ findings: [], findingsCache: {} }).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === "getSettings") {
    sendResponse({ settings: currentSettings });
    return true;
  }

  if (message.type === "updateSettings") {
    Object.assign(currentSettings, message.settings);
    browser.storage.local.set({ settings: currentSettings }).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
});

console.log("[Gecko] Background script loaded - Real implementation");