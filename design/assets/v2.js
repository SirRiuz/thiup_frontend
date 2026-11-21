/* =========================================================================
   THIUP MOCKUP — V2.JS (compartido por las propuestas screens/*-v2.html)
   Piezas comunes de la segunda pasada: palabras del rail, reacciones como
   chips, botón ⋯ + menú y tarjeta de perfil al hover. Cero red, cero
   dependencias; se carga DESPUÉS de app.js y usa sus helpers (Icons,
   maskAvatarSVG, reactionEmojiSVG, REACTION_ORDER/LABEL, MockData).
   ========================================================================= */

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const plural = (n) => `${n} ${n === 1 ? "respuesta" : "respuestas"}`;
const me = MockData.currentUser;

// Rail de las v2: sustituye a renderNavRail (app.js) en estas pantallas.
// Todos los destinos comparten anatomía: cápsula con el icono + palabra debajo.
function renderRailV2(active) {
  const pill = (inner) => `<span class="v2-rail-pill">${inner}</span>`;
  const link = (page, word, inner) => `
    <a class="v2-rail-item ${page === active ? "is-active" : ""}" href="${page}.html" ${page === active ? 'aria-current="page"' : ""}>
      ${pill(inner)}<span class="v2-rail-word">${word}</span>
    </a>`;
  document.getElementById("nav-rail-mount").innerHTML = `
    <nav class="nav-rail v2-rail" aria-label="Principal">
      <a class="nav-rail-logo" href="home.html" aria-label="Thiup, ir a Inicio">${Icons.brand(32, "plain")}</a>
      <div class="v2-rail-items">
        ${link("home", "Inicio", Icons.home())}
        ${link("search", "Buscar", Icons.search())}
        <button type="button" class="v2-rail-item is-create" data-modal-open="compose-modal" aria-label="Crear un hilo nuevo">
          ${pill(Icons.create())}<span class="v2-rail-word" aria-hidden="true">Crear</span>
        </button>
        ${link("notifications", "Actividad", `${Icons.heart()}<span class="v2-rail-badge" aria-label="3 sin leer">3</span>`)}
        ${link("profile", "Perfil", `<span class="is-avatar" style="display:inline-flex;">${maskAvatarSVG(me.id, 24)}</span>`)}
      </div>
      <div class="v2-rail-more">
        <button type="button" class="v2-rail-item" data-menu-toggle="rail-menu" aria-haspopup="menu">
          ${pill(Icons.more())}<span class="v2-rail-word">Más</span>
        </button>
        <div class="menu-surface v2-menu" data-menu="rail-menu" role="menu" hidden style="left:calc(100% + 4px);bottom:8px;width:200px;">
          <button type="button" class="menu-item" role="menuitem">Idioma</button>
          <button type="button" class="menu-item" role="menuitem">Acerca de</button>
        </div>
      </div>
    </nav>`;
}

/* ---------- Reacciones: chips de un toque + picker para añadir ----------
   Cada pantalla registra en V2Items lo que se puede reaccionar
   (V2Items[id] = { reactions: [{name,count}], mine }). `tail` es lo que la
   pantalla quiera al final de la fila (p. ej. su botón Responder). */
const V2Items = {};
function chipsHTML(id, popName) {
  const n = V2Items[id];
  return n.reactions
    .map((r) => `
      <button type="button" class="v2-chip ${n.mine === r.name ? "is-mine" : ""} ${popName === r.name ? "is-pop" : ""}"
        data-v2-chip="${id}:${r.name}" aria-pressed="${n.mine === r.name}" aria-label="${REACTION_LABEL[r.name]}: ${r.count}">
        ${reactionEmojiSVG(r.name, 16)}<span>${r.count}</span>
      </button>`)
    .join("");
}
function actionsHTML(id, tail = "") {
  return `
    <div class="v2-actions">
      <span class="v2-chips" data-chips="${id}">${chipsHTML(id)}</span>
      <div class="reaction-picker-wrap is-compact">
        <button type="button" class="reaction-trigger-compact" data-v2-rxopen aria-label="Reaccionar">${Icons.react()}</button>
        <div class="reaction-popover" data-reaction-popover="${id}">
          ${REACTION_ORDER.map((name) => `<button type="button" class="reaction-option" title="${REACTION_LABEL[name]}" aria-label="${REACTION_LABEL[name]}" data-v2-pick="${id}:${name}">${reactionEmojiSVG(name, 26, true)}</button>`).join("")}
        </div>
      </div>
      ${tail}
    </div>`;
}
// Una reacción por persona: tocar la tuya la quita; tocar otra la cambia.
function react(id, name, toggleOff) {
  const n = V2Items[id];
  const bump = (rx, d) => {
    let r = n.reactions.find((x) => x.name === rx);
    if (!r) n.reactions.push((r = { name: rx, count: 0 }));
    r.count += d;
  };
  if (n.mine === name) {
    if (!toggleOff) return;
    bump(name, -1);
    n.mine = null;
  } else {
    if (n.mine) bump(n.mine, -1);
    bump(name, 1);
    n.mine = name;
  }
  n.reactions = n.reactions.filter((r) => r.count > 0);
  document.querySelector(`[data-chips="${id}"]`).innerHTML = chipsHTML(id, n.mine);
}


// Iconos del menú: mismo trazo para todos (en app.js conviven contorno y relleno).
const mi = (d) => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const MENU_ICONS = {
  info: mi('<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 7.5h.01"/>'),
  link: mi('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'),
  qr: mi('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M14 14h3v3h-3zM21 14v.01M14 21v.01M21 21v-3.5M17.5 21H18"/>'),
  flag: mi('<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>'),
};
// Botón ⋯ + su menú como HERMANOS dentro de un ancla (regla 10).
const dotsBtn = (id) => `
  <div class="v2-menu-wrap">
    <button type="button" class="v2-dots" data-menu-toggle="menu-${id}" aria-haspopup="menu" aria-label="Más opciones">${Icons.dots()}</button>
    <div class="menu-surface v2-menu" data-menu="menu-${id}" role="menu" hidden style="top:calc(100% + 4px);right:0;">
      <button type="button" class="menu-item" role="menuitem">Ver detalles${MENU_ICONS.info}</button>
      <button type="button" class="menu-item" role="menuitem" data-copy-link>Copiar enlace${MENU_ICONS.link}</button>
      <button type="button" class="menu-item" role="menuitem">Código QR${MENU_ICONS.qr}</button>
      <div class="menu-divider"></div>
      <button type="button" class="menu-item is-danger" role="menuitem">Reportar${MENU_ICONS.flag}</button>
    </div>
  </div>`;

const profileHref = (maskId) => (maskId === me.id ? "profile.html" : "public-profile.html");


/* ---------- Clics de reacciones ----------
   Se registra ANTES que el listener de app.js (que espera a
   DOMContentLoaded); corta con stopImmediatePropagation para que el
   genérico no cierre lo recién abierto. */
document.addEventListener("click", (e) => {
  const hit = (sel) => e.target.closest(sel);
  const done = () => e.stopImmediatePropagation();
  let el;
  if ((el = hit("[data-v2-chip]"))) {
    const [id, name] = el.dataset.v2Chip.split(":");
    react(id, name, true);
    return done();
  }
  if ((el = hit("[data-v2-pick]"))) {
    const [id, name] = el.dataset.v2Pick.split(":");
    react(id, name, false);
    const wrap = el.closest(".reaction-picker-wrap");
    wrap.querySelector(".reaction-popover").classList.remove("is-open");
    wrap.classList.add("v2-picked");
    wrap.addEventListener("mouseleave", () => wrap.classList.remove("v2-picked"), { once: true });
    return done();
  }
  if ((el = hit("[data-v2-rxopen]"))) {
    const pop = el.nextElementSibling;
    const wasOpen = pop.classList.contains("is-open");
    document.querySelectorAll("[data-reaction-popover]").forEach((p) => p.classList.remove("is-open"));
    pop.classList.toggle("is-open", !wasOpen);
    return done();
  }
});

/* ---------- Tarjeta de perfil al pasar por un avatar o un nombre ([data-profile]) ----------
   La pantalla puede afinar V2Profile: quién está en línea, qué papel
   tiene esa máscara aquí, y cuánto tapa algo fijo abajo. */
const V2Profile = { online: () => false, role: () => "", bottomInset: 0 };
// Cifras de ejemplo derivadas del id (misma máscara → mismas cifras). Maqueta: sin red.
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
function profileOf(maskId) {
  const h = parseInt(maskId, 16) || 7;
  const online = V2Profile.online(maskId) || (maskId === me.id && me.isOnline);
  return { posts: (h % 37) + 2, replies: ((h >> 5) % 80) + 4, joined: `${MONTHS[(h >> 3) % 12]} de ${2023 + ((h >> 9) % 4)}`, online };
}
const pcard = document.createElement("div");
pcard.className = "v2-pcard";
pcard.id = "pcard";
document.body.appendChild(pcard);
let pcShow, pcHide, pcFor = null;

function openProfile(trigger) {
  const maskId = trigger.dataset.profile;
  const pr = profileOf(maskId);
  const role = maskId === me.id ? "Tú" : V2Profile.role(maskId);
  const sub = [pr.online ? `<i class="v2-pcard-live"></i>En línea` : "Anónimo", role].filter(Boolean).join(`<span class="meta-dot">·</span>`);
  pcard.innerHTML = `
    <div class="v2-pcard-top">
      ${maskAvatarSVG(maskId, 56)}
      <div style="min-width:0;"><p class="v2-pcard-name">${maskId}</p><p class="v2-pcard-sub">${sub}</p></div>
    </div>
    <div class="v2-pcard-stats">
      <div class="v2-pcard-stat"><b>${pr.posts}</b><span>publicaciones</span></div>
      <div class="v2-pcard-stat"><b>${pr.replies}</b><span>respuestas</span></div>
    </div>
    <div class="v2-pcard-foot">
      <span>Desde ${pr.joined}</span>
      <a class="v2-pcard-cta" href="${profileHref(maskId)}">Ver perfil${Icons.chevronDown()}</a>
    </div>`;
  // Anclada al avatar de esa fila: el avatar de la tarjeta cae bajo el que señalaste.
  const row = trigger.closest(".reply-main, .op-header, .row-grid") || trigger;
  const anchor = (row.querySelector("svg") || trigger).getBoundingClientRect();
  const W = pcard.offsetWidth, H = pcard.offsetHeight, GAP = 8;
  const left = Math.max(12, Math.min(anchor.left - 16, window.innerWidth - W - 12));
  const below = anchor.bottom + GAP + H < window.innerHeight - V2Profile.bottomInset;
  const top = below ? anchor.bottom + GAP : anchor.top - GAP - H;
  pcard.style.left = `${left + window.scrollX}px`;
  pcard.style.top = `${top + window.scrollY}px`;
  // Nace del avatar: el origen de la escala es su centro.
  pcard.style.transformOrigin = `${anchor.left + anchor.width / 2 - left}px ${below ? -GAP - anchor.height / 2 : H + GAP + anchor.height / 2}px`;
  pcard.classList.add("is-open");
  pcFor = maskId;
}
function closeProfile() {
  clearTimeout(pcShow);
  pcard.classList.remove("is-open");
  pcFor = null;
}
document.addEventListener("mouseover", (e) => {
  const trigger = e.target.closest("[data-profile]");
  if (trigger) {
    clearTimeout(pcHide);
    clearTimeout(pcShow);
    if (pcFor === trigger.dataset.profile) return;
    // Si ya hay una abierta, pasar a otra persona es inmediato; la primera espera 300ms.
    pcShow = setTimeout(() => openProfile(trigger), pcFor ? 60 : 300);
  } else if (e.target.closest("#pcard")) {
    clearTimeout(pcHide); // zona segura: puedes entrar a la tarjeta
  }
});
document.addEventListener("mouseout", (e) => {
  if (!e.target.closest("[data-profile], #pcard")) return;
  if (e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest("[data-profile], #pcard")) return;
  clearTimeout(pcShow);
  pcHide = setTimeout(closeProfile, 150);
});
document.addEventListener("focusin", (e) => { const t = e.target.closest("a[data-profile]"); if (t && t.matches(":focus-visible")) openProfile(t); });
document.addEventListener("focusout", (e) => { if (e.target.closest("a[data-profile]") && !(e.relatedTarget && e.relatedTarget.closest("#pcard"))) closeProfile(); });
document.addEventListener("keydown", (e) => e.key === "Escape" && closeProfile());
window.addEventListener("scroll", () => pcFor && closeProfile(), { passive: true });

/* ---------- Video: reproducir al centro + barra de progreso con tiempos ----------
   Envuelve renderMediaFrame (app.js) para cambiar, SOLO en las pantallas v2,
   el disco oscuro + pastilla de silencio por estos controles. La maqueta no
   reproduce video real: el avance es simulado (requestAnimationFrame). */
const vidTime = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
const renderMediaFrameBase = renderMediaFrame;
renderMediaFrame = function (item, variant) {
  const html = renderMediaFrameBase(item, variant);
  if (item.type !== "video") return html;
  const dur = item.duration || 48;
  return html.replace(/<span class="tm-play"[\s\S]*?<\/span><span class="tm-sound"[\s\S]*?<\/span>/, `
    <div class="v2-vid" data-vid data-dur="${dur}">
      <button type="button" class="v2-vid-play" aria-label="Reproducir o pausar">
        <span class="is-play">${Icons.play()}</span>
        <svg class="is-pause" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4.2" height="14" rx="1.2"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.2"/></svg>
      </button>
      <div class="v2-vid-bar">
        <div class="v2-vid-track" data-vid-track role="slider" tabindex="0" aria-label="Posición del video" aria-valuemin="0" aria-valuemax="${dur}" aria-valuenow="0">
          <span class="v2-vid-fill"></span><span class="v2-vid-knob"></span>
        </div>
        <div class="v2-vid-times"><span data-vid-now>0:00</span><span>${vidTime(dur)}</span></div>
      </div>
    </div>`);
};

const vidPlaying = new Set();
function vidSeek(v, t) {
  const dur = +v.dataset.dur;
  v._t = Math.max(0, Math.min(t, dur));
  v.style.setProperty("--p", `${(v._t / dur) * 100}%`);
  v.querySelector("[data-vid-now]").textContent = vidTime(v._t);
  v.querySelector("[data-vid-track]").setAttribute("aria-valuenow", Math.round(v._t));
}
function vidToggle(v, play = !vidPlaying.has(v)) {
  v.classList.toggle("is-playing", play);
  if (!play) return void vidPlaying.delete(v);
  if ((v._t || 0) >= +v.dataset.dur) vidSeek(v, 0);
  const idle = vidPlaying.size === 0;
  vidPlaying.add(v);
  v._last = performance.now();
  if (idle) requestAnimationFrame(vidTick);
}
function vidTick(now) {
  vidPlaying.forEach((v) => {
    if (!v.isConnected) return void vidPlaying.delete(v);
    if (!v._drag) vidSeek(v, (v._t || 0) + (now - v._last) / 1000);
    v._last = now;
    if (v._t >= +v.dataset.dur) vidToggle(v, false); // llegó al final
  });
  if (vidPlaying.size) requestAnimationFrame(vidTick);
}
// Arrastre 1:1 sobre la barra (el tirador sigue al puntero; no espera a soltar).
const vidAt = (track, e) => { const r = track.getBoundingClientRect(); return ((e.clientX - r.left) / r.width) * +track.closest("[data-vid]").dataset.dur; };
document.addEventListener("pointerdown", (e) => {
  const track = e.target.closest("[data-vid-track]");
  if (!track) return;
  const v = track.closest("[data-vid]");
  track.setPointerCapture(e.pointerId);
  track.classList.add("is-dragging");
  v._drag = true;
  vidSeek(v, vidAt(track, e));
});
document.addEventListener("pointermove", (e) => {
  const track = e.target.closest && e.target.closest("[data-vid-track].is-dragging");
  if (track) vidSeek(track.closest("[data-vid]"), vidAt(track, e));
});
const vidDrop = (e) => {
  const track = e.target.closest && e.target.closest("[data-vid-track].is-dragging");
  if (!track) return;
  track.classList.remove("is-dragging");
  track.closest("[data-vid]")._drag = false;
};
document.addEventListener("pointerup", vidDrop);
document.addEventListener("pointercancel", vidDrop);
document.addEventListener("keydown", (e) => {
  const track = e.target.closest && e.target.closest("[data-vid-track]");
  if (!track || !["ArrowLeft", "ArrowRight"].includes(e.key)) return;
  e.preventDefault();
  const v = track.closest("[data-vid]");
  vidSeek(v, (v._t || 0) + (e.key === "ArrowRight" ? 5 : -5));
});
document.addEventListener("click", (e) => {
  const v = e.target.closest("[data-vid]");
  if (!v) return;
  e.stopImmediatePropagation(); // no abre el hilo ni cierra nada
  if (!e.target.closest("[data-vid-track]")) vidToggle(v);
});

/* ---------- Repost ----------
   Estado en V2Items[id]: `reposts` (cifra) y `reposted` (si lo hiciste tú).
   El botón abre un menú (lo abre/cierra el genérico de app.js vía
   data-menu-toggle). La pantalla decide qué pasa después con dos ganchos:
   onToggle(id, hecho) y onQuote(id, el) — sin onQuote no se ofrece "Citar". */
const V2Repost = { onToggle: null, onQuote: null };
const RP_ICON = mi('<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>');
const QUOTE_ICON = mi('<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>');
function repostBtn(id) {
  const it = V2Items[id];
  return `<span class="v2-rp-wrap" data-rp-wrap="${id}">
    <button type="button" class="v2-reply-btn ${it.reposted ? "is-on" : ""}" data-menu-toggle="rp-${id}" aria-haspopup="menu">${RP_ICON}${it.reposted ? "Reposteado" : "Repostear"}<span class="v2-reply-n">${it.reposts || ""}</span></button>
    <div class="menu-surface v2-menu v2-rp-menu" data-menu="rp-${id}" role="menu" hidden style="top:calc(100% + 4px);left:0;">
      <button type="button" class="menu-item" role="menuitem" data-rp-do="${id}">${it.reposted ? "Deshacer repost" : "Repostear"}${RP_ICON}</button>
      ${V2Repost.onQuote ? `<button type="button" class="menu-item" role="menuitem" data-rp-quote="${id}">Citar${QUOTE_ICON}</button>` : ""}
    </div>
  </span>`;
}
function repostRefresh(id) {
  const wrap = document.querySelector(`[data-rp-wrap="${id}"]`);
  if (wrap && V2Items[id]) wrap.outerHTML = repostBtn(id);
}
// No corta la propagación: el listener genérico de app.js cierra el menú.
document.addEventListener("click", (e) => {
  let el;
  if ((el = e.target.closest("[data-rp-do]"))) {
    const id = el.dataset.rpDo, it = V2Items[id];
    it.reposted = !it.reposted;
    it.reposts = (it.reposts || 0) + (it.reposted ? 1 : -1);
    repostRefresh(id);
    if (V2Repost.onToggle) V2Repost.onToggle(id, it.reposted);
    const fresh = document.querySelector(`[data-rp-wrap="${id}"] .v2-reply-btn`);
    if (fresh && it.reposted) fresh.classList.add("is-spin"); // el icono da media vuelta al confirmar
    showToast(it.reposted ? "Reposteado" : "Repost deshecho");
  } else if ((el = e.target.closest("[data-rp-quote]"))) {
    V2Repost.onQuote(el.dataset.rpQuote, el.closest(".v2-rp-wrap"));
  }
});

/* ---------- Hilo temporal: cuánto le queda ----------
   Sustituye al aro alrededor del avatar (que se leía como "tiene una
   historia/estado"). Va junto a la hora, porque ES un dato de tiempo: un
   relojito que se va vaciando + "Se borra en 6 h". Con menos de una hora
   pasa a terracota. Datos: post.isSnap, snapLeftMin, snapTotalMin. */
function ttlBadge(post) {
  if (!post.isSnap) return "";
  const left = post.snapLeftMin ?? 300, total = post.snapTotalMin ?? 1440;
  const text = left >= 60 ? `${Math.round(left / 60)} h` : `${left} min`;
  const C = 2 * Math.PI * 5.5; // circunferencia del aro
  return `
    <span class="v2-ttl ${left < 60 ? "is-soon" : ""}" title="Hilo temporal: se borra solo cuando se acaba su tiempo">
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
        <circle class="is-track" cx="7" cy="7" r="5.5"/>
        <circle class="is-left" cx="7" cy="7" r="5.5" transform="rotate(-90 7 7)" stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="${(C * (1 - left / total)).toFixed(2)}"/>
      </svg>
      <span>Se borra en ${text}</span>
    </span>`;
}

/* ---------- Tarjeta de hilo del feed (Inicio y Perfil) ---------- */
const PIN_ICON = mi('<path d="M12 17v5"/><path d="M9 3h6l-1 6 3 3v2H7v-2l3-3-1-6Z"/>');
// Todo lo que se puede reaccionar se registra en V2Items (v2.js).
function register(post) {
  post.mine = post.currentUserReaction || null;
  post.reactions = post.reactions || [];
  V2Items[post.uid] = post;
  if (post.topReply) {
    post.topReply.reactions = post.topReply.reactions || [];
    V2Items[`${post.uid}-top`] = post.topReply;
  }
  return post;
}
const identity = (mask, time, extra = "") => `
  <a class="mask-id" href="${profileHref(mask.id)}" data-profile="${mask.id}">${mask.id}</a>
  <span class="timestamp">${time}</span>${extra}
  <span style="flex:1"></span>`;

// Hilo citado: una tarjeta pequeña DENTRO de la tarjeta (avatar mini,
// nombre, 3 líneas, primera foto). `preview` = dentro del editor, no navega.
function quoteHTML(q, preview) {
  const nav = preview ? "" : `data-nav-href="thread-v2.html?id=${q.uid}" role="link" tabindex="0" aria-label="Abrir el hilo citado"`;
  return `
    <div class="v2-quote ${preview ? "" : "nav-zone"}" ${nav}>
      <div class="v2-quote-body">
        <div class="v2-quote-head">${maskAvatarSVG(q.mask.id, 20)}<span class="mask-id" style="text-decoration:none;">${q.mask.id}</span><span class="timestamp">${q.time}</span></div>
        <p class="row-body">${esc(q.text)}</p>
      </div>
      ${quoteMediaHTML(q.media)}
    </div>`;
}

// Lo adjunto del hilo citado, en pequeño y a sangre con la tarjeta: 1 pieza
// entera, 2 mitades, o 3 con una principal y dos apiladas (si hay más, la
// última dice "+N"); un video muestra su disco y su duración.
// Es una vista previa: no se reproduce ni se desliza aquí, se abre el hilo.
function quoteMediaHTML(media) {
  if (!media || !media.length) return "";
  const shown = media.slice(0, 3), extra = media.length - shown.length;
  return `
    <div class="v2-qm" style="--n:${shown.length}">
      ${shown.map((m, i) => `
        <span class="v2-qm-tile">
          ${illustrationSVG(m.illo)}
          ${m.type === "video" ? `<span class="v2-qm-play" aria-hidden="true">${Icons.play()}</span><span class="v2-qm-dur">${vidTime(m.duration || 48)}</span>` : ""}
          ${extra > 0 && i === shown.length - 1 ? `<span class="v2-qm-more">+${extra}</span>` : ""}
        </span>`).join("")}
    </div>`;
}

// opts.uid / opts.by: un repost MÍO vuelve a pintar el mismo hilo bajo otro id.
function cardHTML(post, opts = {}) {
  const uid = opts.uid || post.uid;
  const by = opts.by || post.repostedBy;
  const href = `thread-v2.html?id=${post.uid}`;
  const top = opts.uid ? null : post.topReply;
  const reply = `<a class="v2-reply-btn" href="${href}">${Icons.reply()}Responder<span class="v2-reply-n">${post.repliesCount || ""}</span></a>`;
  return `
    <article class="v2-card" id="c-${uid}">
      ${post.pinned ? `
      <div class="v2-card-context is-pin">${PIN_ICON}<span>Fijado</span></div>` : ""}
      ${post.replyTo ? `
      <div class="v2-card-context is-pin">${Icons.reply()}<span>En respuesta a <a class="mask-id" href="${profileHref(post.replyTo.id)}" data-profile="${post.replyTo.id}">${post.replyTo.id}</a></span></div>` : ""}
      ${by ? `
      <div class="v2-card-context">${RP_ICON}<span>${by.id === me.id ? "Reposteaste" : `<a class="mask-id" href="${profileHref(by.id)}" data-profile="${by.id}">${by.id}</a> reposteó`}</span></div>` : ""}
      <div class="root-section">
        ${top ? `<div class="preview-trunk" aria-hidden="true"></div>` : ""}
        <div class="row-grid">
          <div class="avatar-cell"><span data-profile="${post.mask.id}">${maskAvatarSVG(post.mask.id, 36, { online: post.mask.isOnline })}</span></div>
          <div class="content-cell">
            <header class="row-header">
              ${identity(post.mask, post.time, renderMetaTrail(post) + ttlBadge(post))}
              ${dotsBtn(uid)}
            </header>
            <!-- Zona navegable: abre el hilo salvo que el clic venga de un control real (ver app.js). -->
            <div class="nav-zone" data-nav-href="${href}" role="link" tabindex="0" aria-label="Abrir hilo">
              <p class="row-body">${renderTextWithHashtags(esc(post.text))}</p>
            </div>
            ${post.type === "poll" ? renderPollBody(post) : renderMedia(post.media)}
            ${post.quote ? quoteHTML(post.quote) : ""}
            ${actionsHTML(uid, reply + repostBtn(uid))}
          </div>
        </div>
      </div>
      ${top ? `
      <div class="row-grid v2-card-reply">
        <div class="avatar-cell"><span data-profile="${top.mask.id}">${maskAvatarSVG(top.mask.id, 36, { online: top.mask.isOnline })}</span></div>
        <div class="content-cell">
          <header class="row-header">
            ${identity(top.mask, top.time, top.isOp ? `<span class="meta-trail"><span class="meta-dot">·</span><span class="meta-tag v2-role">Autor</span></span>` : "")}
            ${dotsBtn(`${post.uid}-top`)}
          </header>
          <div class="nav-zone" data-nav-href="${href}" role="link" tabindex="0" aria-label="Abrir la respuesta">
            <p class="row-body" style="-webkit-line-clamp:3;display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden;">${renderTextWithHashtags(esc(top.text))}</p>
          </div>
          ${renderMedia(top.media)}
          ${actionsHTML(`${post.uid}-top`)}
        </div>
      </div>` : ""}
    </article>`;
}
