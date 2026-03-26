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
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    OneSignalDeferred.push(async function(OneSignal) {
      try {
        // 1. Demander la permission
        const permission = await OneSignal.Notifications.requestPermission();
        
        if (!permission) {
          setNotifStatus("Notifications refusées", "err");
          resolve(false);
          return;
        }

        // 2. Définir les tags (pseudo + thèmes)
        const tags = { pseudo };
        ALL_THEMES.forEach(t => {
          tags[t.id] = prefs.includes(t.id) ? "true" : "false";
        });

        await OneSignal.User.addTags(tags);
        
        setNotifStatus("✓ Notifications activées", "ok");
        console.log("OneSignal configuré avec tags:", tags);
        resolve(true);
        
      } catch (err) {
        console.error("Erreur OneSignal:", err);
        setNotifStatus("Erreur : " + err.message, "err");
        resolve(false);
      }
    });
  });
}

// ── Mettre à jour les tags OneSignal ──
function updateOneSignalTags(prefs) {
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  OneSignalDeferred.push(async function(OneSignal) {
    try {
      const tags = {};
      ALL_THEMES.forEach(t => {
        tags[t.id] = prefs.includes(t.id) ? "true" : "false";
      });
      
      await OneSignal.User.addTags(tags);
      console.log("Tags OneSignal mis à jour:", tags);
    } catch (err) {
      console.error("Erreur mise à jour tags:", err);
    }
  });
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
function startApp() {
  STATE.isAdmin = STATE.pseudo === ADMIN_PSEUDO;
  const btnCompose = document.getElementById("btn-goto-compose");
  if (!STATE.isAdmin) btnCompose.style.display = "none";
  
  updateOneSignalTags(STATE.prefs);
  showScreen("feed");
  initFeed();
  initCompose();
  showInstallBanner();
  // Détection du nombre de personnes en ligne
  const presenceChannel = db.channel('online-users');
  presenceChannel
    .on('presence', { event: 'sync' }, () => {
      const newState = presenceChannel.presenceState();
      const count = Object.keys(newState).length;
      document.getElementById('user-count').textContent = count;
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await presenceChannel.track({ online_at: new Date().toISOString(), user: STATE.pseudo });
      }
    });
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
    if (notifyUsers && STATE.schedType === "now") {
      setPublishStatus("Envoi des notifications...");
      await sendOneSignalNotificationViaAPI(postData);
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

  try {
    const response = await fetch("/api/send-push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: post.title,
        theme: post.theme,
        themeLabel: themeLabel
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Erreur API:", errorData);
      throw new Error("Erreur API: " + (errorData.error || response.statusText));
    }

    const data = await response.json();
    console.log("✓ Notification envoyée via API:", data);
    return data;
    
  } catch(err) {
    console.error("Erreur envoi notification:", err);
    // Ne pas bloquer la publication si les notifications échouent
    console.warn("Les notifications n'ont pas pu être envoyées, mais le post est publié");
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
  document.getElementById(`like-count-${postId}`).textContent = likes || 0;

  // Charger les réponses
  const { data: replies } = await db.from('post_replies').select('*').eq('post_id', postId).order('created_at', { ascending: true });
  const list = document.getElementById(`replies-list-${postId}`);
  if (replies && replies.length > 0) {
    list.innerHTML = replies.map(r => `
      <div class="reply-item">
        <span class="reply-author">${escHtml(r.author)}</span> ${escHtml(r.content)}
      </div>
    `).join('');
  }
}
// ── Boot ──
initSetup();
