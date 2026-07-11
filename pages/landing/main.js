// Thiup landing — vanilla i18n + language toggle.
// Default language is English; the user can switch to Spanish. The choice is
// persisted in localStorage and applied live (no reload). Sentence case copy.
//
// Subpages (/how-it-works, /open-source, /privacy) reuse this script for the
// shared chrome (header/footer/toggle) and declare their own copy in a
// `window.PAGE_I18N = { en: {...}, es: {...} }` inline script BEFORE this file
// loads; page keys (including meta.title/meta.description) override the base.

(function () {
  "use strict";

  var STORAGE_KEY = "thiup_lang";
  var DEFAULT_LANG = "en";
  var PAGE_I18N = window.PAGE_I18N || null;

  // All landing copy. `meta.*` localizes <title>/<meta description>; every other
  // key maps to a [data-i18n] element's textContent.
  var I18N = {
    en: {
      "meta.title": "Thiup — speak freely, stay anonymous",
      "meta.description":
        "Thiup is an anonymous space to talk about what matters — no sign-ups, no profiles, no tracking.",
      skip: "Skip to content",
      navHow: "How it works",
      navOpenSource: "Open source",
      navPrivacy: "Privacy",
      eyebrow: "Anonymous · open source · no tracking",
      openApp: "Open the app",
      learnMore: "What is Thiup?",
      heroTitle: "Speak freely. Stay anonymous.",
      heroSubtitle:
        "Thiup is an anonymous space to talk about what matters — no sign-ups, no profiles, no tracking.",
      aboutTitle: "What is Thiup?",
      aboutLead:
        "A calm place to speak openly, built so you never have to reveal who you are.",
      f1Title: "Anonymous by default",
      f1Text:
        "No accounts, no profiles. You are a pseudonymous mask, never a real identity.",
      f2Title: "Nothing to sign up for",
      f2Text:
        "Open the app and start talking. No email, no password, no setup.",
      f3Title: "Your location stays yours",
      f3Text:
        "Your precise location is never stored. Privacy is built in, not bolted on.",
      howTitle: "How Thiup works",
      howLead:
        "Built for the conversations that are hard to have anywhere else. Here is what that means in practice.",
      how1Title: "A place for what's hard to say",
      how1Text:
        "Thiup exists for honest conversation about sensitive topics — the things you wouldn't post next to your name. The calm, quiet design is part of that promise: no noise, no clout, no pressure.",
      how2Title: "How masks work",
      how2Text:
        "There is no account to create. When you arrive you get a mask — a pseudonymous identity derived from your connection, shown as a short @id and a generated avatar. Your name, email or phone are never asked for, so they can never leak.",
      how3Title: "Real people, no bots",
      how3Text:
        "Every thread, reply and reaction on Thiup comes from a real person. There are no bots, no fake engagement and no ads — just people talking.",
      how4Title: "Privacy as architecture",
      how4Text:
        "Thiup doesn't track you. Your precise location is never stored (nearby feeds use a coarse, opt-in area), traffic is encrypted, and what is never collected can't be sold or leaked.",
      howClose:
        "Thiup is a small, independent project with one goal: a place where anyone can speak freely and stay anonymous. No investors, no data business, no growth tricks — the app only asks for what it needs, and the code that proves it is one click away.",
      linkHowMore: "Read more about how Thiup works",
      linkPrivacyMore: "Our privacy promise",
      linkOsMore: "More about the project",
      osTitle: "Open source",
      osText:
        "Thiup's code is public. Anyone can read it, audit how privacy is handled, and contribute — the promises above aren't marketing, they're verifiable.",
      osButton: "View on GitHub",
      ctaTitle: "Speak nameless.",
      ctaText: "Join the conversation without giving up your privacy.",
      tagline: "Speak nameless.",
      footerNote: "Anonymous, privacy first",
    },
    es: {
      "meta.title": "Thiup — habla libremente, sin nombre",
      "meta.description":
        "Thiup es un espacio anónimo para hablar de lo que importa — sin registros, sin perfiles, sin rastreo.",
      skip: "Saltar al contenido",
      navHow: "Cómo funciona",
      navOpenSource: "Código abierto",
      navPrivacy: "Privacidad",
      eyebrow: "Anónimo · código abierto · sin rastreo",
      openApp: "Abrir la app",
      learnMore: "¿Qué es Thiup?",
      heroTitle: "Habla libremente. Sin nombre.",
      heroSubtitle:
        "Thiup es un espacio anónimo para hablar de lo que importa — sin registros, sin perfiles, sin rastreo.",
      aboutTitle: "¿Qué es Thiup?",
      aboutLead:
        "Un lugar tranquilo para hablar con libertad, hecho para que nunca tengas que revelar quién eres.",
      f1Title: "Anónimo por defecto",
      f1Text:
        "Sin cuentas ni perfiles. Eres una máscara seudónima, nunca una identidad real.",
      f2Title: "Nada que registrar",
      f2Text:
        "Abre la app y empieza a hablar. Sin correo, sin contraseña, sin configurar nada.",
      f3Title: "Tu ubicación es tuya",
      f3Text:
        "Tu ubicación precisa nunca se guarda. La privacidad viene de fábrica.",
      howTitle: "Cómo funciona Thiup",
      howLead:
        "Hecho para las conversaciones que cuestan tener en cualquier otro lugar. Esto es lo que significa en la práctica.",
      how1Title: "Un lugar para lo que cuesta decir",
      how1Text:
        "Thiup existe para hablar con honestidad de temas sensibles — lo que no publicarías junto a tu nombre. El diseño tranquilo es parte de esa promesa: sin ruido, sin fama, sin presión.",
      how2Title: "Cómo funcionan las máscaras",
      how2Text:
        "No hay cuenta que crear. Al llegar recibes una máscara: una identidad seudónima derivada de tu conexión, con un @id corto y un avatar generado. Nunca te pedimos nombre, correo ni teléfono, así que nunca pueden filtrarse.",
      how3Title: "Personas reales, sin bots",
      how3Text:
        "Cada hilo, respuesta y reacción en Thiup viene de una persona real. No hay bots, ni interacciones falsas, ni anuncios — solo gente hablando.",
      how4Title: "La privacidad es la arquitectura",
      how4Text:
        "Thiup no te rastrea. Tu ubicación precisa nunca se guarda (los feeds cercanos usan un área difusa y opcional), el tráfico viaja cifrado, y lo que nunca se recolecta no se puede vender ni filtrar.",
      howClose:
        "Thiup es un proyecto pequeño e independiente con un único objetivo: un lugar donde cualquiera pueda hablar libremente y sin nombre. Sin inversores, sin negocio de datos, sin trucos de crecimiento — la app solo pide lo que necesita, y el código que lo demuestra está a un clic.",
      linkHowMore: "Lee más sobre cómo funciona Thiup",
      linkPrivacyMore: "Nuestra promesa de privacidad",
      linkOsMore: "Más sobre el proyecto",
      osTitle: "Código abierto",
      osText:
        "El código de Thiup es público. Cualquiera puede leerlo, auditar cómo se maneja la privacidad y contribuir — las promesas de arriba no son marketing, se pueden verificar.",
      osButton: "Ver en GitHub",
      ctaTitle: "Habla sin nombre.",
      ctaText: "Únete a la conversación sin renunciar a tu privacidad.",
      tagline: "Habla sin nombre.",
      footerNote: "Anónimo, privacidad primero",
    },
  };

  function resolveInitialLang() {
    var stored = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      // localStorage may be unavailable (private mode); fall back to default.
    }
    return stored === "en" || stored === "es" ? stored : DEFAULT_LANG;
  }

  function dictFor(lang) {
    var base = I18N[lang] || I18N[DEFAULT_LANG];
    if (!PAGE_I18N) return base;
    var page = PAGE_I18N[lang] || {};
    var out = {};
    var k;
    for (k in base) out[k] = base[k];
    for (k in page) out[k] = page[k];
    return out;
  }

  function apply(lang) {
    var dict = dictFor(lang);

    // Text nodes.
    var nodes = document.querySelectorAll("[data-i18n]");
    for (var i = 0; i < nodes.length; i++) {
      var key = nodes[i].getAttribute("data-i18n");
      if (dict[key] != null) nodes[i].textContent = dict[key];
    }

    // Document <html lang>, <title> and meta description.
    document.documentElement.setAttribute("lang", lang);
    if (dict["meta.title"]) document.title = dict["meta.title"];
    var desc = document.querySelector('meta[name="description"]');
    if (desc && dict["meta.description"]) {
      desc.setAttribute("content", dict["meta.description"]);
    }

    // Toggle pressed state.
    var btns = document.querySelectorAll(".lang-btn");
    for (var j = 0; j < btns.length; j++) {
      btns[j].setAttribute(
        "aria-pressed",
        btns[j].getAttribute("data-lang") === lang ? "true" : "false"
      );
    }
  }

  function setLang(lang) {
    apply(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      // Ignore persistence errors (private mode); the live change still applies.
    }
  }

  function init() {
    apply(resolveInitialLang());

    var toggle = document.getElementById("lang-toggle");
    if (toggle) {
      toggle.addEventListener("click", function (e) {
        var btn = e.target.closest(".lang-btn");
        if (btn) setLang(btn.getAttribute("data-lang"));
      });
    }

    var year = document.getElementById("year");
    if (year) year.textContent = String(new Date().getFullYear());

    setupReveal();
    setupHeaderShadow();
  }

  // Scroll-reveal: add .in when an element enters the viewport (once).
  function setupReveal() {
    var reveals = document.querySelectorAll(".reveal");
    if (!reveals.length) return;
    if (!("IntersectionObserver" in window)) {
      for (var i = 0; i < reveals.length; i++) reveals[i].classList.add("in");
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach(function (el) {
      io.observe(el);
    });
  }

  // Subtle shadow under the sticky header once the page is scrolled.
  function setupHeaderShadow() {
    var header = document.querySelector(".site-header");
    if (!header) return;
    var onScroll = function () {
      header.classList.toggle("scrolled", window.scrollY > 8);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
