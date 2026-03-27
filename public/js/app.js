// ═══════════════════════════════════════════════════════════════
//  PULS. — APP.JS (VERSION SÉCURISÉE avec Vercel API)
//  Utilise une API serverless pour cacher la clé OneSignal
// ═══════════════════════════════════════════════════════════════

// Pour utiliser cette version :
// 1. Renomme ce fichier en "app.js"
// 2. Déploie le dossier /api sur Vercel
// 3. Configure les variables d'environnement Vercel

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
  liveStatus:    false,
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
  console.log("initSetup démarré", STATE.pseudo, STATE.prefs);
  if (!Array.isArray(STATE.prefs)) STATE.prefs = [];

  if (STATE.pseudo) { startApp(); return; }

  const btnStart = document.getElementById("btn-start");
  if (!btnStart) {
    console.error("btn-start introuvable");
    return;
  }

  document.querySelectorAll("#prefs-grid .pref-chip").forEach(chip => {
    if (STATE.prefs.includes(chip.dataset.theme)) chip.classList.add("sel");
    chip.addEventListener("click", () => chip.classList.toggle("sel"));
  });

  btnStart.addEventListener("click", async () => {
    console.log("clic btn-start");
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
      await db.from("users").upsert({
        pseudo,
        prefs,
        updated_at: new Date().toISOString()
      });
    } catch(e) {
      console.error("Erreur Supabase:", e);
    }

    // Mise à jour des tags OneSignal avec les prefs choisies
    updateOneSignalTags(prefs);

    // Configuration OneSignal
    if (document.getElementById("toggle-notif").checked) {
      setNotifStatus("Configuration des notifications...");
      await setupOneSignalNotifications(pseudo, prefs);
    }

    // Lancement de l'app
    startApp();

  });
}

// ── Configuration OneSignal complète ──
async function setupOneSignalNotifications(pseudo, prefs) {
  return new Promise((resolve) => {
    runOneSignal(async function() {
      try {
        const oneSignal = window.OneSignal;
        console.log("🔔 Initialisation OneSignal pour:", pseudo, " - OneSignal ready:", Boolean(oneSignal));

        if (!oneSignal) {
          throw new Error("OneSignal SDK introuvable");
        }

        let hasPermission = true;

        // OneSignal v16: contrôle d'autorisation via isPushNotificationsEnabled
        if (typeof oneSignal.isPushNotificationsEnabled === "function") {
          const enabled = await oneSignal.isPushNotificationsEnabled();
          if (!enabled) {
            if (typeof oneSignal.registerForPushNotifications === "function") {
              await oneSignal.registerForPushNotifications();
              hasPermission = await oneSignal.isPushNotificationsEnabled();
            } else {
              hasPermission = false;
            }
          }
        } else if (typeof oneSignal.getNotificationPermission === "function") {
          const perm = await oneSignal.getNotificationPermission();
          hasPermission = perm === "granted";
        }

        if (!hasPermission) {
          setNotifStatus("Notifications refusées", "err");
          resolve(false);
          return;
        }


        // 2. Définir les tags (pseudo + thèmes)
        const tags = { pseudo };
        ALL_THEMES.forEach(t => {
          tags[t.id] = prefs.includes(t.id) ? "true" : "false";
        });

        if (typeof oneSignal.sendTags === "function") {
          await oneSignal.sendTags(tags);
        } else if (oneSignal.User && typeof oneSignal.User.addTags === "function") {
          await oneSignal.User.addTags(tags);
        }

        setNotifStatus("✓ Notifications activées", "ok");
        console.log("✅ OneSignal configuré avec tags:", tags);
        await debugOneSignalStatus();
        resolve(true);
      } catch (err) {
        console.error("❌ Erreur OneSignal:", err);
        setNotifStatus("Erreur : " + (err.message || err), "err");
        resolve(false);
      }
    });
  });
}

// ── Utilitaire OneSignal ──
function runOneSignal(fn) {
  window.OneSignal = window.OneSignal || [];
  if (typeof window.OneSignal.push === 'function') {
    window.OneSignal.push(fn);
  } else {
    console.warn('⚠️ OneSignal.push not available yet - retrying soon');
    setTimeout(() => runOneSignal(fn), 300);
  }
}

// ── Mettre à jour les tags OneSignal ──
function updateOneSignalTags(prefs) {
  const tags = { pseudo: STATE.pseudo };
  ALL_THEMES.forEach(t => {
    tags[t.id] = prefs.includes(t.id) ? "true" : "false";
  });

  runOneSignal(async function() {
    try {
      if (OneSignal && typeof OneSignal.sendTags === 'function') {
        await OneSignal.sendTags(tags);
      } else if (OneSignal && OneSignal.User && typeof OneSignal.User.addTags === 'function') {
        await OneSignal.User.addTags(tags);
      }
      console.log("✓ Tags OneSignal mis à jour:", tags);
    } catch (err) {
      console.warn("⚠️ Erreur mise à jour tags (non bloquante):", err.message || err);
    }
  });
}

function setNotifStatus(msg, type) {
  const el = document.getElementById("notif-status");
  if (!el) return;
  el.textContent = msg;
  el.className = "notif-status " + (type || "");
}

async function debugOneSignalStatus() {
  if (!window.OneSignal) {
    console.warn("OneSignal non disponible pour debug");
    return;
  }

  // +++ External live status tracking +++
  if (typeof fetchTwitchLive === 'function') await fetchTwitchLive();
  if (typeof fetchYoutubeLive === 'function') await fetchYoutubeLive();

  try {
    const userId = typeof OneSignal.getUserId === 'function' ? await OneSignal.getUserId() : null;
    const isEnabled = typeof OneSignal.isPushNotificationsEnabled === 'function' ? await OneSignal.isPushNotificationsEnabled() : null;
    const tags = typeof OneSignal.getTags === 'function' ? await OneSignal.getTags() : null;
    console.info("🧾 OneSignal status:", { userId, isEnabled, tags });
  } catch (err) {
    console.warn("🧾 OneSignal status error:", err.message || err);
  }
}

function setLiveUi(live, viewers, source) {
  const indicator = document.getElementById("live-indicator");
  const v = document.getElementById("live-viewers");

  if (!indicator || !v) return;

  if (live) {
    indicator.classList.remove("hidden");
    indicator.textContent = `🔴 Live (${source})`;
    v.classList.remove("hidden");
    v.textContent = `${viewers || 0} viewers`;
    STATE.liveStatus = true;
  } else {
    if (!STATE.liveStatus) {
      indicator.classList.add("hidden");
    }
    v.classList.add("hidden");
  }
}

async function fetchTwitchLive() {
  if (!TWITCH_CLIENT_ID || !TWITCH_BEARER_TOKEN || !TWITCH_CHANNEL_NAME) return;

  try {
    const url = `https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(TWITCH_CHANNEL_NAME)}`;
    const res = await fetch(url, {
      headers: {
        "Client-ID": TWITCH_CLIENT_ID,
        "Authorization": `Bearer ${TWITCH_BEARER_TOKEN}`
      }
    });

    if (!res.ok) {
      console.warn("Twitch API non disponible", res.status);
      return;
    }

    const data = await res.json();
    const stream = data.data && data.data.length ? data.data[0] : null;

    if (stream && stream.type === "live") {
      setLiveUi(true, stream.viewer_count, "Twitch");
      // create auto post when stream starts (only once)
      await createOrUpdateAutoPost(`Live: ${stream.title}`, `Regarde le live sur Twitch : https://twitch.tv/${TWITCH_CHANNEL_NAME}`);
    } else {
      setLiveUi(false, 0, "Twitch");
    }
  } catch (err) {
    console.warn("fetchTwitchLive erreur", err);
  }
}

async function fetchYoutubeLive() {
  if (!YOUTUBE_API_KEY || !YOUTUBE_CHANNEL_ID) return;

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${YOUTUBE_CHANNEL_ID}&eventType=live&type=video&key=${YOUTUBE_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn("YouTube API live status non disponible", res.status);
      return;
    }

    const data = await res.json();
    const liveVideo = data.items && data.items.length ? data.items[0] : null;

    if (liveVideo) {
      // obtenir viewers via liveBroadcasts API si besoin
      setLiveUi(true, "?", "YouTube");
      await createOrUpdateAutoPost(`Live YouTube: ${liveVideo.snippet.title}`, `Regarde en live : https://www.youtube.com/watch?v=${liveVideo.id.videoId}`);
    } else {
      setLiveUi(false, 0, "YouTube");
    }
  } catch (err) {
    console.warn("fetchYoutubeLive erreur", err);
  }
}

async function fetchYoutubeLatestVideo() {
  if (!YOUTUBE_API_KEY || !YOUTUBE_CHANNEL_ID) return;

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${YOUTUBE_CHANNEL_ID}&order=date&type=video&maxResults=1&key=${YOUTUBE_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn("YouTube API latest video non disponible", res.status);
      return;
    }

    const data = await res.json();
    const latest = data.items && data.items.length ? data.items[0] : null;
    if (!latest) return;

    const videoId = latest.id.videoId;
    const cached = localStorage.getItem("puls_latest_youtube_video");
    if (videoId && videoId !== cached) {
      const title = latest.snippet.title;
      const desc = latest.snippet.description;
      await createOrUpdateAutoPost(`Nouvelle vidéo : ${title}`, `${desc}\nhttps://youtube.com/watch?v=${videoId}`);
      localStorage.setItem("puls_latest_youtube_video", videoId);
    }
  } catch (err) {
    console.warn("fetchYoutubeLatestVideo erreur", err);
  }
}

async function createOrUpdateAutoPost(title, content) {
  try {
    const { data: existing, error: selErr } = await db.from("posts").select("id, title").eq("title", title).single();
    if (selErr && selErr.code !== "PGRST116") {
      console.error("Erreur check post existant", selErr);
      return;
    }

    if (existing) {
      return;
    }

    const { error: insErr } = await db.from("posts").insert({
      title,
      description: content,
      theme: "live",
      image_url: null,
      timer_type: "none",
      timer_target: null,
      publish_at: new Date().toISOString(),
      author: STATE.pseudo || "AutoBot",
      notify: true
    });

    if (insErr) {
      console.error("Erreur création post auto", insErr);
      return;
    }

    console.log("Post auto créé pour vidéo/live", title);
  } catch (err) {
    console.error("createOrUpdateAutoPost err", err);
  }
}

function initExternalLiveTracking() {
  fetchTwitchLive();
  fetchYoutubeLive();
  fetchYoutubeLatestVideo();

  setInterval(() => {
    fetchTwitchLive();
    fetchYoutubeLive();
  }, 30_000);

  setInterval(() => {
    fetchYoutubeLatestVideo();
  }, 90_000);
}

// ══════════════════════════════════════
//  DÉMARRAGE APP
// ══════════════════════════════════════
function startApp() {
  STATE.isAdmin = STATE.pseudo === ADMIN_PSEUDO;
  const btnCompose = document.getElementById("btn-goto-compose");
  if (!STATE.isAdmin) btnCompose.style.display = "none";

  updateOneSignalTags(STATE.prefs);
  loadLiveStatus();
  initExternalLiveTracking();

  showScreen("feed");
  initFeed();
  initCompose();
  initSettings();
  showInstallBanner();
  // Détection du nombre de personnes en ligne
  const presenceChannel = db.channel('online-users');
  presenceChannel
    .on('presence', { event: 'sync' }, () => {
      const newState = presenceChannel.presenceState();
      const count = Object.keys(newState).length;
      const userCountEl = document.getElementById('user-count');
      if (userCountEl) {
        userCountEl.textContent = count;
      }
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await presenceChannel.track({ online_at: new Date().toISOString(), user: STATE.pseudo });
      }
    });

  initLiveListener();
}

function initLiveListener() {
  db.channel('users_live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, payload => {
      if (!payload.new) return;
      if (payload.new.pseudo === STATE.pseudo) return; // local status déjà géré
      if (payload.new.live !== undefined) {
        console.log('Live status utilisateur mise à jour:', payload.new.pseudo, payload.new.live);
        showLiveBadge(payload.new.pseudo, payload.new.live);
      }
    })
    .subscribe();
}

function showLiveBadge(pseudo, isLive) {
  const el = document.getElementById('live-indicator');
  if (!el) return;

  if (isLive) {
    el.textContent = `🔴 ${pseudo} est en direct`;
    el.classList.remove('hidden');
  } else if (pseudo === STATE.pseudo) {
    el.classList.toggle('hidden', !STATE.liveStatus);
  }
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

  STATE.unsubFeed = db
    .channel("posts_feed")
    .on("postgres_changes", 
      { event: "INSERT", schema: "public", table: "posts" },
      (payload) => {
        console.log("Nouveau post détecté:", payload.new);
        _cachedPosts.unshift(payload.new);
        renderFeedFromCache();
      }
    )
    .on("postgres_changes", 
      { event: "DELETE", schema: "public", table: "posts" },
      (payload) => {
        console.log("Post supprimé détecté:", payload.old.id);
        _cachedPosts = _cachedPosts.filter(p => p.id !== payload.old.id);
        renderFeedFromCache();
      }
    )
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        console.log("Abonné au feed en temps réel");
        await loadInitialPosts();
      }
    });
    // Écouter les likes
  db.channel('likes-updates')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, payload => {
      const pId = payload.new.post_id || payload.old.post_id;
      loadStats(pId);
    })
    .subscribe();

  // Écouter les réponses
  db.channel('replies-updates')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post_replies' }, payload => {
      loadStats(payload.new.post_id);
      // On ouvre la section des réponses automatiquement pour voir le nouveau message
      document.getElementById(`reply-box-${payload.new.post_id}`).classList.remove('hidden');
    })
    .subscribe();
}

async function loadInitialPosts() {
  try {
    const now = new Date().toISOString();
    const { data, error } = await db
      .from("posts")
      .select("*")
      .lte("publish_at", now)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    _cachedPosts = data || [];
    renderFeedFromCache();
  } catch (e) {
    console.error("Erreur chargement posts:", e);
    document.getElementById("feed-list").innerHTML = 
      '<div class="feed-empty">Erreur de chargement...</div>';
  }
}

function renderFeedFromCache() {
  const activeFilters = [...document.querySelectorAll("#filter-chips .theme-chip.active")]
    .map(c => c.dataset.theme);

  const filtered = _cachedPosts.filter(p => {
    if (activeFilters.length > 0 && !activeFilters.includes(p.theme)) return false;
    return true;
  });

  const feedList = document.getElementById("feed-list");
  if (filtered.length === 0) {
    feedList.innerHTML = '<div class="feed-empty">Aucun post à afficher</div>';
    return;
  }

  feedList.innerHTML = filtered.map(p => renderPostCard(p)).join("");
  startTimers();
  
  // Charger les likes et réponses pour tous les posts affichés
  filtered.forEach(p => loadStats(p.id));
}

function renderPostCard(post) {
  const theme = ALL_THEMES.find(t => t.id === post.theme);
  const timeAgo = formatTimeAgo(new Date(post.created_at));
  
  // On génère un ID unique pour la zone de commentaires
  const cardId = `post-${post.id}`;

  return `
    <div class="post-card" id="${cardId}">
      <div class="post-card-header">
        <span class="post-badge badge-${post.theme}">${escHtml(theme?.label || post.theme)}</span>
        <span class="post-meta">${timeAgo}</span>
      </div>
      <div class="post-card-body">
        <div class="post-title">${escHtml(post.title)}</div>
        ${post.description ? `<div class="post-desc">${escHtml(post.description)}</div>` : ''}
        ${post.image_url ? `<img src="${post.image_url}" class="post-image" />` : ''}
      </div>
      
      <div class="post-actions">
        <button class="action-btn" onclick="toggleLike('${post.id}')" id="like-btn-${post.id}">
          ❤️ <span id="like-count-${post.id}">0</span>
        </button>
        <button class="action-btn" onclick="document.getElementById('reply-box-${post.id}').classList.toggle('hidden')">
          💬 Répondre
        </button>
        ${STATE.isAdmin ? `<button class="action-btn btn-delete" onclick="deletePost('${post.id}')">🗑️ Supprimer</button>` : ''}
      </div>
      ${post.timer_type && post.timer_type !== 'none' && post.timer_target ? `
      <div class="post-timer">
        Timer: <span class="timer-value" id="timer-${post.id}" data-timer="${post.id}" data-target="${new Date(post.timer_target).getTime()}">calcul...</span>
      </div>
      ` : ''}

      <div id="reply-box-${post.id}" class="replies-section hidden">
        <div id="replies-list-${post.id}"></div>
        <div class="reply-input-wrap">
          <input type="text" id="inp-reply-${post.id}" class="field-input" placeholder="Ta réponse..." />
          <button class="btn-small" onclick="sendReply('${post.id}')">Envoyer</button>
        </div>
      </div>
    </div>`;
}



function startTimers() {
  // Nettoyer les anciens timers
  Object.values(STATE.timers).forEach(t => clearInterval(t));
  STATE.timers = {};

  document.querySelectorAll("[data-timer]").forEach(el => {
    const id = el.dataset.timer;
    const target = parseInt(el.dataset.target, 10);

    STATE.timers[id] = setInterval(() => {
      const diff = target - Date.now();
      if (diff <= 0) {
        el.textContent = "Terminé";
        el.className = "timer-value ended";
        clearInterval(STATE.timers[id]);
      } else {
        el.textContent = formatDuration(diff);
      }
    }, 1000);
  });
}

// ══════════════════════════════════════
//  MODAL THÈME
// ══════════════════════════════════════
function openThemeModal() {
  const modal = document.getElementById("modal-theme");
  const chips = document.getElementById("modal-theme-chips");
  
  chips.innerHTML = "";
  ALL_THEMES.forEach(t => {
    if (STATE.prefs.includes(t.id)) return;
    const btn = document.createElement("button");
    btn.className = "theme-chip";
    btn.textContent = t.label;
    btn.addEventListener("click", async () => {
      STATE.prefs.push(t.id);
      localStorage.setItem("puls_prefs", JSON.stringify(STATE.prefs));
      await db.from("users").upsert({ 
        pseudo: STATE.pseudo, 
        prefs: STATE.prefs,
        updated_at: new Date().toISOString()
      });
      updateOneSignalTags(STATE.prefs);
      renderFilterChips();
      modal.classList.add("hidden");
    });
    chips.appendChild(btn);
  });

  modal.classList.remove("hidden");
}

document.getElementById("btn-close-modal").addEventListener("click", () => {
  document.getElementById("modal-theme").classList.add("hidden");
});

document.getElementById("modal-theme").addEventListener("click", (e) => {
  if (e.target.id === "modal-theme") {
    e.target.classList.add("hidden");
  }
});

// ══════════════════════════════════════
//  COMPOSE (ADMIN)
// ══════════════════════════════════════
function initCompose() {
  document.getElementById("btn-back-feed").addEventListener("click", () => {
    showScreen("feed");
  });

  // Sélection thème
  document.querySelectorAll("#compose-themes .theme-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("#compose-themes .theme-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      STATE.selectedTheme = chip.dataset.theme;
    });
  });

  // Upload image
  const imgDrop = document.getElementById("img-drop");
  const imgInput = document.getElementById("inp-image");
  const imgPreview = document.getElementById("img-preview");

  imgDrop.addEventListener("click", () => imgInput.click());
  
  imgInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    STATE.selectedImage = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
      imgPreview.innerHTML = `<img src="${ev.target.result}" class="img-preview-actual" alt="Preview" />`;
    };
    reader.readAsDataURL(file);
  });

  // Timer type
  document.querySelectorAll("#timer-type .seg").forEach(seg => {
    seg.addEventListener("click", () => {
      document.querySelectorAll("#timer-type .seg").forEach(s => s.classList.remove("active"));
      seg.classList.add("active");
      STATE.timerType = seg.dataset.val;
      document.getElementById("timer-date-wrap").classList.toggle("hidden", STATE.timerType === "none");
    });
  });

  // Schedule type
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

  if (!title) { 
    setPublishStatus("Titre requis.", "err"); 
    return; 
  }

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
      if (!d) { 
        setPublishStatus("Choisis une date de publication.", "err"); 
        btn.disabled = false; 
        return; 
      }
      publishAt = new Date(d).toISOString();
    }

    let timerTarget = null;
    if (STATE.timerType !== "none") {
      const td = document.getElementById("inp-timer-date").value;
      if (!td) { 
        setPublishStatus("Choisis une date pour le timer.", "err"); 
        btn.disabled = false; 
        return; 
      }
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

    // Envoi notification push via API Vercel (publication immédiate uniquement)
    if (notifyUsers) {
      if (STATE.schedType === "now") {
        setPublishStatus("Envoi des notifications...");
        await sendOneSignalNotificationViaAPI(postData);
      } else {
        console.log("Post programmé - notifications reportées");
      }
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

// ── Envoi notification push via API Vercel (SÉCURISÉ) ──
async function sendOneSignalNotificationViaAPI(post) {
  const themeLabel = ALL_THEMES.find(t => t.id === post.theme)?.label || post.theme;

  console.log("📢 Envoi notif OneSignal pour:", {
    title: post.title,
    theme: post.theme,
    themeLabel: themeLabel,
    description: post.description
  });

  try {
    const response = await fetch("/api/send-push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: post.title,
        description: post.description,
        theme: post.theme,
        themeLabel: themeLabel
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      const errorMsg = data.error || data.message || response.statusText;
      console.error("❌ Erreur API send-push:", {
        status: response.status,
        error: errorMsg,
        data: data
      });
      
      // Pour les erreurs "no subscribers", ce n'est pas grave
      if (errorMsg.includes("not subscribed")) {
        console.warn("⚠️ Aucun abonné pour ce thème - c'est normal au départ");
        setPublishStatus("⚠️ Post publié (aucun abonné pour ce thème)", "ok");
        return { success: false, message: "Aucun abonné" };
      }
      
      throw new Error(errorMsg);
    }

    console.log("✅ Notification envoyée via OneSignal:", {
      id: data.id,
      recipients: data.recipients
    });
    setPublishStatus("✓ Post publié et notifs envoyées !", "ok");
    return data;
    
  } catch(err) {
    console.error("❌ Erreur envoi notification:", err);
    // Ne pas bloquer la publication si les notifications échouent
    console.warn("⚠️ Les notifications n'ont pas pu être envoyées, mais le post est publié");
    setPublishStatus("✓ Post publié", "ok");
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
//  PARAMÈTRES
// ══════════════════════════════════════
function initSettings() {
  document.getElementById("btn-settings").addEventListener("click", openSettings);
  document.getElementById("btn-back-settings").addEventListener("click", () => {
    showScreen("feed");
  });
  document.getElementById("btn-clear-cache").addEventListener("click", clearCache);
  document.getElementById("btn-logout").addEventListener("click", logout);
  document.getElementById("btn-add-pref").addEventListener("click", openThemeModal);
  document.getElementById("btn-toggle-live").addEventListener("click", async () => {
    await toggleLiveStatus();
  });
}

function openSettings() {
  // Afficher pseudo et prefs
  document.getElementById("settings-pseudo").textContent = STATE.pseudo;
  
  const wrap = document.getElementById("settings-prefs");
  wrap.innerHTML = "";
  ALL_THEMES.forEach(t => {
    if (!STATE.prefs.includes(t.id)) return;
    const chip = document.createElement("span");
    chip.className = "pref-chip sel";
    chip.textContent = t.label;
    wrap.appendChild(chip);
  });

  renderLiveUI();
  showScreen("settings");
}

function renderLiveUI() {
  const liveIndicator = document.getElementById("live-status");
  const button = document.getElementById("btn-toggle-live");

  if (!liveIndicator || !button) return;

  if (STATE.liveStatus) {
    liveIndicator.textContent = "Statut: en direct";
    liveIndicator.className = "live-status live-on";
    button.textContent = "Arrêter le live";
  } else {
    liveIndicator.textContent = "Statut: hors ligne";
    liveIndicator.className = "live-status";
    button.textContent = "Passer en live";
  }
}

async function setLiveStatus(isLive) {
  STATE.liveStatus = isLive;

  try {
    await db.from("users").update({ live: isLive, updated_at: new Date().toISOString() }).eq("pseudo", STATE.pseudo);
  } catch (err) {
    console.error("Erreur mise à jour live status:", err);
  }

  const indicator = document.getElementById("live-indicator");
  if (indicator) {
    indicator.classList.toggle("hidden", !isLive);
  }

  renderLiveUI();
}

async function toggleLiveStatus() {
  await setLiveStatus(!STATE.liveStatus);
}

async function loadLiveStatus() {
  if (!STATE.pseudo) return;

  try {
    const { data, error } = await db.from("users").select("live").eq("pseudo", STATE.pseudo).single();

    if (error) {
      if (error.code === "PGRST116" || error.message?.includes("No rows returned")) {
        // utilisateur non trouvé en base, on initialise à false
        STATE.liveStatus = false;
        renderLiveUI();
        return;
      }
      console.warn("Erreur lecture live-status", error);
      return;
    }

    const live = data?.live || false;
    await setLiveStatus(live);
  } catch (err) {
    console.warn("Erreur loadLiveStatus:", err);
  }
}

function clearCache() {
  const statusEl = document.getElementById("cache-status");
  const btnClear = document.getElementById("btn-clear-cache");
  
  btnClear.disabled = true;
  statusEl.textContent = "Suppression en cours...";
  
  try {
    // Vider localStorage
    localStorage.clear();
    
    // Vider le cache navigateur (Service Worker)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(reg => {
          reg.unregister();
          // Nettoyer le cache
          if ('caches' in window) {
            caches.keys().then(cacheNames => {
              cacheNames.forEach(cacheName => {
                caches.delete(cacheName);
              });
            });
          }
        });
      });
    }
    
    statusEl.textContent = "✓ Cache supprimé ! Rechargement...";
    statusEl.className = "cache-status ok";
    setTimeout(() => {
      window.location.reload();
    }, 1500);
    
  } catch(err) {
    console.error("Erreur suppression cache:", err);
    statusEl.textContent = "❌ Erreur : " + err.message;
    statusEl.className = "cache-status err";
    btnClear.disabled = false;
  }
}

function logout() {
  if (!confirm("Bonne d'être sûr ? Tu perdras ton pseudo et tes préférences.")) return;
  
  localStorage.clear();
  sessionStorage.clear();
  location.reload();
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
        Installe puls. sur ton iPhone :<br>
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
    document.getElementById("btn-do-install").addEventListener("click", () => { 
      e.prompt(); 
      banner.remove(); 
    });
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
// --- FONCTION LIKE ---
async function toggleLike(postId) {
  const payload = { post_id: postId, pseudo: STATE.pseudo };

  // On tente insert -> si conflict on supprime pour toggle
  let { error } = await db.from('post_likes').insert(payload);

  if (error && (error.code === '23505' || error.code === '409')) {
    // Conflit : le like existait déjà, on retire
    const { error: delError } = await db.from('post_likes').delete().match(payload);
    if (delError) {
      console.error('Erreur suppression like existant :', delError);
      return;
    }
  } else if (error) {
    console.error('Erreur like:', error);
    return;
  }

  await loadStats(postId);
}

// --- FONCTION RÉPONDRE ---
async function sendReply(postId) {
  const inp = document.getElementById(`inp-reply-${postId}`);
  const text = inp.value.trim();
  if (!text) return;

  const { error } = await db.from('post_replies').insert({
    post_id: postId,
    pseudo: STATE.pseudo,
    content: text
  });

  if (error) {
    console.error('Erreur insertion reply:', error);
    return;
  }

  inp.value = "";
  loadStats(postId);
}

async function deletePost(postId) {
  if (!STATE.isAdmin) {
    console.warn('Suppression réservée à l\'admin');
    return;
  }

  if (!confirm('Supprimer ce post définitivement ?')) return;

  const { error } = await db.from('posts').delete().eq('id', postId);
  if (error) {
    console.error('Erreur suppression post :', error);
    return;
  }

  _cachedPosts = _cachedPosts.filter(p => p.id !== postId);
  renderFeedFromCache();
  console.log('Post supprimé', postId);
}

// --- CHARGER LES LIKES ET RÉPONSES ---
async function loadStats(postId) {
  // Compter likes
  const { count: likes } = await db.from('post_likes').select('*', { count: 'exact', head: true }).eq('post_id', postId);
  const likeBtn = document.getElementById(`like-count-${postId}`);
  if (likeBtn) likeBtn.textContent = likes || 0;

  // Charger les réponses
  const { data: replies } = await db.from('post_replies').select('*').eq('post_id', postId).order('created_at', { ascending: true });
  const list = document.getElementById(`replies-list-${postId}`);
  if (list && replies && replies.length > 0) {
    list.innerHTML = replies.map(r => `
      <div class="reply-item">
        <span class="reply-author">${escHtml(r.pseudo)}</span> ${escHtml(r.content)}
      </div>
    `).join('');
  }
}
// ── Boot ──
initSetup();
