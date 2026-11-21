/* =========================================================================
   THIUP MOCKUP — ICONS
   SVGs calcados de los componentes reales (NavRail, PostOptionsMenu,
   PostSortMenu, PostCommentBox, PostReactionPicker, BrandLogo...). Todo son
   funciones que devuelven un string de markup — sin dependencias, sin red.
   ========================================================================= */

const Icons = {
  brand(size = 34, variant = "plain") {
    const accent = variant === "plain" ? "var(--brand-terracotta)" : "var(--bg-page)";
    const tile = variant !== "plain"
      ? `<rect width="68" height="68" rx="17" fill="var(--brand-terracotta)"/>`
      : "";
    const viewBox = variant === "plain" ? "13 12 44 44" : "0 0 68 68";
    return `<svg width="${size}" height="${size}" viewBox="${viewBox}" aria-hidden="true">
      ${tile}
      <path d="M24 17.5 Q46 25.75 24 34 Q46 42.25 24 50.5" fill="none" stroke="${accent}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="44.5" cy="19" r="4.5" fill="${accent}"/>
    </svg>`;
  },

  home() {
    return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path clip-rule="evenodd" fill-rule="evenodd" fill="currentColor" d="M13.4056 3.72522C12.5838 3.06783 11.4162 3.06783 10.5944 3.72522L4.28209 8.7751C3.62975 9.29697 3.25 10.0871 3.25 10.9225V18C3.25 19.5188 4.48122 20.75 6 20.75H18C19.5188 20.75 20.75 19.5188 20.75 18V10.9225C20.75 10.0871 20.3703 9.29697 19.7179 8.7751L13.4056 3.72522ZM9.0327 1.77305C10.7675 0.385221 13.2325 0.38522 14.9673 1.77305L21.2796 6.82293C22.525 7.81923 23.25 9.32762 23.25 10.9225V18C23.25 20.8995 20.8995 23.25 18 23.25H6C3.1005 23.25 0.75 20.8995 0.75 18V10.9225C0.75 9.32763 1.47497 7.81923 2.72035 6.82293L9.0327 1.77305Z"/></svg>`;
  },
  search() {
    return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path clip-rule="evenodd" fill-rule="evenodd" fill="currentColor" d="M11.2607 1.01074C5.59982 1.01074 1.01074 5.59982 1.01074 11.2607C1.01074 16.9217 5.59982 21.5107 11.2607 21.5107C13.6407 21.5107 15.8312 20.6996 17.5709 19.3387L20.8554 22.6231C21.3435 23.1113 22.135 23.1113 22.6231 22.6231C23.1113 22.135 23.1113 21.3435 22.6231 20.8554L19.3387 17.5709C20.6996 15.8312 21.5107 13.6407 21.5107 11.2607C21.5107 5.59982 16.9217 1.01074 11.2607 1.01074ZM3.51074 11.2607C3.51074 6.98053 6.98054 3.51074 11.2607 3.51074C15.5409 3.51074 19.0107 6.98053 19.0107 11.2607C19.0107 15.541 15.5409 19.0107 11.2607 19.0107C6.98054 19.0107 3.51074 15.541 3.51074 11.2607Z"/></svg>`;
  },
  heart() {
    return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path fill="currentColor" d="M16.4045 1.50879C14.785 1.50879 13.2185 2.16259 12 3.30764C10.7815 2.16259 9.215 1.50879 7.5955 1.50879C3.41766 1.50879 0.5 4.62796 0.5 9.09411C0.5 13.7857 4.70617 18.9703 11.2153 22.3022C11.4605 22.428 11.7298 22.4912 11.9995 22.4912C12.2692 22.4912 12.5395 22.428 12.7847 22.3022C19.2938 18.9703 23.5 13.7857 23.5 9.09411C23.5 4.62796 20.5823 1.50879 16.4045 1.50879ZM12 19.9518C6.65166 17.1137 2.94684 12.6864 2.94684 9.09411C2.94684 5.97251 4.77133 3.95556 7.5955 3.95556C9.825 3.95556 11.0773 5.80961 12 7.26504C12.9227 5.80961 14.175 3.95556 16.4045 3.95556C19.2287 3.95556 21.0532 5.97251 21.0532 9.09411C21.0532 12.6864 17.3483 17.1137 12 19.9518Z"/></svg>`;
  },
  profile() {
    return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path clip-rule="evenodd" fill-rule="evenodd" fill="currentColor" d="M12 0.75C8.82431 0.75 6.25 3.32437 6.25 6.5C6.25 9.67563 8.82431 12.25 12 12.25C15.1757 12.25 17.75 9.67563 17.75 6.5C17.75 3.32437 15.1757 0.75 12 0.75ZM8.75 6.5C8.75 4.70507 10.205 3.25 12 3.25C13.795 3.25 15.25 4.70507 15.25 6.5C15.25 8.29493 13.795 9.75 12 9.75C10.205 9.75 8.75 8.29493 8.75 6.5Z"/><path fill="currentColor" d="M12.0003 13.75C6.97423 13.75 2.73384 17.086 1.30779 21.6254C1.10089 22.284 1.46707 22.9856 2.1257 23.1925C2.78432 23.3994 3.48596 23.0333 3.69287 22.3746C4.80482 18.835 8.10976 16.25 12.0003 16.25C15.8909 16.25 19.1958 18.835 20.3078 22.3746C20.5147 23.0333 21.2163 23.3994 21.8749 23.1925C22.5336 22.9856 22.8997 22.284 22.6928 21.6254C21.2668 17.086 17.0264 13.75 12.0003 13.75Z"/></svg>`;
  },
  create() {
    return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path fill="currentColor" d="M13.25 3.00001C13.25 2.30965 12.6904 1.75001 12 1.75001C11.3096 1.75001 10.75 2.30965 10.75 3.00001V10.75H3C2.30964 10.75 1.75 11.3097 1.75 12C1.75 12.6904 2.30964 13.25 3 13.25H10.75V21C10.75 21.6904 11.3096 22.25 12 22.25C12.6904 22.25 13.25 21.6904 13.25 21V13.25H21C21.6904 13.25 22.25 12.6904 22.25 12C22.25 11.3097 21.6904 10.75 21 10.75H13.25V3.00001Z"/></svg>`;
  },
  more() {
    return `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="3" y="7" width="21" height="2.5" rx="1.25"/><rect x="3" y="15" width="14" height="2.5" rx="1.25"/></svg>`;
  },
  dots() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path clip-rule="evenodd" fill-rule="evenodd" d="M4 14C5.10457 14 6 13.1046 6 12C6 10.8954 5.10457 10 4 10C2.89543 10 2 10.8954 2 12C2 13.1046 2.89543 14 4 14ZM14 12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12C10 10.8954 10.8954 10 12 10C13.1046 10 14 10.8954 14 12ZM22 12C22 13.1046 21.1046 14 20 14C18.8954 14 18 13.1046 18 12C18 10.8954 18.8954 10 20 10C21.1046 10 22 10.8954 22 12Z"/></svg>`;
  },
  reply() {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`;
  },
  react() {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`;
  },
  back() {
    return `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M1 6h10M1 6l4-4M1 6l4 4" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/></svg>`;
  },
  // Calcados de ThreadMedia.js (PlayIcon/SpeakerIcon) — insignias decorativas
  // sobre el poster de un video; la maqueta no reproduce video real.
  play() {
    return `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.54.84l10-6.5a1 1 0 0 0 0-1.68l-10-6.5A1 1 0 0 0 8 5.5Z"/></svg>`;
  },
  mute() {
    return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M22 9l-6 6M16 9l6 6"/></svg>`;
  },
  sort() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9.29 15.74 7 18.03V3.436a1 1 0 0 0-2 0v14.599l-2.296-2.295a1 1 0 0 0-1.414 1.414l4.002 4a1.001 1.001 0 0 0 1.416 0l3.996-4A1 1 0 0 0 9.29 15.74zm13.42-9.012-4.002-4a1 1 0 0 0-1.416 0l-3.997 4a1 1 0 0 0 1.414 1.414L17 5.849v14.597a1 1 0 0 0 2 0V5.848l2.295 2.294a1 1 0 1 0 1.414-1.414z"/></svg>`;
  },
  chevronDown() {
    return `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.70703 8.29297C21.09755 8.68349 21.09755 9.31651 20.70703 9.70703L12.707 17.707C12.3165 18.0976 11.6835 18.0976 11.293 17.707L3.293 9.70703C2.9024 9.31651 2.9024 8.68349 3.293 8.29297C3.6835 7.90245 4.3165 7.90245 4.707 8.29297L12 15.5859L19.29297 8.29297C19.68349 7.90245 20.31651 7.90245 20.70703 8.29297Z"/></svg>`;
  },
  check() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.293 5.29297C20.6835 4.90245 21.3165 4.90245 21.707 5.29297C22.0975 5.68349 22.0975 6.31651 21.707 6.70703L9.70702 18.707C9.31649 19.0976 8.68348 19.0976 8.29295 18.707L2.29295 12.707C1.90243 12.3165 1.90243 11.6835 2.29295 11.293C2.65907 10.9269 3.23807 10.9043 3.63084 11.2246L3.70702 11.293L8.99999 16.5859L20.293 5.29297Z"/></svg>`;
  },
  info() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M12 11v5"/><path d="M12 7.5h.01"/></svg>`;
  },
  link() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.21806 9.21699C4.6086 8.82701 5.24177 8.82671 5.63212 9.21699C6.02227 9.60735 6.02206 10.2406 5.63212 10.6311L4.60282 11.6603C2.53307 13.7303 2.46839 17.0452 4.40849 19.1926L4.60282 19.3967L4.80693 19.591C6.95427 21.5317 10.2696 21.4666 12.3392 19.3967L13.3684 18.3674C13.7591 17.9773 14.3932 17.9779 14.7835 18.3684C15.1735 18.7589 15.1727 19.3921 14.7825 19.7824L13.7532 20.8117L13.7522 20.8107C10.8349 23.7283 6.10597 23.7285 3.18876 20.8107C0.270964 17.8934 0.271164 13.1641 3.18876 10.2463L4.21806 9.21699Z"/><path d="M15.2933 7.29316C15.6838 6.90272 16.3168 6.90269 16.7073 7.29316C17.0976 7.68368 17.0977 8.31678 16.7073 8.70722L8.70732 16.7072C8.31688 17.0976 7.68379 17.0975 7.29325 16.7072C6.90274 16.3167 6.90276 15.6837 7.29325 15.2932L15.2933 7.29316Z"/><path d="M10.5247 2.92402C13.4571 0.273656 17.9845 0.362116 20.8108 3.18867L21.0765 3.46699C23.6409 6.30485 23.6406 10.6365 21.0765 13.4748L20.8108 13.7541L19.7825 14.7824C19.392 15.1726 18.7589 15.1728 18.3685 14.7824C17.9782 14.392 17.9783 13.7589 18.3685 13.3684L19.3968 12.34L19.5911 12.1359C21.4693 10.0573 21.4691 6.88499 19.5911 4.80683L19.3968 4.60273C17.3272 2.53299 14.0118 2.46786 11.8645 4.4084L11.6604 4.60273L10.6311 5.63203C10.2406 6.02207 9.60744 6.02225 9.21708 5.63203C8.82685 5.24151 8.82682 4.60742 9.21708 4.21699L10.2464 3.18867L10.5247 2.92402Z"/></svg>`;
  },
  flag() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.001 15.0625C12.6223 15.0625 13.126 15.5662 13.126 16.1875C13.126 16.8088 12.6223 17.3125 12.001 17.3125C11.3798 17.3123 10.876 16.8087 10.876 16.1875C10.876 15.5663 11.3798 15.0627 12.001 15.0625Z"/><path d="M12.001 6.6875C12.5533 6.6875 13.001 7.13522 13.001 7.6875V12.4375C13.001 12.9898 12.5533 13.4375 12.001 13.4375C11.4489 13.4373 11.001 12.9897 11.001 12.4375V7.6875C11.001 7.13534 11.4489 6.6877 12.001 6.6875Z"/><path clip-rule="evenodd" fill-rule="evenodd" d="M12 1C18.0751 1 23 5.92488 23 12C23 13.6202 22.6483 15.1606 22.0176 16.5479L22.9834 21.8193C23.0425 22.1418 22.9403 22.4737 22.709 22.7061C22.4777 22.9383 22.1469 23.042 21.8242 22.9844L16.5117 22.0342C15.1338 22.6547 13.606 23 12 23C5.92488 23 1 18.0752 1 12C1 5.92481 5.92488 1 12 1ZM12 3C7.02944 3 3 7.02939 3 12C3 16.9706 7.02944 21 12 21C13.414 21 14.7495 20.6748 15.9375 20.0957L16.084 20.0381C16.2347 19.9922 16.3952 19.9818 16.5518 20.0098L20.7559 20.7617L19.9922 16.5928C19.9535 16.3815 19.9842 16.1634 20.0791 15.9707C20.6684 14.7742 21 13.4272 21 12C21 7.02944 16.9706 3 12 3Z"/></svg>`;
  },
  share() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`;
  },
  qr() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M14 14h3v3h-3zM19 14h2v2h-2zM14 19h2v2h-2zM19 19h2v2h-2z"/></svg>`;
  },
  edit() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`;
  },
  attach() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5.5C7.82843 5.5 8.5 6.17157 8.5 7C8.5 7.82843 7.82843 8.5 7 8.5C6.17157 8.5 5.5 7.82843 5.5 7C5.5 6.17157 6.17157 5.5 7 5.5Z"/><path clip-rule="evenodd" fill-rule="evenodd" d="M15.5879 1C16.6914 1 17.5797 0.999039 18.2969 1.05762C19.0255 1.11715 19.6657 1.24331 20.2578 1.54492C21.1986 2.02428 21.964 2.78969 22.4434 3.73047C22.745 4.32266 22.8711 4.96271 22.9307 5.69141C22.9893 6.40857 22.9883 7.29681 22.9883 8.40039V15.5996C22.9883 16.7032 22.9893 17.5914 22.9307 18.3086C22.8711 19.0373 22.745 19.6773 22.4434 20.2695C21.964 21.2103 21.1986 21.9757 20.2578 22.4551C19.6657 22.7567 19.0255 22.8829 18.2969 22.9424C17.5797 23.001 16.6914 23 15.5879 23H8.38867C7.28516 23 6.39682 23.001 5.67969 22.9424C4.95105 22.8828 4.3109 22.7567 3.71875 22.4551C2.778 21.9757 2.01255 21.2103 1.5332 20.2695C1.23157 19.6774 1.10543 19.0373 1.0459 18.3086C0.987309 17.5914 0.988282 16.7032 0.988282 15.5996V8.40039C0.988282 7.29682 0.987309 6.40857 1.0459 5.69141C1.10543 4.96273 1.23157 4.32265 1.5332 3.73047C2.01255 2.7897 2.778 2.02429 3.71875 1.54492C4.3109 1.24329 4.95105 1.11716 5.67969 1.05762C6.39682 0.999029 7.28516 1 8.38867 1H15.5879ZM18.3535 11C15.3973 11 12.8711 12.8367 11.8457 15.4355C11.7266 15.7374 11.4676 15.9629 11.1523 16.04C10.8766 16.1073 10.5876 16.0534 10.3555 15.8965L10.2598 15.8232L10.085 15.6777C9.19483 14.9691 8.07361 14.5459 6.85156 14.5459C5.31955 14.546 3.94482 15.2076 2.99121 16.2637C2.99303 17.0572 2.99913 17.6566 3.03906 18.1455C3.0885 18.7506 3.18126 19.099 3.31543 19.3623C3.60298 19.9265 4.06181 20.3853 4.62598 20.6729C4.88931 20.807 5.2377 20.8998 5.84277 20.9492C6.45955 20.9996 7.25232 21 8.38867 21H15.5879C16.7242 21 17.517 20.9996 18.1338 20.9492C18.7389 20.8998 19.0872 20.807 19.3506 20.6729C19.9148 20.3853 20.3736 19.9265 20.6611 19.3623C20.7953 19.099 20.8881 18.7507 20.9375 18.1455C20.9879 17.5287 20.9883 16.736 20.9883 15.5996V11.5156C20.1756 11.1848 19.2876 11 18.3535 11ZM8.38867 3C7.25232 3 6.45955 3.00041 5.84277 3.05078C5.2377 3.10023 4.88931 3.19297 4.62598 3.32715C4.06181 3.61473 3.60298 4.07351 3.31543 4.6377C3.18126 4.90104 3.0885 5.24937 3.03906 5.85449C2.98869 6.47129 2.98828 7.26397 2.98828 8.40039V13.6689C4.10409 12.9582 5.42945 12.5459 6.85156 12.5459C8.19776 12.5459 9.45559 12.918 10.5313 13.5605C12.0767 10.8404 14.9962 9 18.3535 9C19.2696 9.00003 20.1545 9.13661 20.9883 9.3916V8.40039C20.9883 7.26396 20.9879 6.47129 20.9375 5.85449C20.8881 5.24933 20.7953 4.90105 20.6611 4.6377C20.3736 4.0735 19.9148 3.61471 19.3506 3.32715C19.0872 3.193 18.7389 3.10022 18.1338 3.05078C17.517 3.00042 16.7242 3 15.5879 3H8.38867Z"/></svg>`;
  },
  expand() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 2C21.0563 2 21.1113 2.00571 21.165 2.01465C21.4466 2.10635 21.6203 2.19887 21.835 2.4502C21.9222 2.61159 21.9668 2.74799 21.9893 2.92022C22 2.94294 22 2.92022 22 3V11C22 11.5523 21.5523 12 21 12C20.4477 12 20 11.5523 20 11V5.41406L5.41406 20H11C11.5523 20 12 20.4477 12 21C12 21.5523 11.5523 22 11 22H3C2.94333 22 2.60401 21.9934 2.56641 21.9561C2.52662 21.8812 2.31255 21.7441 2.12012 21.4746C2.0778 21.3873 2.0303 21.2077 2.01465 21.165C2.00571 21.1113 2 21.0563 2 21V13C2 12.4477 2.44772 12 3 12C3.55228 12 4 12.4477 4 13V18.5859L18.5859 4H13C12.4477 4 12 3.55228 12 3C12 2.44772 12.4477 2 13 2H21Z"/></svg>`;
  },
  send() {
    return `<svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M1 6h10M1 6l4-4M1 6l4 4" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/></svg>`;
  },
  calendar() {
    return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
  },
  copy() {
    return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>`;
  },
  close() {
    return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>`;
  },
  wifiOff() {
    return `<svg width="92" height="92" viewBox="0 0 92 92" fill="none" aria-hidden="true">
      <rect x="16" y="16" width="60" height="60" rx="16" fill="var(--bg-page)" stroke="var(--border-default)" stroke-width="1.5"/>
      <g stroke="var(--text-tertiary)" stroke-width="2.4" stroke-linecap="round" fill="none">
        <path d="M33 45a18 18 0 0 1 26 0"/>
        <path d="M39 52a10 10 0 0 1 14 0"/>
      </g>
      <circle cx="46" cy="59" r="2.6" fill="var(--text-tertiary)"/>
      <line x1="31" y1="33" x2="61" y2="63" stroke="var(--danger)" stroke-width="2.4" stroke-linecap="round"/>
    </svg>`;
  },
  reload() {
    return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`;
  },
  racks() {
    return `<svg width="120" height="92" viewBox="0 0 120 92" fill="none" aria-hidden="true">
      <rect x="33" y="16" width="54" height="24" rx="5" fill="var(--bg-surface)" stroke="var(--border-dashed)" stroke-width="1.5"/>
      <circle cx="43" cy="28" r="2.5" fill="var(--brand-sand)"/>
      <line x1="52" y1="24" x2="79" y2="24" stroke="var(--border-dashed)" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="52" y1="32" x2="73" y2="32" stroke="var(--border-dashed)" stroke-width="1.5" stroke-linecap="round"/>
      <rect x="33" y="48" width="54" height="24" rx="5" fill="var(--bg-surface)" stroke="var(--border-dashed)" stroke-width="1.5" stroke-dasharray="5 4"/>
      <circle cx="43" cy="60" r="2.5" fill="var(--brand-warm)"/>
      <line x1="52" y1="56" x2="79" y2="56" stroke="var(--border-dashed)" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="3 4"/>
      <line x1="52" y1="64" x2="73" y2="64" stroke="var(--border-dashed)" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="3 4"/>
    </svg>`;
  },
  ghostCards() {
    return `<svg width="120" height="100" viewBox="0 0 120 100" fill="none" aria-hidden="true">
      <rect x="32" y="8" width="74" height="62" rx="8" fill="var(--bg-page)" stroke="var(--border-dashed)" stroke-width="1.5" stroke-dasharray="5 4"/>
      <rect x="14" y="22" width="74" height="62" rx="8" fill="var(--bg-surface)" stroke="var(--border-dashed)" stroke-width="1.5" stroke-dasharray="5 4"/>
      <text x="51" y="64" text-anchor="middle" font-size="32" font-weight="700" fill="var(--brand-sand)" font-family="inherit">?</text>
    </svg>`;
  },
  view() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  },

  /* ---- Iconos nuevos para los experimentos de "vida" del Home (sandbox,
     no existen en la app real) — mismo estilo Feather/outline del resto. ---- */
  spark() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/></svg>`;
  },
  arrowUp() {
    return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>`;
  },
  userPlus() {
    return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg>`;
  },
  userCheck() {
    return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M16 11l2 2 4-4"/></svg>`;
  },
  compass() {
    return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`;
  },
  lifeBuoy() {
    return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><path d="M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M14.83 9.17l4.24-4.24M4.93 19.07l4.24-4.24"/></svg>`;
  },
};

if (typeof window !== "undefined") window.Icons = Icons;
