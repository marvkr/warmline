const APP_URL = "http://localhost:3000";
const SYNC_KEY = "warmline:autoSync";

function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function timeAgo(ts) {
  if (!ts) return "";
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

async function load() {
  const result = await chrome.storage.local.get([
    "warmline:queue",
    "warmline:synced",
  ]);

  const queue = Array.isArray(result["warmline:queue"]) ? result["warmline:queue"] : [];
  const synced = Array.isArray(result["warmline:synced"]) ? result["warmline:synced"] : [];

  const allLeads = [...synced, ...queue].sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const totalMutuals = allLeads.reduce((s, l) => s + (l.mutuals?.length || 0), 0);

  document.getElementById("totalLeads").textContent = allLeads.length;
  document.getElementById("totalMutuals").textContent = totalMutuals;
  document.getElementById("totalSynced").textContent = synced.length;

  if (queue.length === 0) {
    document.getElementById("statusText").textContent = "Synced";
    document.getElementById("statusDot").classList.remove("pending");
  } else {
    document.getElementById("statusText").textContent = `${queue.length} pending`;
    document.getElementById("statusDot").classList.add("pending");
  }

  const newest = allLeads[0];
  document.getElementById("lastSync").textContent = newest?.ts
    ? `Last seen ${timeAgo(newest.ts)}`
    : "No activity yet";

  document.getElementById("openApp").href = APP_URL;

  if (allLeads.length === 0) {
    document.getElementById("content").innerHTML = `
      <div class="empty">
        <div class="empty-title">No leads yet</div>
        <div class="empty-body">Visit a LinkedIn profile or tap "Sync" to capture warm paths automatically.</div>
      </div>
    `;
    return;
  }

  document.getElementById("content").innerHTML = `
    <div class="section-label">Recent leads</div>
    <div class="leads" id="leadList"></div>
  `;

  const list = document.getElementById("leadList");
  for (const lead of allLeads.slice(0, 6)) {
    const isPending = queue.some((q) => q.leadSlug === lead.leadSlug);
    const row = document.createElement("a");
    row.className = "lead-row";
    row.href = `https://www.linkedin.com/in/${lead.leadSlug}`;
    row.target = "_blank";
    row.rel = "noopener";
    row.innerHTML = `
      <div class="avatar">${initials(lead.leadName || lead.leadSlug)}</div>
      <div class="lead-info">
        <div class="lead-name">${lead.leadName || lead.leadSlug}</div>
        <div class="lead-meta">${timeAgo(lead.ts)}${isPending ? " · syncing…" : ""}</div>
      </div>
      <div class="mutuals-badge">
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <circle cx="3.5" cy="3.5" r="1.5" stroke="currentColor" stroke-width="1"/>
          <circle cx="7.5" cy="3.5" r="1.5" stroke="currentColor" stroke-width="1"/>
          <path d="M1 9.5C1 8.12 2.12 7 3.5 7H7.5C8.88 7 10 8.12 10 9.5" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
        </svg>
        ${lead.mutuals?.length ?? 0}
      </div>
    `;
    list.appendChild(row);
  }
}

// ── Sync progress polling ────────────────────────────────────────────────────

const syncBtn = document.getElementById("syncBtn");
const syncBtnLabel = document.getElementById("syncBtnLabel");
const syncBarTrack = document.getElementById("syncBarTrack");
const syncBarFill = document.getElementById("syncBarFill");
const syncProgress = document.getElementById("syncProgress");

let pollTimer = null;

async function updateSyncUI() {
  const result = await chrome.storage.local.get(SYNC_KEY);
  const state = result[SYNC_KEY];

  if (!state || state.status === "idle" || state.status === "done" || state.status === "error") {
    syncBtn.disabled = false;
    syncBtn.classList.remove("running");
    syncBtnLabel.textContent = "Sync LinkedIn profiles";
    syncBarTrack.style.display = "none";
    syncProgress.style.display = "none";

    if (state?.status === "done" && state.total > 0) {
      syncProgress.style.display = "block";
      syncProgress.textContent = `Synced ${state.done} of ${state.total} profiles`;
    }
    if (state?.status === "error") {
      syncProgress.style.display = "block";
      syncProgress.textContent = `Error: ${state.message}`;
    }

    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    await load();
    return;
  }

  // Running
  syncBtn.disabled = true;
  syncBtn.classList.add("running");
  const pct = state.total > 0 ? Math.round((state.done / state.total) * 100) : 0;
  syncBtnLabel.textContent = `Visiting ${state.current || "profile"}…`;
  syncBarTrack.style.display = "block";
  syncBarFill.style.width = `${pct}%`;
  syncProgress.style.display = "block";
  syncProgress.textContent = `${state.done} of ${state.total} profiles`;
  await load();
}

syncBtn.addEventListener("click", async () => {
  syncBtn.disabled = true;
  syncBtn.classList.add("running");
  syncBtnLabel.textContent = "Starting…";
  chrome.runtime.sendMessage({ type: "warmline:startSync" });
  // Start polling
  if (!pollTimer) {
    pollTimer = setInterval(updateSyncUI, 1500);
  }
});

// Check if sync is already running when popup opens
updateSyncUI();
if (!pollTimer) {
  chrome.storage.local.get(SYNC_KEY, (r) => {
    if (r[SYNC_KEY]?.status === "running") {
      pollTimer = setInterval(updateSyncUI, 1500);
    }
  });
}
