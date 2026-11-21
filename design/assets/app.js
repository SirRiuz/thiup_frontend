/* =========================================================================
   THIUP MOCKUP — APP.JS
   Render helpers + interacciones genéricas (menús, modal, tabs, reacciones).
   Todo client-side, cero llamadas de red, cero dependencias. Pensado para
   que cada pantalla en screens/*.html quede corta: arma el layout propio
   en HTML y llama a estas funciones para las piezas repetidas (nav, tarjeta
   de hilo, reacciones, notificación...).
   ========================================================================= */

/* ------------------------------- NAV RAIL ------------------------------- */

const NAV_ITEMS = [
  { page: "home", icon: "home", label: "Inicio", href: "home.html" },
  { page: "search", icon: "search", label: "Buscar", href: "search.html" },
  { page: "notifications", icon: "heart", label: "Notificaciones", href: "notifications.html" },
  { page: "profile", icon: "profile", label: "Mis hilos", href: "profile.html" },
];

function renderNavRail(activePage) {
  const mount = document.getElementById("nav-rail-mount");
  if (!mount) return;
  const [first, second] = NAV_ITEMS;
  const rest = NAV_ITEMS.slice(2);

  const itemHtml = (item) => `
    <a href="${item.href}" class="nav-item spring-press-icon ${item.page === activePage ? "is-active" : ""}" aria-label="${item.label}">
      <span style="position:relative;display:inline-flex;width:24px;height:24px;align-items:center;justify-content:center;">
        ${Icons[item.icon]()}
        ${item.page === "notifications" ? '<span class="nav-badge">3</span>' : ""}
      </span>
      <span class="nav-tooltip">${item.label}</span>
    </a>`;

  mount.innerHTML = `
    <nav class="nav-rail" aria-label="Principal">
      <button type="button" class="nav-rail-logo" onclick="location.href='home.html'" aria-label="Inicio">
        ${Icons.brand(34, "plain")}
      </button>
      <div class="nav-items">
        ${itemHtml(first)}
        ${itemHtml(second)}
        <button type="button" class="nav-item is-create spring-press-icon" aria-label="Nuevo hilo" data-modal-open="compose-modal">
          <span class="nav-create-plate" aria-hidden="true"></span>
          <span style="position:relative;display:inline-flex;">${Icons.create()}</span>
          <span class="nav-tooltip">Nuevo hilo</span>
        </button>
        ${rest.map(itemHtml).join("")}
      </div>
      <div style="position:relative;">
        <button type="button" class="nav-item spring-press-icon" aria-label="Menú" data-menu-toggle="rail-menu">
          ${Icons.more()}
          <span class="nav-tooltip">Menú</span>
        </button>
        <div class="menu-surface" data-menu="rail-menu" hidden style="left:calc(100% + 12px);bottom:0;">
          <button type="button" class="menu-item">Idioma</button>
          <button type="button" class="menu-item">Acerca de</button>
        </div>
      </div>
    </nav>`;
}

/* --------------------------- REACTION STACK ----------------------------- */

/* Reacciones: el glifo SIEMPRE sale de reactionEmojiSVG (reaction-emoji.js —
   puerto 1:1 de ReactionEmoji.js) — nunca del emoji nativo del sistema
   operativo, que varía por plataforma y rompe el diseño (ver CLAUDE.md). */
const REACTION_LABEL = {
  love: "Cariño", laugh: "Risa", wow: "Sorpresa", sad: "Tristeza", angry: "Enojo", applause: "Aplauso",
};
const REACTION_ORDER = ["love", "laugh", "wow", "sad", "angry", "applause"];

function renderReactionStack(reactions) {
  const present = (reactions || []).filter((r) => (r.count || 0) > 0);
  if (present.length === 0) return "";
  const total = present.reduce((s, r) => s + (r.count || 0), 0);
  const ordered = [...present].sort(
    (a, b) => b.count - a.count || REACTION_ORDER.indexOf(a.name) - REACTION_ORDER.indexOf(b.name)
  );
  const top = ordered.slice(0, 3);
  const bubbles = top
    .map((r, i) => `<span class="reaction-bubble" style="z-index:${top.length - i}">${reactionEmojiSVG(r.name, 16)}</span>`)
    .join("");
  return `<span class="reaction-stack" title="${ordered.map((r) => `${REACTION_LABEL[r.name]} ${r.count}`).join(" · ")}">
    <span class="reaction-emojis">${bubbles}</span>
    <span class="reaction-total">${total}</span>
  </span>`;
}

/* `compact`: icono solo, 28px — para la fila de stats del feed (donde hoy
   solo se podía MIRAR el resumen de reacciones, no reaccionar sin abrir el
   hilo). La variante completa (icono + label) sigue siendo la de la barra
   de acciones del hilo/respuestas. */
function renderReactionPicker(contextId, currentReaction, compact = false) {
  const active = currentReaction && REACTION_ORDER.includes(currentReaction) ? currentReaction : null;
  const trigger = compact
    ? (active ? reactionEmojiSVG(active, 18) : Icons.react())
    : active
    ? `<span style="display:inline-flex;">${reactionEmojiSVG(active, 16)}</span><span>${REACTION_LABEL[active]}</span>`
    : `${Icons.react()}<span>Reaccionar</span>`;
  const triggerClass = compact ? "reaction-trigger-compact" : "action-btn";
  // Experimento de "vida" (sandbox): el popover ya no depende de [hidden] —
  // se revela al pasar el mouse (ver components.css) y .is-open (puesto
  // por JS) lo fija al hacer clic/tap. Sigue siendo accesible por teclado:
  // el trigger es un <button> normal.
  return `
    <div class="reaction-picker-wrap ${compact ? "is-compact" : ""}" data-reaction-picker>
      <button type="button" class="${triggerClass} ${active ? "is-active-reaction" : ""}" data-reaction-trigger="${contextId}" aria-label="Reaccionar">
        ${trigger}
      </button>
      <div class="reaction-popover" data-reaction-popover="${contextId}">
        ${REACTION_ORDER.map(
          (id) => `<button type="button" class="reaction-option" title="${REACTION_LABEL[id]}" data-reaction-pick="${id}">${reactionEmojiSVG(id, 26, true)}</button>`
        ).join("")}
      </div>
    </div>`;
}

/* ------------------------------ MEDIA (ThreadMedia) ------------------------ */
/* Calco de ThreadMedia.js real: 1 item = frame "natural" (proporción propia,
   tope de alto, ver `item.ratio`); 2+ = CARRUSEL de scroll horizontal
   (celdas fijas 210×280, gap 6px, sangrado hasta el borde de la card) —
   nunca grid/mosaico fijo como antes (`ThreadMedia_carousel__-7dLp` en la
   app real). "Fotos"/"videos" son ilustraciones vectoriales (illustrations.js,
   ver CLAUDE.md § imágenes de ejemplo) — un video es solo su poster +
   insignias decorativas (reproducir/silenciado): la maqueta no reproduce
   video real (scope reducido, ver CLAUDE.md § Alcance). Contenido sensible
   (`isNsfw`/`isSpoiler`) sale borroso detrás de un pill "Contenido
   sensible"/"Spoiler" — revelar es de una sola vía, como la app real. */

let mediaFrameUidCounter = 0;

function renderMediaFrame(item, variant) {
  mediaFrameUidCounter += 1;
  const frameId = `mf${mediaFrameUidCounter}`;
  const sensitive = !!(item.isNsfw || item.isSpoiler);
  const label = item.isNsfw ? "Contenido sensible" : "Spoiler";
  const isVideo = item.type === "video";
  const style =
    variant === "single"
      ? ` style="aspect-ratio:${item.ratio || 0.8};max-width:min(100%, calc(360px * ${item.ratio || 0.8}));"`
      : "";
  return `
    <div class="tm-frame ${sensitive ? "is-blurred" : ""}" data-media-frame="${frameId}"${style}>
      <div class="tm-media">${illustrationSVG(item.illo)}</div>
      ${isVideo ? `<span class="tm-play" aria-hidden="true">${Icons.play()}</span><span class="tm-sound" aria-hidden="true">${Icons.mute()}</span>` : ""}
      ${sensitive ? `
        <button type="button" class="tm-reveal" data-reveal-frame="${frameId}" aria-label="${label}">
          <span class="tm-reveal-pill" aria-hidden="true">${label}</span>
        </button>` : ""}
    </div>`;
}

function renderMedia(media) {
  if (!media || media.length === 0) return "";
  if (media.length === 1) {
    return `<div class="tm-wrapper"><div class="tm-single">${renderMediaFrame(media[0], "single")}</div></div>`;
  }
  const cells = media.map((item) => `<div class="tm-cell">${renderMediaFrame(item, "cell")}</div>`).join("");
  return `<div class="tm-wrapper"><div class="tm-carousel"><div class="tm-track">${cells}</div></div></div>`;
}

/* ------------------------------ HASHTAGS ---------------------------------- */

function renderTextWithHashtags(text) {
  return String(text).replace(/#([\p{L}0-9_]+)/gu, (m, tag) => `<a href="search.html?q=${encodeURIComponent("#" + tag)}" class="hashtag">#${tag}</a>`);
}

/* ------------------------------ FOLLOW (anónimo) --------------------------- */
/* Experimento de "vida" (sandbox): seguir una MÁSCARA, no una persona real
   — el 80% del valor de "reconocer voces" de FB/Twitter sin tocar la
   promesa de anonimato (ver conversación). En memoria nomás: se resetea al
   recargar. Clave = mask id, así dos tarjetas de la misma máscara quedan
   sincronizadas entre sí (feed + "Para ti"). */
const followedMasks = new Set();

function renderFollowButton(maskId, size) {
  const following = followedMasks.has(maskId);
  const sizeClass = size === "sm" ? "follow-btn-sm" : "";
  return `<button type="button" class="follow-btn ${sizeClass} ${following ? "is-following" : ""}" data-follow-toggle="${maskId}">
    ${following ? Icons.userCheck() : Icons.userPlus()}<span data-follow-label>${following ? "Siguiendo" : "Seguir"}</span>
  </button>`;
}

/* ------------------------------ ENCUESTAS ---------------------------------- */
/* Experimento de "vida" (sandbox): tipo de contenido nuevo, no solo texto/
   foto. "Ciega" hasta votar (como X) — ver el resultado exige participar. */

const pollVotes = {}; // pollUid -> { optionId: votos } (copia en memoria de mock-data, +1 al votar)

function renderPollBody(post) {
  const poll = post.poll;
  if (!pollVotes[post.uid]) {
    pollVotes[post.uid] = {};
    poll.options.forEach((o) => (pollVotes[post.uid][o.id] = o.votes));
  }
  const options = poll.options
    .map(
      (o) => `
      <button type="button" class="poll-option" data-poll-vote="${post.uid}:${o.id}">
        <span class="poll-option-fill" data-poll-fill="${o.id}"></span>
        <span class="poll-option-label">${o.label}</span>
        <span class="poll-option-check" data-poll-check="${o.id}">${Icons.check()}</span>
        <span class="poll-option-pct" data-poll-pct="${o.id}"></span>
      </button>`
    )
    .join("");
  return `
    <div class="poll" id="poll-${post.uid}">
      <div class="poll-options">${options}</div>
      <div class="poll-meta"><span data-poll-total>${poll.totalVotes} votos</span><span class="dot">·</span><span>${poll.closesLabel}</span></div>
    </div>`;
}

/* ------------------------------ FEED CARD --------------------------------- */

function renderMetaTrail(post) {
  const parts = [];
  if (post.isMine) parts.push(`<span class="meta-dot">·</span><span class="meta-tag">Mi hilo</span>`);
  if (post.isEdited) parts.push(`<span class="meta-dot">·</span><span class="meta-tag">Editado</span>`);
  return parts.length ? `<span class="meta-trail">${parts.join("")}</span>` : "";
}

function renderFeedCard(post, opts = {}) {
  const isLast = opts.isLast ? "is-last" : "";
  const isNew = opts.isNew ? "is-new" : "";
  const href = `thread.html?id=${post.uid}`;
  const topReply = post.topReply
    ? `
    <div class="row-grid" style="margin-top:12px;padding-left:0;">
      <div class="avatar-cell">${maskAvatarSVG(post.topReply.mask.id, 36, { online: post.topReply.mask.isOnline })}</div>
      <div class="content-cell">
        <header class="row-header">
          <span class="mask-id">${post.topReply.mask.id}</span>
          <span class="timestamp">${post.topReply.time}</span>
          ${post.topReply.isOp ? `<span class="meta-trail"><span class="meta-dot">·</span><span class="meta-tag">Autor</span></span>` : ""}
          <span style="flex:1"></span>
          <button type="button" class="action-btn spring-press-icon" style="padding:0;width:36px;height:36px;margin:-6px;" data-menu-toggle="menu-${post.uid}-reply" aria-label="Más opciones">${Icons.dots()}</button>
          ${renderOptionsMenu(`menu-${post.uid}-reply`)}
        </header>
        <a href="${href}" style="display:block;">
          <p class="row-body" style="-webkit-line-clamp:3;display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden;">${renderTextWithHashtags(post.topReply.text)}</p>
        </a>
        ${renderMedia(post.topReply.media)}
        <footer class="row-stats">${renderReactionStack(post.topReply.reactions)}</footer>
      </div>
    </div>` : "";

  return `
    <article class="feed-card ${isLast} ${isNew}">
      <button type="button" class="action-btn spring-press-icon" style="position:absolute;top:3px;right:-8px;padding:0;width:36px;height:36px;border-radius:50%;" data-menu-toggle="menu-${post.uid}" aria-label="Más opciones">${Icons.dots()}</button>
      ${renderOptionsMenu(`menu-${post.uid}`)}
      <div class="root-section">
      ${post.topReply ? `<div class="preview-trunk" aria-hidden="true"></div>` : ""}
      <div class="row-grid">
        <div class="avatar-cell">${maskAvatarSVG(post.mask.id, 36, { online: post.mask.isOnline, snapRing: post.isSnap })}</div>
        <div class="content-cell">
          <!-- Antes era un <a> real envolviendo header+cuerpo; con el botón
               de Seguir adentro eso anidaría <button> dentro de <a> (igual
               de inválido que <button> en <button> — ver CLAUDE.md). Ahora
               es un div con role=link + data-nav-href: el handler delegado
               de app.js navega salvo que el clic venga de un control real
               (button/a) — mismo patrón que la app real (navZone + guard). -->
          <div class="nav-zone" data-nav-href="${href}" role="link" tabindex="0" aria-label="Abrir hilo">
            <header class="row-header">
              <span class="mask-id">${post.mask.id}</span>
              <span class="timestamp">${post.time}</span>
              ${renderMetaTrail(post)}
              <span style="flex:1"></span>
            </header>
            <p class="row-body">${renderTextWithHashtags(post.text)}</p>
          </div>
          ${post.type === "poll" ? renderPollBody(post) : renderMedia(post.media)}
          <footer class="row-stats">${renderReactionStack(post.reactions)}</footer>
          <div class="row-meta-actions">
            ${renderReactionPicker(post.uid, post.currentUserReaction, true)}
            <span class="stat-with-icon">${Icons.reply()}${post.repliesCount}</span>
          </div>
        </div>
      </div>
      </div>
      <!-- El preview va FUERA de .root-section (hermano, no hijo): la línea
           de continuidad (bottom:-12px) es relativa al fondo de .root-section
           — si el preview quedara adentro, el fondo de .root-section pasaría
           a ser el fondo del preview y la línea se saldría 12px MÁS ABAJO,
           colgando sin nada que conectar (el bug reportado). Igual que
           HomeFeedCard.js real: .rootSection cierra, LUEGO .replyPreview. -->
      ${topReply}
    </article>`;
}

function renderOptionsMenu(id) {
  return `
    <div class="menu-surface" data-menu="${id}" hidden style="top:calc(100% + 6px);right:-8px;">
      <button type="button" class="menu-item">${Icons.info()}<span style="margin-left:auto"></span>Ver detalles</button>
      <button type="button" class="menu-item">${Icons.share()}Compartir</button>
      <button type="button" class="menu-item" data-copy-link>${Icons.link()}Copiar enlace</button>
      <button type="button" class="menu-item">${Icons.qr()}Código QR</button>
      <div class="menu-divider"></div>
      <button type="button" class="menu-item is-danger">${Icons.flag()}Reportar</button>
    </div>`;
}

/* -------------------------------- REPLY ----------------------------------- */

const STEP = 36, LANE = 18, LINE_W = 2;
const laneLeft = (level) => level * STEP + LANE;
const lineLeft = (level) => laneLeft(level) - LINE_W / 2;

function renderReply(reply) {
  const depth = reply.depth || 0;
  const guides = (reply.guides || [])
    .map((cont, level) => (cont ? `<div class="guide-line" style="left:${lineLeft(level)}px"></div>` : ""))
    .join("");
  const branch = depth >= 1 ? `<div class="branch" style="left:${lineLeft(depth - 1)}px;width:${STEP - 21}px"></div>` : "";
  const trunk = reply.hasChildren ? `<div class="child-trunk" style="left:${lineLeft(depth)}px"></div>` : "";

  return `
    <div class="reply ${reply.dividerBelow ? "with-divider" : ""}" style="padding-left:${depth * STEP}px">
      ${guides}${branch}${trunk}
      <div class="reply-main">
        <div class="avatar-cell">${maskAvatarSVG(reply.mask.id, 36, { online: reply.mask.isOnline })}</div>
        <div class="content-cell">
          <header class="row-header" style="padding-right:0;">
            <span class="mask-id">${reply.mask.id}</span>
            <span class="timestamp">${reply.time}</span>
            ${reply.isOp ? `<span class="author-tag"><span class="meta-dot">·</span>Autor</span>` : ""}
            ${reply.isEdited ? `<span class="author-tag"><span class="meta-dot">·</span>Editado</span>` : ""}
            <span style="flex:1"></span>
            <button type="button" class="action-btn spring-press-icon" style="padding:0;width:36px;height:36px;margin:-6px;" data-menu-toggle="menu-${reply.id}" aria-label="Más opciones">${Icons.dots()}</button>
            ${renderOptionsMenu(`menu-${reply.id}`)}
          </header>
          <p class="reply-body">${renderTextWithHashtags(reply.text)}</p>
          ${renderMedia(reply.media)}
          <footer class="row-stats" style="margin:8px 0 0;">${renderReactionStack(reply.reactions)}</footer>
          <div class="action-bar">
            ${renderReactionPicker(reply.id)}
            <button type="button" class="action-btn">${Icons.reply()}Responder</button>
          </div>
        </div>
      </div>
    </div>`;
}

/* ----------------------------- NOTIFICATIONS ------------------------------- */

const NOTIF_VERB_TEXT = {
  reaction: (n) => (n.isReply ? "reaccionó a tu comentario" : "reaccionó a tu publicación"),
  reply: (n) => (n.isReply ? "respondió tu comentario" : "comentó tu publicación"),
  profile_view: () => "vio tu perfil",
  qr_generate: (n) => (n.isReply ? "generó un código QR de tu comentario" : "generó un código QR de tu publicación"),
};

function renderNotification(n) {
  const avatars = n.actors
    .slice(0, 3)
    .map((a) => `<span class="notif-avatar">${maskAvatarSVG(a.id, 28, { online: a.isOnline })}</span>`)
    .join("");
  const others = Math.max(n.actorCount - 1, 0);
  const verbText = NOTIF_VERB_TEXT[n.verb] ? NOTIF_VERB_TEXT[n.verb](n) : "";
  const reactionIcon = n.reaction ? `<span class="notif-reaction-icon">${reactionEmojiSVG(n.reaction.name, 16)}</span>` : "";
  return `
    <div class="notif-row">
      <button type="button" class="notif-close" aria-label="Descartar notificación">${Icons.close()}</button>
      ${n.isNew ? '<span class="notif-unread-dot"></span>' : ""}
      <span class="notif-avatars">${avatars}</span>
      <div class="notif-body">
        ${reactionIcon}<b>@${n.actors[0].id}</b>${others > 0 ? ` y ${others} más` : ""} ${verbText}
        <div style="color:var(--text-quaternary);font-size:12px;margin-top:2px;">${n.time}</div>
        ${n.threadRef ? `<div class="notif-thread-ref">${n.threadRef}</div>` : ""}
      </div>
    </div>`;
}

/* ------------------------------ TREND ROW ---------------------------------- */

function renderTrendRow(tag, rank) {
  return `
    <button type="button" class="trend-row" onclick="location.href='search.html?q=${encodeURIComponent("#" + tag.name)}'">
      <span class="trend-rank ${rank <= 3 ? "is-top" : ""}">${rank}</span>
      <span class="trend-tile">#</span>
      <span class="trend-info">
        <span class="trend-name">${tag.name}</span>
        <span class="trend-count">${tag.postsCount} publicaciones</span>
      </span>
      <span class="trend-arrow">↗</span>
    </button>`;
}

/* --------------------------------- GLOBAL INTERACTIONS ---------------------- */

document.addEventListener("DOMContentLoaded", () => {
  // Menús desplegables genéricos: [data-menu-toggle] abre/cierra [data-menu].
  document.addEventListener("click", (e) => {
    const toggle = e.target.closest("[data-menu-toggle]");
    if (toggle) {
      e.stopPropagation();
      const id = toggle.getAttribute("data-menu-toggle");
      const menu = document.querySelector(`[data-menu="${id}"]`);
      const wasOpen = menu && !menu.hidden;
      document.querySelectorAll("[data-menu]").forEach((m) => (m.hidden = true));
      if (menu) menu.hidden = wasOpen;
      return;
    }
    // Revelar media sensible (NSFW/spoiler) — de una sola vía, como la app
    // real: una vez tocado el pill, el blur no vuelve (no hay "re-ocultar").
    const revealBtn = e.target.closest("[data-reveal-frame]");
    if (revealBtn) {
      e.stopPropagation();
      const frame = revealBtn.closest("[data-media-frame]");
      if (frame) frame.classList.remove("is-blurred");
      revealBtn.remove();
      return;
    }
    // Reaction picker trigger — el popover ya se revela solo con hover
    // (CSS); el clic lo FIJA (.is-open) para elegir con calma o en touch.
    const reactTrigger = e.target.closest("[data-reaction-trigger]");
    if (reactTrigger) {
      e.stopPropagation();
      const id = reactTrigger.getAttribute("data-reaction-trigger");
      const pop = document.querySelector(`[data-reaction-popover="${id}"]`);
      const wasOpen = pop && pop.classList.contains("is-open");
      document.querySelectorAll("[data-reaction-popover]").forEach((m) => m.classList.remove("is-open"));
      if (pop) pop.classList.toggle("is-open", !wasOpen);
      return;
    }
    // Reaction pick.
    const pick = e.target.closest("[data-reaction-pick]");
    if (pick) {
      e.stopPropagation();
      const popover = pick.closest("[data-reaction-popover]");
      popover.classList.remove("is-open");
      const wrap = popover.closest("[data-reaction-picker]");
      const btn = wrap.querySelector("[data-reaction-trigger]");
      const id = pick.getAttribute("data-reaction-pick");
      btn.classList.add("is-active-reaction");
      btn.innerHTML = wrap.classList.contains("is-compact")
        ? reactionEmojiSVG(id, 18)
        : `<span style="display:inline-flex;">${reactionEmojiSVG(id, 16)}</span><span>${REACTION_LABEL[id]}</span>`;
      return;
    }
    // Seguir / dejar de seguir una máscara (anónimo) — sincroniza TODOS los
    // botones de esa misma máscara en la página (feed + "Para ti ahora").
    const followBtn = e.target.closest("[data-follow-toggle]");
    if (followBtn) {
      e.stopPropagation();
      const maskId = followBtn.getAttribute("data-follow-toggle");
      const nowFollowing = !followedMasks.has(maskId);
      nowFollowing ? followedMasks.add(maskId) : followedMasks.delete(maskId);
      document.querySelectorAll(`[data-follow-toggle="${maskId}"]`).forEach((btn) => {
        btn.classList.toggle("is-following", nowFollowing);
        btn.innerHTML = `${nowFollowing ? Icons.userCheck() : Icons.userPlus()}<span data-follow-label>${nowFollowing ? "Siguiendo" : "Seguir"}</span>`;
      });
      if (nowFollowing) showToast(`Ahora sigues a @${maskId}`);
      return;
    }
    // Votar en una encuesta — "ciega" hasta votar, como X/Twitter; un solo
    // voto por encuesta por sesión.
    const voteBtn = e.target.closest("[data-poll-vote]");
    if (voteBtn) {
      e.stopPropagation();
      const [pollUid, optionId] = voteBtn.getAttribute("data-poll-vote").split(":");
      const container = document.getElementById(`poll-${pollUid}`);
      if (container.hasAttribute("data-voted")) return;
      pollVotes[pollUid][optionId] += 1;
      const total = Object.values(pollVotes[pollUid]).reduce((a, b) => a + b, 0);
      container.setAttribute("data-voted", "");
      Object.entries(pollVotes[pollUid]).forEach(([id, votes]) => {
        const pct = Math.round((votes / total) * 100);
        const fill = container.querySelector(`[data-poll-fill="${id}"]`);
        const pctEl = container.querySelector(`[data-poll-pct="${id}"]`);
        if (fill) fill.style.width = `${pct}%`;
        if (pctEl) pctEl.textContent = `${pct}%`;
      });
      voteBtn.classList.add("is-selected");
      const totalEl = container.querySelector("[data-poll-total]");
      if (totalEl) totalEl.textContent = `${total} votos`;
      return;
    }
    // Copy link (toast demo).
    if (e.target.closest("[data-copy-link]")) {
      showToast("Enlace copiado");
    }
    // Modal open/close.
    const openTrigger = e.target.closest("[data-modal-open]");
    if (openTrigger) {
      const id = openTrigger.getAttribute("data-modal-open");
      const modal = document.getElementById(id);
      if (modal) modal.hidden = false;
      return;
    }
    if (e.target.closest("[data-modal-close]")) {
      const backdrop = e.target.closest(".modal-backdrop");
      if (backdrop) backdrop.hidden = true;
      return;
    }
    if (e.target.matches(".modal-backdrop")) {
      e.target.hidden = true;
      return;
    }
    // Zona navegable (tarjeta de hilo): navega SALVO que el clic venga de
    // un control real (botón/enlace/⋯) dentro de ella — mismo guard que la
    // app real usa en HomeFeedCard.handleCardClick.
    const navZone = e.target.closest("[data-nav-href]");
    if (navZone && !e.target.closest("button, a, [data-no-nav]")) {
      location.href = navZone.getAttribute("data-nav-href");
      return;
    }
    // Everything else: close open menus/popovers.
    document.querySelectorAll("[data-menu]").forEach((m) => (m.hidden = true));
    document.querySelectorAll("[data-reaction-popover]").forEach((m) => m.classList.remove("is-open"));
  });

  // Activación por teclado del nav-zone (Enter/Espacio) — accesible sin
  // depender de que sea un <a> real.
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll("[data-menu]").forEach((m) => (m.hidden = true));
      document.querySelectorAll("[data-reaction-popover]").forEach((m) => m.classList.remove("is-open"));
      document.querySelectorAll(".modal-backdrop").forEach((m) => (m.hidden = true));
      return;
    }
    if (e.key !== "Enter" && e.key !== " ") return;
    const navZone = e.target.closest("[data-nav-href]");
    if (navZone) {
      e.preventDefault();
      location.href = navZone.getAttribute("data-nav-href");
    }
  });

  // Tabs genéricas: [data-tabs] + botones [data-tab] + paneles [data-tab-panel].
  document.querySelectorAll("[data-tabs]").forEach((bar) => {
    const indicator = bar.querySelector(".tab-indicator");
    const place = () => {
      const active = bar.querySelector(".tab.is-active");
      if (!active || !indicator) return;
      indicator.style.width = `${active.offsetWidth}px`;
      indicator.style.transform = `translateX(${active.offsetLeft}px)`;
    };
    place();
    window.addEventListener("resize", place);
    bar.querySelectorAll("[data-tab]").forEach((tab) => {
      tab.addEventListener("click", () => {
        bar.querySelectorAll(".tab").forEach((t) => t.classList.remove("is-active"));
        tab.classList.add("is-active");
        place();
        const group = bar.getAttribute("data-tabs");
        const target = tab.getAttribute("data-tab");
        document.querySelectorAll(`[data-tab-panel-group="${group}"]`).forEach((panel) => {
          panel.hidden = panel.getAttribute("data-tab-panel") !== target;
        });
      });
    });
  });
});

/* --------------------------------- TOAST ------------------------------------ */

function showToast(message) {
  let viewport = document.querySelector(".toast-viewport");
  if (!viewport) {
    viewport = document.createElement("div");
    viewport.className = "toast-viewport";
    document.body.appendChild(viewport);
  }
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  viewport.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}
