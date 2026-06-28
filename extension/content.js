// content.js — runs on https://www.linkedin.com/in/* (a Lead's profile).
//
// Reads the visible "mutual connections" / shared-connections section off the DOM:
//   - the current profile's slug + name  (the Lead)
//   - the mutual connections' names + profile slugs  (the Connectors on the warm path)
// and hands them to the service worker via chrome.runtime.sendMessage.
//
// ⚠️ LinkedIn markup rotates class names constantly. Every selector below is
// best-effort with fallbacks and is flagged "SELECTOR:" — if capture breaks,
// these are the lines to update. We only ever READ the DOM (no clicks / no nav),
// so this is safe to leave running. See README for the pacing / ban caveat.

(function () {
  "use strict";

  var SENT = false; // one successful payload per page load

  // ---- helpers ---------------------------------------------------------------

  // Pull the LinkedIn slug out of any /in/<slug>/ href (handles locale prefixes,
  // query strings, trailing slashes, percent-encoding).
  function slugFromHref(href) {
    if (!href) return null;
    var m = String(href).match(/\/in\/([^/?#]+)/);
    if (!m) return null;
    try {
      return decodeURIComponent(m[1]);
    } catch (e) {
      return m[1];
    }
  }

  function clean(s) {
    return (s || "").replace(/\s+/g, " ").trim();
  }

  // Name for an /in/ anchor: prefer img alt / aria-label, fall back to text.
  function nameForAnchor(a) {
    var img = a.querySelector("img[alt]");
    var name =
      (img && img.getAttribute("alt")) ||
      a.getAttribute("aria-label") ||
      a.textContent;
    name = clean(name);
    // Strip LinkedIn's "View X's profile" / "'s profile" decorations.
    name = name
      .replace(/^view\s+/i, "")
      .replace(/[’']s profile.*$/i, "")
      .replace(/\s*•.*$/, "")
      .trim();
    return name;
  }

  // The current Lead (this profile page).
  function currentProfile() {
    var slug = slugFromHref(location.pathname);
    // SELECTOR: profile name <h1>. Class names churn; fall back to first main h1.
    var h1 =
      document.querySelector("h1.text-heading-xlarge") ||
      document.querySelector("main h1") ||
      document.querySelector("h1");
    return { slug: slug, name: clean(h1 && h1.textContent) };
  }

  // Find the element that anchors the mutual-connections module. The reliable
  // signal is the link into the connections-of search facet; fall back to any
  // element whose text mentions "mutual connection(s)".
  function findMutualAnchor() {
    // SELECTOR: the "N mutual connections" link → /search/results/people/?...facetConnectionOf=
    var byFacet =
      document.querySelector('a[href*="facetConnectionOf"]') ||
      document.querySelector('a[href*="connectionOf"]');
    if (byFacet) return byFacet;

    // SELECTOR: text fallback — any node reading "… mutual connection(s)".
    var nodes = document.querySelectorAll("a, span, p, div");
    for (var i = 0; i < nodes.length; i++) {
      var t = nodes[i].textContent || "";
      if (/mutual connection/i.test(t) && t.length < 200) return nodes[i];
    }
    return null;
  }

  // Climb up from the anchor to the surrounding "card" so we scope the /in/
  // link harvest and don't accidentally grab "People also viewed" etc.
  function cardFor(anchor) {
    var node = anchor;
    for (var i = 0; i < 5 && node && node.parentElement; i++) {
      node = node.parentElement;
      // Stop once the container holds more than the anchor itself.
      if (node.querySelectorAll('a[href*="/in/"]').length > 1) break;
    }
    return node || anchor;
  }

  // Collect {name, slug} for each mutual connection visible in the card.
  // NOTE: on many profile layouts the top card only renders avatars that link to
  // the search facet (no per-person /in/ links), so this can legitimately return
  // few or none — that's expected, and why the demo relies on pre-cached data.
  function collectMutuals() {
    var anchor = findMutualAnchor();
    if (!anchor) return [];
    var card = cardFor(anchor);

    var self = slugFromHref(location.pathname);
    var seen = Object.create(null);
    var out = [];

    var links = card.querySelectorAll('a[href*="/in/"]');
    for (var i = 0; i < links.length; i++) {
      var slug = slugFromHref(links[i].getAttribute("href"));
      if (!slug || slug === self || seen[slug]) continue;
      var name = nameForAnchor(links[i]);
      seen[slug] = true;
      out.push({ name: name, slug: slug });
    }
    return out;
  }

  // ---- send ------------------------------------------------------------------

  function trySend() {
    if (SENT) return;
    var lead = currentProfile();
    if (!lead.slug) return; // not actually a /in/ profile

    var mutuals = collectMutuals();
    if (!mutuals.length) return; // nothing useful yet — let the observer retry

    var payload = {
      leadSlug: lead.slug,
      leadName: lead.name || lead.slug,
      mutuals: mutuals,
    };

    try {
      chrome.runtime.sendMessage(
        { type: "warmline:mutuals", payload: payload },
        function () {
          // Swallow "receiving end does not exist" if the SW is asleep — the
          // background flushes its own queue on wake, so this is non-fatal.
          void chrome.runtime.lastError;
        },
      );
      SENT = true;
      console.debug(
        "[Warmline] sent",
        mutuals.length,
        "mutual(s) for",
        payload.leadSlug,
      );
    } catch (e) {
      // Extension context invalidated (reloaded). Ignore.
    }
  }

  // LinkedIn is a SPA and hydrates late — poll for a bit, and watch the DOM.
  function start() {
    trySend();
    if (SENT) return;

    var attempts = 0;
    var timer = setInterval(function () {
      attempts++;
      trySend();
      if (SENT || attempts >= 20) clearInterval(timer); // ~10s max
    }, 500);

    try {
      var obs = new MutationObserver(function () {
        trySend();
        if (SENT) obs.disconnect();
      });
      obs.observe(document.body, { childList: true, subtree: true });
      setTimeout(function () {
        obs.disconnect();
      }, 15000);
    } catch (e) {
      /* no-op */
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
