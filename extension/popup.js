const APP_URL = "https://warmline.vercel.app"; // update if different

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

  const queue = Array.isArray(result["warmline:queue"])
    ? result["warmline:queue"]
    : [];
  const synced = Array.isArray(result["warmline:synced"])
    ? result["warmline:synced"]
    : [];

  const allLeads = [...synced, ...queue].sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const totalMutuals = allLeads.reduce((s, l) => s + (l.mutuals?.length || 0), 0);

  document.getElementById("totalLeads").textContent = allLeads.length;
  document.getElementById("totalMutuals").textContent = totalMutuals;
  document.getElementById("totalSynced").textContent = synced.length;

  if (queue.length === 0) {
    document.getElementById("statusText").textContent = "Synced";
  } else {
    document.getElementById("statusText").textContent = `${queue.length} pending`;
    document.getElementById("statusDot").style.background = "oklch(0.85 0.1 85)";
    document.getElementById("statusDot").style.boxShadow = "0 0 6px oklch(0.85 0.1 85)";
  }

  const newest = allLeads[0];
  document.getElementById("lastSync").textContent = newest?.ts
    ? `Last seen ${timeAgo(newest.ts)}`
    : "No activity yet";

  document.getElementById("openApp").href = APP_URL;

  if (allLeads.length === 0) return;

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="section-label">Recent leads</div>
    <div class="leads" id="leadList"></div>
  `;

  const list = document.getElementById("leadList");
  const top = allLeads.slice(0, 6);

  for (const lead of top) {
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
        <div class="lead-slug">${timeAgo(lead.ts)}${isPending ? " · syncing…" : ""}</div>
      </div>
      <div class="mutuals-badge">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <circle cx="3" cy="3.5" r="1.5" stroke="currentColor" stroke-width="1"/>
          <circle cx="7" cy="3.5" r="1.5" stroke="currentColor" stroke-width="1"/>
          <path d="M1 8.5C1 7.12 1.9 6 3 6H7C8.1 6 9 7.12 9 8.5" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
        </svg>
        ${lead.mutuals?.length ?? 0}
      </div>
    `;
    list.appendChild(row);
  }
}

load();
