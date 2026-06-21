// Thiup landing — vanilla i18n + language toggle.
// Default language is English; the user can switch to Spanish. The choice is
// persisted in localStorage and applied live (no reload). Sentence case copy.

(function () {
  "use strict";

  var STORAGE_KEY = "thiup_lang";
  var DEFAULT_LANG = "en";

  // All landing copy. `meta.*` localizes <title>/<meta description>; every other
  // key maps to a [data-i18n] element's textContent.
  var I18N = {
    en: {
      "meta.title": "Thiup — speak freely, stay anonymous",
      "meta.description":
        "Thiup is an anonymous space to talk about what matters — no sign-ups, no profiles, no tracking.",
      skip: "Skip to content",
      eyebrow: "Anonymous · no sign-ups · no tracking",
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
      eyebrow: "Anónimo · sin registros · sin rastreo",
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

  function apply(lang) {
    var dict = I18N[lang] || I18N[DEFAULT_LANG];

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
