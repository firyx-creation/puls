// ═══════════════════════════════════════════════════════════════
//  PULS. — APP.JS — Logique principale (Supabase + ntfy.sh)
//  100% gratuit, aucune carte bancaire
// ═══════════════════════════════════════════════════════════════

// ── Init Supabase ──
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── État global ──
let STATE = {
  pseudo:        localStorage.getItem("puls_pseudo") || null,
  prefs:         JSON.parse(localStorage.getItem("puls_prefs") || "[]"),
  isAdmin:       false,
  unsubFeed:     null,
  timers:        {},
  seenPosts:     new Set(JSON.parse(localStorage.getItem("puls_seen") || "[]")),
  selectedTheme: "live",
  selectedImage: null,
  timerType:     "none",
  schedType:     "now",
};

// ── Router ──
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById("screen-" + id).classList.add("active");
}

// ══════════════════════════════════════
//  SETUP
// ══════════════════════════════════════
function initSetup() {
  if (STATE.pseudo) { startApp(); return; }

  document.querySelectorAll("#prefs-grid .pref-chip").forEach(chip => {
    if (STATE.prefs.includes(chip.dataset.theme)) chip.classList.add("sel");
    chip.addEventListener("click", () => chip.classList.toggle("sel"));
  });

  document.getElementById("btn-start").addEventListener("click", async () => {
  const pseudo = document.getElementById("inp-pseudo").value.trim();
  if (!pseudo) { alert("Choisis un pseudo !"); return; }
  
  const prefs = [...document.querySelectorAll("#prefs-grid .pref-chip.sel")]
    .map(c => c.dataset.theme);
    
  if (prefs.length === 0) { alert("Choisis au moins une préférence !"); return; }

  // Sauvegarde locale
  STATE.pseudo = pseudo;
  STATE.prefs  = prefs;
  localStorage.setItem("puls_pseudo", pseudo);
  localStorage.setItem("puls_prefs",  JSON.stringify(prefs));

  // Envoi à Supabase
  try {
    await db.from("users").upsert({ pseudo, prefs, updated_at: new Date().toISOString() });
  } catch(e) { console.error("Erreur Supabase:", e); }

  // --- PARTIE ONESIGNAL ---
  // On essaye d'activer les notifs, mais on ne bloque pas l'app si ça rate
  if (document.getElementById("toggle-notif").checked) {
    console.log("Activation OneSignal...");
    updateOneSignalTags(prefs); 
  }

  // On lance l'app quoi qu'il arrive
  startApp();
});
}


// Fonction pour abonner l'utilisateur nativement
async function setupNativeNotifications(pseudo, prefs) {
  OneSignalDeferred.push(function(OneSignal) {
    // 1. Demande la permission à l'iPhone
    OneSignal.Notifications.requestPermission();

    // 2. On "Tag" l'utilisateur pour envoyer des messages ciblés plus tard
    // On enregistre son pseudo et ses thèmes préférés chez OneSignal
    OneSignal.User.addTag("pseudo", pseudo);
    
    prefs.forEach(p => {
      OneSignal.User.addTag(p, "true"); // Ex: tag "live" = true
    });
  });
}

function showNtfyInstructions(topics, prefs) {
  // Affiche une modal expliquant comment installer ntfy
  const topicList = prefs.map(p => {
    const t = ALL_THEMES.find(x => x.id === p);
    return `<li><strong>${t?.label || p}</strong> → <code>${NTFY_TOPICS[p]}</code></li>`;
  }).join("");

  const existingModal = document.getElementById("modal-ntfy");
  if (existingModal) existingModal.remove();

  const modal = document.createElement("div");
  modal.id = "modal-ntfy";
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal" style="max-width:420px">
      <div class="modal-title">📲 Activer les notifications</div>
      <p style="color:var(--txt2);font-size:13px;margin-bottom:12px;">
        Installe l'app <strong>ntfy</strong> (gratuite) pour recevoir les notifications push
        sur Android, iOS ou Windows — sans compte, sans CB.
      </p>
      <div class="ntfy-steps">
        <div class="ntfy-step">
          <span class="ntfy-step-num">1</span>
          <div>
            <div class="ntfy-step-title">Installe ntfy</div>
            <div class="ntfy-step-desc">
              Android : <a href="https://play.google.com/store/apps/details?id=io.heckel.ntfy" target="_blank" class="link">Play Store</a> ou <a href="https://f-droid.org/en/packages/io.heckel.ntfy/" target="_blank" class="link">F-Droid</a><br>
              iOS : <a href="https://apps.apple.com/app/ntfy/id1625396347" target="_blank" class="link">App Store</a><br>
              Windows/Linux : <a href="https://ntfy.sh/app" target="_blank" class="link">App Web</a> ou <a href="https://github.com/binwiederhier/ntfy/releases" target="_blank" class="link">Desktop</a>
            </div>
          </div>
        </div>
        <div class="ntfy-step">
          <span class="ntfy-step-num">2</span>
          <div>
            <div class="ntfy-step-title">Abonne-toi à tes thèmes</div>
            <div class="ntfy-step-desc">Dans ntfy, clique "+" et ajoute ces topics :</div>
            <ul class="ntfy-topics-list">${topicList}</ul>
          </div>
        </div>
        <div class="ntfy-step">
          <span class="ntfy-step-num">3</span>
          <div>
            <div class="ntfy-step-title">C'est tout !</div>
            <div class="ntfy-step-desc">Tu recevras une notification dès qu'un post est publié sur un thème que tu suis.</div>
          </div>
        </div>
      </div>
      <button class="btn-primary" id="btn-close-ntfy" style="margin-top:16px">Compris !</button>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById("btn-close-ntfy").addEventListener("click", () => modal.remove());
}

function setNotifStatus(msg, type) {
  const el = document.getElementById("notif-status");
  if (!el) return;
  el.textContent = msg;
  el.className = "notif-status " + (type || "");
}

// ══════════════════════════════════════
//  DÉMARRAGE APP
// ══════════════════════════════════════
function updateOneSignalTags(prefs) {
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  OneSignalDeferred.push(async function(OneSignal) {
    try {
      // 1. Demande de permission (fenêtre Safari)
      await OneSignal.Notifications.requestPermission();

      // 2. Préparation des tags
      const tags = {};
      ALL_THEMES.forEach(t => {
        tags[t.id] = prefs.includes(t.id) ? "true" : "false";
      });

      // 3. Envoi des tags
      console.log("Envoi des tags OneSignal:", tags);
      await OneSignal.User.addTags(tags);
    } catch (err) {
      console.error("Erreur OneSignal dans updateOneSignalTags:", err);
    }
  });
}

function startApp() {
  STATE.isAdmin = STATE.pseudo === ADMIN_PSEUDO;
  const btnCompose = document.getElementById("btn-goto-compose");
  if (!STATE.isAdmin) btnCompose.style.display = "none";
  updateOneSignalTags(STATE.prefs)
  showScreen("feed");
  initFeed();
  initCompose();
  showInstallBanner();
}

// ══════════════════════════════════════
//  FEED
// ══════════════════════════════════════
function initFeed() {
  renderFilterChips();

  document.getElementById("btn-filter").addEventListener("click", () => {
    document.getElementById("filter-panel").classList.toggle("hidden");
  });

  document.getElementById("btn-goto-compose").addEventListener("click", () => {
    showScreen("compose");
  });

  document.getElementById("btn-add-theme").addEventListener("click", openThemeModal);

  subscribeFeed();
}

function renderFilterChips() {
  const wrap = document.getElementById("filter-chips");
  wrap.innerHTML = "";
  ALL_THEMES.forEach(t => {
    if (!STATE.prefs.includes(t.id)) return;
    const btn = document.createElement("button");
    btn.className = "theme-chip active";
    btn.dataset.theme = t.id;
    btn.textContent = t.label;
    btn.addEventListener("click", () => {
      btn.classList.toggle("active");
      renderFeedFromCache();
    });
    wrap.appendChild(btn);
  });
}

let _cachedPosts = [];

function subscribeFeed() {
  if (STATE.unsubFeed) STATE.unsubFeed.unsubscribe();

  const now = new Date().toISOString();

  // Charge les posts initiaux
  loadPosts(now);

  // Écoute en temps réel les nouveaux posts via Supabase Realtime
  const channel = db.channel("posts-feed")
    .on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "posts",
    }, payload => {
      const post = payload.new;
      const publishAt = new Date(post.publish_at);
      const delay = publishAt.getTime() - Date.now();

      if (delay <= 0) {
        _cachedPosts.unshift(post);
        renderFeedFromCache();
      } else if (delay < 86400000) {
        setTimeout(() => {
          _cachedPosts.unshift(post);
          renderFeedFromCache();
        }, delay);
      }
    })
    .subscribe();

  STATE.unsubFeed = channel;
}

async function loadPosts(now) {
  const { data, error } = await db
    .from("posts")
    .select("*")
    .lte("publish_at", now)
    .order("publish_at", { ascending: false })
    .limit(50);

  if (error) { console.error("Feed error:", error); return; }
  _cachedPosts = data || [];
  renderFeedFromCache();
}

function getActiveFilters() {
  return [...document.querySelectorAll("#filter-chips .theme-chip.active")]
    .map(c => c.dataset.theme);
}

function renderFeedFromCache() {
  const filters = getActiveFilters();
  const list = document.getElementById("feed-list");

  Object.values(STATE.timers).forEach(clearInterval);
  STATE.timers = {};

  const filtered = filters.length === 0
    ? _cachedPosts
    : _cachedPosts.filter(p => filters.includes(p.theme));

  if (filtered.length === 0) {
    list.innerHTML = '<div class="feed-empty">Aucun post pour tes thèmes actuels.</div>';
    return;
  }

  list.innerHTML = "";
  filtered.forEach(post => {
    const card = buildPostCard(post);
    list.appendChild(card);
    if (post.timer_type && post.timer_type !== "none") {
      startPostTimer(post);
    }
    setTimeout(() => {
      STATE.seenPosts.add(post.id);
      localStorage.setItem("puls_seen", JSON.stringify([...STATE.seenPosts]));
    }, 2000);
  });
}

function buildPostCard(post) {
  const card = document.createElement("div");
  card.className = "post-card";
  card.dataset.postId = post.id;

  const isNew = !STATE.seenPosts.has(post.id);
  const badgeClass = "badge-" + (post.theme || "other");
  const themeLabel = ALL_THEMES.find(t => t.id === post.theme)?.label || post.theme;
  const timeAgo = formatTimeAgo(new Date(post.publish_at));
  const authorHtml = post.author
    ? `<div class="post-author">@${escHtml(post.author)} · ${timeAgo}</div>`
    : `<div class="post-author">${timeAgo}</div>`;

  let imageHtml = "";
  if (post.image_url) {
    imageHtml = `<img class="post-image" src="${post.image_url}" alt="" loading="lazy" />`;
  }

  let timerHtml = "";
  if (post.timer_type && post.timer_type !== "none") {
    const label = post.timer_type === "countdown" ? "Commence dans" : "Temps restant";
    timerHtml = `
      <div class="post-timer">
        <div>
          <div class="timer-label">${label}</div>
          <div class="timer-value" id="timer-${post.id}">--:--:--</div>
        </div>
        <div style="font-size:10px;color:var(--txt3);text-align:right;">j·h·m·s</div>
      </div>`;
  }

  card.innerHTML = `
    <div class="post-card-header">
      <span class="post-badge ${badgeClass}">${themeLabel}</span>
      ${isNew ? '<div class="post-new-dot"></div>' : ''}
      <span class="post-meta">${timeAgo}</span>
    </div>
    <div class="post-card-body">
      <div class="post-title">${escHtml(post.title)}</div>
      ${post.description ? `<div class="post-desc">${escHtml(post.description)}</div>` : ""}
      ${imageHtml}
      ${timerHtml}
    </div>
    <div class="post-card-footer">
      ${authorHtml}
    </div>`;

  return card;
}

function startPostTimer(post) {
  if (!post.timer_target) return;
  const targetDate = new Date(post.timer_target);

  const update = () => {
    const el = document.getElementById("timer-" + post.id);
    if (!el) { clearInterval(STATE.timers[post.id]); return; }

    const now = Date.now();
    const target = targetDate.getTime();

    if (post.timer_type === "remaining") {
      const rem = target - now;
      if (rem <= 0) { el.textContent = "Terminé"; el.className = "timer-value ended"; return; }
      el.textContent = formatDuration(rem);
    } else {
      const diff = target - now;
      if (diff <= 0) { el.textContent = "C'est parti !"; el.className = "timer-value live"; return; }
      el.textContent = formatDuration(diff);
    }
  };

  update();
  STATE.timers[post.id] = setInterval(update, 1000);
}

// ══════════════════════════════════════
//  THEME MODAL
// ══════════════════════════════════════
function openThemeModal() {
  const wrap = document.getElementById("modal-theme-chips");
  wrap.innerHTML = "";
  ALL_THEMES.forEach(t => {
    const btn = document.createElement("button");
    btn.className = "theme-chip" + (STATE.prefs.includes(t.id) ? " active" : "");
    btn.textContent = t.label;
    btn.addEventListener("click", async () => {
      btn.classList.toggle("active");
      const idx = STATE.prefs.indexOf(t.id);
      if (idx >= 0) STATE.prefs.splice(idx, 1);
      else STATE.prefs.push(t.id);
      localStorage.setItem("puls_prefs", JSON.stringify(STATE.prefs));
      await db.from("users").upsert({ pseudo: STATE.pseudo, prefs: STATE.prefs, updated_at: new Date().toISOString() });
      renderFilterChips();
    });
    wrap.appendChild(btn);
  });
  document.getElementById("modal-theme").classList.remove("hidden");
}

document.getElementById("btn-close-modal").addEventListener("click", () => {
  document.getElementById("modal-theme").classList.add("hidden");
});
document.getElementById("modal-theme").addEventListener("click", e => {
  if (e.target === e.currentTarget) e.currentTarget.classList.add("hidden");
});

// ══════════════════════════════════════
//  COMPOSE (admin uniquement)
// ══════════════════════════════════════
function initCompose() {
  document.getElementById("btn-back-feed").addEventListener("click", () => showScreen("feed"));

  document.querySelectorAll("#compose-themes .theme-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("#compose-themes .theme-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      STATE.selectedTheme = chip.dataset.theme;
    });
  });

  document.getElementById("img-drop").addEventListener("click", () => {
    document.getElementById("inp-image").click();
  });
  document.getElementById("inp-image").addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    STATE.selectedImage = file;
    const url = URL.createObjectURL(file);
    document.getElementById("img-preview").innerHTML = `<img class="img-preview-actual" src="${url}" />`;
  });

  document.querySelectorAll("#timer-type .seg").forEach(seg => {
    seg.addEventListener("click", () => {
      document.querySelectorAll("#timer-type .seg").forEach(s => s.classList.remove("active"));
      seg.classList.add("active");
      STATE.timerType = seg.dataset.val;
      document.getElementById("timer-date-wrap").classList.toggle("hidden", STATE.timerType === "none");
    });
  });

  document.querySelectorAll("#sched-type .seg").forEach(seg => {
    seg.addEventListener("click", () => {
      document.querySelectorAll("#sched-type .seg").forEach(s => s.classList.remove("active"));
      seg.classList.add("active");
      STATE.schedType = seg.dataset.val;
      document.getElementById("sched-date-wrap").classList.toggle("hidden", STATE.schedType === "now");
    });
  });

  document.getElementById("btn-publish").addEventListener("click", publishPost);
}

async function publishPost() {
  if (!STATE.isAdmin) return;

  const title = document.getElementById("inp-title").value.trim();
  const desc  = document.getElementById("inp-desc").value.trim();
  const notifyUsers = document.getElementById("toggle-push").checked;

  if (!title) { setPublishStatus("Titre requis.", "err"); return; }

  const btn = document.getElementById("btn-publish");
  btn.disabled = true;
  setPublishStatus("Publication en cours...");

  try {
    // Upload image vers Supabase Storage
    let imageUrl = null;
    if (STATE.selectedImage) {
      const ext = STATE.selectedImage.name.split(".").pop();
      const path = `posts/${Date.now()}.${ext}`;
      const { error: uploadErr } = await db.storage
        .from("images")
        .upload(path, STATE.selectedImage, { cacheControl: "3600", upsert: false });

      if (uploadErr) throw uploadErr;
      const { data: urlData } = db.storage.from("images").getPublicUrl(path);
      imageUrl = urlData.publicUrl;
    }

    // Dates
    let publishAt = new Date().toISOString();
    if (STATE.schedType === "later") {
      const d = document.getElementById("inp-sched-date").value;
      if (!d) { setPublishStatus("Choisis une date de publication.", "err"); btn.disabled = false; return; }
      publishAt = new Date(d).toISOString();
    }

    let timerTarget = null;
    if (STATE.timerType !== "none") {
      const td = document.getElementById("inp-timer-date").value;
      if (!td) { setPublishStatus("Choisis une date pour le timer.", "err"); btn.disabled = false; return; }
      timerTarget = new Date(td).toISOString();
    }

    // Sauvegarde dans Supabase
    const { data: postData, error: postErr } = await db.from("posts").insert({
      title,
      description: desc,
      theme:       STATE.selectedTheme,
      image_url:   imageUrl,
      timer_type:  STATE.timerType,
      timer_target: timerTarget,
      publish_at:  publishAt,
      author:      STATE.pseudo,
      notify:      notifyUsers,
    }).select().single();

    if (postErr) throw postErr;
    if (notifyUsers && STATE.schedType === "now") {
    await sendOneSignalNotification(postData);
    
    
    }

    setPublishStatus("✓ Post publié !", "ok");
    resetCompose();
    setTimeout(() => showScreen("feed"), 1200);

  } catch(e) {
    console.error("Publish error:", e);
    setPublishStatus("Erreur : " + e.message, "err");
  } finally {
    btn.disabled = false;
  }
}

// ── Envoi notification push via ntfy.sh ──
// Pas besoin de serveur ! L'admin envoie directement depuis le navigateur.
async function sendNtfyNotification(post) {
  const topic = NTFY_TOPICS[post.theme];
  if (!topic) return;

  const themeLabel = ALL_THEMES.find(t => t.id === post.theme)?.label || post.theme;

  try {
    await fetch(`${NTFY_BASE}/${topic}`, {
      method: "POST",
      headers: {
        "Title": `puls. — ${themeLabel}`,
        "Priority": "default",
        "Tags": post.theme,
        "Click": window.location.origin,
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: post.title + (post.description ? "\n" + post.description : ""),
    });
    console.log("Notification ntfy envoyée !");
  } catch(e) {
    console.warn("ntfy error (non bloquant):", e);
  }
}

function resetCompose() {
  document.getElementById("inp-title").value = "";
  document.getElementById("inp-desc").value = "";
  document.getElementById("img-preview").innerHTML = "<span>Appuie pour choisir une image</span>";
  STATE.selectedImage = null;
  STATE.timerType = "none";
  STATE.schedType = "now";
  document.querySelectorAll("#timer-type .seg").forEach((s,i) => s.classList.toggle("active", i===0));
  document.querySelectorAll("#sched-type .seg").forEach((s,i) => s.classList.toggle("active", i===0));
  document.getElementById("timer-date-wrap").classList.add("hidden");
  document.getElementById("sched-date-wrap").classList.add("hidden");
}

function setPublishStatus(msg, type) {
  const el = document.getElementById("publish-status");
  el.textContent = msg;
  el.className = "publish-status " + (type || "");
}

// ══════════════════════════════════════
//  INSTALL BANNER
// ══════════════════════════════════════
function showInstallBanner() {
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;
  const dismissed = localStorage.getItem("puls_install_dismissed");

  if (isIos && !isStandalone && !dismissed) {
    const banner = document.createElement("div");
    banner.className = "install-banner";
    banner.innerHTML = `
      <span style="font-size:20px;">📲</span>
      <div class="install-banner-text">
        Pour les notifs sur iOS, installe <strong>ntfy</strong> (App Store) puis ajoute cette app :<br>
        <strong>Safari → Partager → Sur l'écran d'accueil</strong>
      </div>
      <button class="install-banner-close" id="close-install">✕</button>`;
    document.body.appendChild(banner);
    document.getElementById("close-install").addEventListener("click", () => {
      banner.remove();
      localStorage.setItem("puls_install_dismissed", "1");
    });
  }

  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    const banner = document.createElement("div");
    banner.className = "install-banner";
    banner.innerHTML = `
      <span style="font-size:20px;">📲</span>
      <div class="install-banner-text">Installe puls. sur ton appareil !</div>
      <button class="btn-small" id="btn-do-install">Installer</button>
      <button class="install-banner-close" id="close-install2">✕</button>`;
    document.body.appendChild(banner);
    document.getElementById("btn-do-install").addEventListener("click", () => { e.prompt(); banner.remove(); });
    document.getElementById("close-install2").addEventListener("click", () => banner.remove());
  });
}

// ══════════════════════════════════════
//  UTILS
// ══════════════════════════════════════
function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sc = s % 60;
  const pad = n => String(n).padStart(2, "0");
  if (d > 0) return `${pad(d)}:${pad(h)}:${pad(m)}:${pad(sc)}`;
  return `${pad(h)}:${pad(m)}:${pad(sc)}`;
}

function formatTimeAgo(date) {
  if (!date) return "";
  const diff = Date.now() - date.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "à l'instant";
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  const d = Math.floor(h / 24);
  return `il y a ${d}j`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
async function sendOneSignalNotification(post) {
  const themeLabel = ALL_THEMES.find(t => t.id === post.theme)?.label || post.theme;

  const body = {
    app_id: ONESIGNAL_APP_ID,
    // Le message qui s'affiche sur le téléphone
    headings: { "en": "puls. — " + themeLabel, "fr": "puls. — " + themeLabel },
    contents: { "en": post.title, "fr": post.title },
    // Lien qui s'ouvre quand on clique sur la notif
    url: window.location.origin,
    // Filtrage : On envoie seulement à ceux qui suivent ce thème
    filters: [
      { "field": "tag", "key": post.theme, "relation": "=", "value": "true" }
    ]
  };

  try {
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": "Basic " + ONESIGNAL_REST_KEY
      },
      body: JSON.stringify(body)
    });
    const resData = await response.json();
    console.log("Retour OneSignal:", resData);
  } catch (err) {
    console.error("Erreur envoi OneSignal:", err);
  }
}
// ── Boot ──
initSetup();