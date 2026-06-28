// background.js — MV3 service worker.
//
// Receives mutual-connection payloads from content.js, queues them in
// chrome.storage.local, and POSTs each to the Warmline Convex HTTP endpoint:
//
//   POST <CONVEX_HTTP_URL>/extension/mutuals
//   body: { leadSlug, leadName?, mutuals: [{ name, slug }] }
//   200  => { edges: <number> }   (server is idempotent — dedups edges)
//
// Offline / 5xx → the item stays queued and a chrome.alarm retries it.
// On 200 (or a non-retryable 4xx) the item is cleared from the queue.

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURE: your Convex deployment's HTTP URL. Convex serves httpRouter routes
// from the *.convex.site domain (NOT *.convex.cloud). Either edit this constant
// or set it once from the SW console:
//   chrome.storage.local.set({ "warmline:convexHttpUrl": "https://<id>.convex.site" })
const DEFAULT_CONVEX_HTTP_URL = "https://fantastic-gazelle-504.convex.site";

const QUEUE_KEY = "warmline:queue";
const SYNCED_KEY = "warmline:synced";
const URL_KEY = "warmline:convexHttpUrl";
const RETRY_ALARM = "warmline:flush";
const RETRY_PERIOD_MIN = 1; // retry queued items ~every minute while non-empty

// ---- storage helpers --------------------------------------------------------

function getLocal(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (obj) => resolve(obj ? obj[key] : undefined));
  });
}

function setLocal(key, value) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, () => resolve());
  });
}

async function getConvexUrl() {
  const stored = await getLocal(URL_KEY);
  const url = (stored || DEFAULT_CONVEX_HTTP_URL || "").trim().replace(/\/+$/, "");
  if (!url || /YOUR-DEPLOYMENT/.test(url)) return null; // not configured yet
  return url;
}

async function getQueue() {
  const q = await getLocal(QUEUE_KEY);
  return Array.isArray(q) ? q : [];
}

function setQueue(q) {
  return setLocal(QUEUE_KEY, q);
}

// ---- queue ------------------------------------------------------------------

// Dedup mutuals by slug while merging two lists.
function mergeMutuals(a, b) {
  const seen = Object.create(null);
  const out = [];
  for (const list of [a || [], b || []]) {
    for (const m of list) {
      if (!m || !m.slug || seen[m.slug]) continue;
      seen[m.slug] = true;
      out.push({ name: m.name || m.slug, slug: m.slug });
    }
  }
  return out;
}

// One queue item per leadSlug; repeated visits merge their mutuals.
async function enqueue(payload) {
  const queue = await getQueue();
  const idx = queue.findIndex((it) => it.leadSlug === payload.leadSlug);
  if (idx >= 0) {
    queue[idx] = {
      leadSlug: payload.leadSlug,
      leadName: payload.leadName || queue[idx].leadName,
      mutuals: mergeMutuals(queue[idx].mutuals, payload.mutuals),
      ts: Date.now(),
    };
  } else {
    queue.push({
      leadSlug: payload.leadSlug,
      leadName: payload.leadName,
      mutuals: mergeMutuals([], payload.mutuals),
      ts: Date.now(),
    });
  }
  await setQueue(queue);
}

// ---- flush / retry ----------------------------------------------------------

async function ensureAlarm() {
  const existing = await chrome.alarms.get(RETRY_ALARM);
  if (!existing) {
    chrome.alarms.create(RETRY_ALARM, { periodInMinutes: RETRY_PERIOD_MIN });
  }
}

async function clearAlarm() {
  await chrome.alarms.clear(RETRY_ALARM);
}

let flushing = false;

async function flushQueue() {
  if (flushing) return;
  flushing = true;
  try {
    const url = await getConvexUrl();
    if (!url) {
      // Not configured — keep items but stop hammering an unknown endpoint.
      const q = await getQueue();
      if (q.length) await ensureAlarm();
      return;
    }

    let queue = await getQueue();
    if (!queue.length) {
      await clearAlarm();
      return;
    }

    const remaining = [];
    for (const item of queue) {
      if (!item.leadSlug) continue; // malformed → drop
      try {
        const res = await fetch(`${url}/extension/mutuals`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadSlug: item.leadSlug,
            leadName: item.leadName,
            mutuals: item.mutuals || [],
          }),
        });
        if (res.ok) {
          // 200 → done; server already dedups, so this is safe to retry too.
          const data = await res.json().catch(() => ({}));
          console.debug(
            "[Warmline] ingested",
            item.leadSlug,
            "→",
            data && data.edges,
            "edge(s)",
          );
          // Track synced items for popup display (keep last 50).
          const synced = await getLocal(SYNCED_KEY);
          const syncedList = Array.isArray(synced) ? synced : [];
          const existing = syncedList.findIndex((s) => s.leadSlug === item.leadSlug);
          if (existing >= 0) syncedList.splice(existing, 1);
          syncedList.unshift({ ...item, syncedAt: Date.now() });
          await setLocal(SYNCED_KEY, syncedList.slice(0, 50));
          continue; // drop from queue
        }
        if (res.status >= 400 && res.status < 500) {
          // Non-retryable (e.g. 400 bad payload) — drop so we don't loop forever.
          console.warn("[Warmline] dropping", item.leadSlug, "→", res.status);
          continue;
        }
        remaining.push(item); // 5xx → retry later
      } catch (e) {
        remaining.push(item); // offline / network error → retry later
      }
    }

    await setQueue(remaining);
    if (remaining.length) await ensureAlarm();
    else await clearAlarm();
  } finally {
    flushing = false;
  }
}

// ---- wiring -----------------------------------------------------------------

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "warmline:mutuals" && msg.payload && msg.payload.leadSlug) {
    enqueue(msg.payload)
      .then(() => flushQueue())
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true; // keep the message channel open for the async response
  }
  return false;
});

chrome.runtime.onInstalled.addListener(() => flushQueue());
chrome.runtime.onStartup.addListener(() => flushQueue());
chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === RETRY_ALARM) flushQueue();
});
