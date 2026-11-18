/* Ubah data perusahaan di sini. Jangan gunakan nomor atau identitas fiktif. */
window.siteConfig = {
  companyName: "",
  whatsappNumber: "", // Format internasional, hanya angka; contoh format: 62 diikuti nomor.
  email: "",
  phone: "",
  address: { en: "", id: "" },
  businessHours: { en: "", id: "" },
  socials: { linkedin: "", instagram: "", facebook: "", youtube: "" }
};

/* Interaksi website statis. Isi utama selalu tersedia langsung dalam HTML. */
(() => {
  "use strict";

  const rootURL = new URL("../", document.currentScript.src);
  const pageURLs = { en: new URL("./", rootURL), id: new URL("id/", rootURL) };
  if (location.protocol === "file:") {
    document.querySelectorAll("[data-language]").forEach(link => {
      link.href = new URL("index.html", pageURLs[link.dataset.language]).href;
    });
  }
  /* Resource head tidak boleh berubah direktori saat History API mengganti URL. */
  document.head.querySelectorAll("link[href]").forEach(element => {
    element.href = new URL(element.getAttribute("href"), location.href).href;
  });
  const pageCache = new Map();
  let navigationRequest;
  let revealObserver;
  let slideshowController;
  let scrollScheduled = false;
  const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
  document.documentElement.classList.add("has-interactions");

  const messages = {
    en: {
      required: "Please complete this field.", email: "Please enter a valid email address.",
      unavailable: "Our WhatsApp contact is not available yet. Please check the contact details below or try again later.",
      contactUnavailable: "These contact details are not available yet. Please check back later.",
      ready: "Continue in WhatsApp and press Send to send your inquiry.",
      menuOpen: "Open navigation", menuClose: "Close navigation",
      slideshowPause: "Pause slideshow", slideshowPlay: "Play slideshow", slideshowReduced: "Slideshow paused for reduced motion",
      hello: "Hello, I would like to request a quotation for your services.",
      ending: "Please provide further information regarding the quotation and process.\n\nThank you.",
      labels: { fullName: "Full Name", company: "Company", email: "Email", phone: "Phone / WhatsApp Number", service: "Service Type", commodity: "Commodity / Product Description", quantity: "Estimated Quantity", origin: "Origin Country", destination: "Destination Country", notes: "Additional Notes" }
    },
    id: {
      required: "Mohon lengkapi kolom ini.", email: "Mohon masukkan alamat email yang valid.",
      unavailable: "Kontak WhatsApp kami belum tersedia. Silakan periksa informasi kontak di bawah atau coba kembali nanti.",
      contactUnavailable: "Informasi kontak ini belum tersedia. Silakan periksa kembali nanti.",
      ready: "Lanjutkan di WhatsApp dan tekan Kirim untuk mengirim permintaan Anda.",
      menuOpen: "Buka navigasi", menuClose: "Tutup navigasi",
      slideshowPause: "Jeda slideshow", slideshowPlay: "Putar slideshow", slideshowReduced: "Slideshow dijeda sesuai preferensi gerakan",
      hello: "Halo, saya ingin meminta penawaran untuk layanan Anda.",
      ending: "Mohon berikan informasi lebih lanjut mengenai penawaran dan prosesnya.\n\nTerima kasih.",
      labels: { fullName: "Nama Lengkap", company: "Perusahaan", email: "Email", phone: "Nomor Telepon / WhatsApp", service: "Jenis Layanan", commodity: "Deskripsi Komoditas / Produk", quantity: "Perkiraan Jumlah", origin: "Negara Asal", destination: "Negara Tujuan", notes: "Catatan Tambahan" }
    }
  };

  const locale = () => document.documentElement.lang === "id" ? "id" : "en";
  const copy = () => messages[locale()];
  const config = () => window.siteConfig || {};
  const localized = (value) => typeof value === "string" ? value : value?.[locale()] || value?.en || "";

  function whatsappURL(message = "") {
    const supplied = String(config().whatsappNumber || "").trim();
    if (!/^\+?[\d\s()-]+$/.test(supplied)) return null;
    const number = supplied.replace(/\D/g, "");
    if (!/^[1-9]\d{7,14}$/.test(number)) return null;
    return `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
  }

  function showStatus(id, message) {
    const element = document.getElementById(id);
    if (!element) return;
    element.textContent = message;
    element.hidden = false;
  }

  function setMenu(open, returnFocus = false) {
    const header = document.querySelector(".site-header");
    const button = document.querySelector(".menu-toggle");
    const mobile = innerWidth < 1024;
    const expanded = mobile && open;
    header.classList.toggle("menu-open", expanded);
    button.setAttribute("aria-expanded", String(expanded));
    button.setAttribute("aria-label", expanded ? copy().menuClose : copy().menuOpen);
    const nav = document.getElementById("primary-navigation");
    nav.inert = mobile && !expanded;
    if (mobile) nav.setAttribute("aria-hidden", String(!expanded));
    else nav.removeAttribute("aria-hidden");
    if (returnFocus) button.focus();
  }

  function applyConfig() {
    const settings = config();
    const companyName = String(settings.companyName || "").trim();
    if (companyName) {
      document.querySelectorAll("[data-company]").forEach(element => { element.textContent = companyName; });
      const replaceName = text => text.replace(/\[(Company Name|Nama Perusahaan)\]/g, () => companyName);
      document.title = replaceName(document.title);
      document.querySelectorAll('meta[name="description"], meta[property="og:title"], meta[property="og:description"]').forEach(element => {
        element.content = replaceName(element.content);
      });
    }

    document.querySelectorAll("[data-config]").forEach(element => {
      const value = localized(settings[element.dataset.config]).trim();
      if (value) element.textContent = value;
    });
    document.querySelectorAll("[data-contact-link]").forEach(element => {
      const type = element.dataset.contactLink;
      const value = String(settings[type] || "").trim();
      if (type === "email" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        element.href = `mailto:${value}`;
        element.dataset.configured = "true";
      } else if (type === "phone" && /^\+?[\d\s()-]{7,25}$/.test(value)) {
        element.href = `tel:${value.replace(/[^\d+]/g, "")}`;
        element.dataset.configured = "true";
      }
    });
    document.querySelectorAll("[data-social]").forEach(element => {
      const value = settings.socials?.[element.dataset.social];
      if (typeof value === "string" && /^https:\/\//i.test(value)) {
        try {
          element.href = new URL(value).href;
          element.target = "_blank";
          element.rel = "noopener noreferrer";
          element.dataset.configured = "true";
          element.setAttribute("aria-label", element.dataset.social);
        } catch { /* Alamat yang tidak valid tetap menjadi placeholder. */ }
      }
    });
    const floating = document.querySelector("[data-whatsapp]");
    floating.href = whatsappURL() || "#contact";
    if (whatsappURL()) {
      floating.target = "_blank";
      floating.rel = "noopener noreferrer";
    }
    document.querySelectorAll("[data-year]").forEach(element => { element.textContent = String(new Date().getFullYear()); });
    const form = document.getElementById("quote-form");
    form.noValidate = true;
    form.querySelector('[type="submit"]').disabled = false;
    setMenu(false);
  }

  /* Satu pembaruan per frame untuk header, progres baca, dan menu aktif. */
  function updateScrollUI() {
    scrollScheduled = false;
    const header = document.querySelector(".site-header");
    header.classList.toggle("is-scrolled", scrollY > 12);
    const distance = document.documentElement.scrollHeight - innerHeight;
    const progress = header.querySelector(".reading-progress > span");
    progress.style.transform = `scaleX(${distance > 0 ? Math.min(1, Math.max(0, scrollY / distance)) : 0})`;
    let current = "home";
    for (const id of ["home", "about", "services", "products", "contact"]) {
      if (document.getElementById(id).getBoundingClientRect().top <= header.offsetHeight + 100) current = id;
    }
    header.querySelectorAll("[data-nav]").forEach(link => {
      if (link.dataset.nav === current) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }

  function scheduleScrollUI() {
    if (scrollScheduled) return;
    scrollScheduled = true;
    requestAnimationFrame(updateScrollUI);
  }

  /* Nilai jarak, easing, durasi, dan stagger mengikuti website referensi. */
  function setupReveals() {
    revealObserver?.disconnect();
    const elements = [...document.querySelectorAll("[data-reveal]")];
    if (motionPreference.matches || !("IntersectionObserver" in window)) {
      document.documentElement.classList.remove("motion-ready");
      elements.forEach(element => element.classList.add("is-visible"));
      return;
    }
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: .08, rootMargin: "0px 0px -20px 0px" });
    elements.forEach(element => {
      element.style.setProperty("--reveal-delay", `${Math.min(300, Math.max(0, Number(element.dataset.delay) || 0))}ms`);
      if (!element.classList.contains("is-visible")) revealObserver.observe(element);
    });
    document.documentElement.classList.add("motion-ready");
  }

  /* Slideshow dibersihkan dan dipasang kembali setelah pergantian bahasa. */
  function setupSlideshow() {
    slideshowController?.destroy();
    const area = document.querySelector(".hero-visual");
    const slideshow = document.getElementById("hero-slideshow");
    const slides = [...slideshow.querySelectorAll(".hero-slide")];
    const dots = [...area.querySelectorAll("[data-slide]")];
    const pauseButton = area.querySelector(".slideshow-pause");
    const listeners = new AbortController();
    let activeSlide = 0;
    let timer;
    let heroObserver;
    let userPaused = false;
    let pointerPaused = area.matches(":hover");
    let focusPaused = area.contains(document.activeElement);
    let heroVisible = slideshow.getBoundingClientRect().bottom > 0 && slideshow.getBoundingClientRect().top < innerHeight;

    function sync() {
      clearTimeout(timer);
      const paused = userPaused || pointerPaused || focusPaused || motionPreference.matches || document.hidden || !heroVisible;
      slideshow.classList.toggle("is-animated", !motionPreference.matches);
      slideshow.classList.toggle("is-paused", paused);
      pauseButton.setAttribute("aria-pressed", String(userPaused || motionPreference.matches));
      pauseButton.setAttribute("aria-label", motionPreference.matches ? copy().slideshowReduced : userPaused ? copy().slideshowPlay : copy().slideshowPause);
      pauseButton.disabled = motionPreference.matches;
      pauseButton.querySelector("path").setAttribute("d", userPaused || motionPreference.matches ? "M9 6l10 6-10 6V6Z" : "M9 6v12M15 6v12");
      if (!paused) timer = setTimeout(() => showSlide((activeSlide + 1) % slides.length), 6000);
    }

    function showSlide(index) {
      if (!Number.isInteger(index) || index < 0 || index >= slides.length) return;
      activeSlide = index;
      slides.forEach((slide, position) => {
        const active = index === position;
        slide.classList.toggle("is-active", active);
        slide.setAttribute("aria-hidden", String(!active));
        dots[position].classList.toggle("is-active", active);
        dots[position].setAttribute("aria-pressed", String(active));
      });
      area.querySelector(".slide-count").textContent = `${String(index + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}`;
      sync();
    }

    area.addEventListener("pointerenter", event => { if (event.pointerType === "mouse") { pointerPaused = true; sync(); } }, { signal: listeners.signal });
    area.addEventListener("pointerleave", () => { pointerPaused = false; sync(); }, { signal: listeners.signal });
    area.addEventListener("focusin", () => { focusPaused = true; sync(); }, { signal: listeners.signal });
    area.addEventListener("focusout", event => { if (!area.contains(event.relatedTarget)) { focusPaused = false; sync(); } }, { signal: listeners.signal });
    if ("IntersectionObserver" in window) {
      heroObserver = new IntersectionObserver(entries => { heroVisible = entries[0].isIntersecting; sync(); });
      heroObserver.observe(slideshow);
    }
    slideshowController = {
      showSlide,
      togglePause() { userPaused = !userPaused; sync(); },
      sync,
      destroy() { clearTimeout(timer); heroObserver?.disconnect(); listeners.abort(); }
    };
    showSlide(0);
  }

  function rememberForm() {
    const form = document.getElementById("quote-form");
    return Object.fromEntries(new FormData(form).entries());
  }

  /* Tautan bahasa tetap dapat dibuka langsung oleh pengguna maupun crawler.
     Peningkatan JavaScript mempertahankan input hanya di memori halaman. */
  async function switchLanguage(targetLocale, pushHistory = true) {
    if (targetLocale === locale()) return;
    const target = new URL(pageURLs[targetLocale]);
    target.hash = location.hash;
    const previousForm = rememberForm();
    const previousScroll = window.scrollY;
    navigationRequest?.abort();
    const controller = new AbortController();
    navigationRequest = controller;

    try {
      let html = pageCache.get(targetLocale);
      if (!html) {
        const response = await fetch(pageURLs[targetLocale], { signal: controller.signal });
        if (!response.ok) throw new Error("Language page unavailable");
        html = await response.text();
        pageCache.set(targetLocale, html);
      }
      if (controller.signal.aborted) return;
      const translated = new DOMParser().parseFromString(html, "text/html");
      if (translated.documentElement.lang !== targetLocale || !translated.querySelector("#quote-form")) throw new Error("Invalid language page");

      /* URL aset dibuat absolut agar benar saat berpindah direktori bahasa. */
      translated.querySelectorAll("[src], [href]").forEach(element => {
        ["src", "href"].forEach(attribute => {
          const value = element.getAttribute(attribute);
          if (value && !value.startsWith("#")) element.setAttribute(attribute, new URL(value, pageURLs[targetLocale]).href);
        });
      });
      translated.querySelectorAll("[srcset]").forEach(element => {
        element.setAttribute("srcset", element.getAttribute("srcset").split(",").map(candidate => {
          const [path, descriptor] = candidate.trim().split(/\s+/);
          return `${new URL(path, pageURLs[targetLocale]).href} ${descriptor}`;
        }).join(", "));
      });

      if (pushHistory) history.pushState({ language: targetLocale }, "", target);
      for (const selector of [".skip-link", ".site-header", "main", ".site-footer", ".floating-whatsapp"]) {
        document.querySelector(selector).replaceWith(document.importNode(translated.querySelector(selector), true));
      }
      document.documentElement.lang = targetLocale;
      document.title = translated.title;
      const metaSelectors = ['meta[name="description"]', 'meta[property^="og:"]', 'meta[name="twitter:card"]', 'link[rel="canonical"]', 'link[rel="alternate"][hreflang]', 'script[type="application/ld+json"]'];
      for (const selector of metaSelectors) {
        document.head.querySelectorAll(selector).forEach(element => element.remove());
        translated.head.querySelectorAll(selector).forEach(element => document.head.append(document.importNode(element, true)));
      }
      applyConfig();
      const form = document.getElementById("quote-form");
      for (const [key, value] of Object.entries(previousForm)) {
        if (form.elements.namedItem(key)) form.elements.namedItem(key).value = value;
      }
      setupReveals();
      setupSlideshow();
      updateScrollUI();
      window.scrollTo({ top: previousScroll, behavior: "instant" });
      if (pushHistory) document.querySelector(`[data-language="${targetLocale}"]`).focus({ preventScroll: true });
    } catch (error) {
      if (error.name !== "AbortError") location.assign(target);
    }
  }

  function validateForm(form) {
    let firstInvalid;
    for (const field of form.querySelectorAll("input, select, textarea")) {
      field.setCustomValidity("");
      field.removeAttribute("aria-invalid");
      if (field.required && !field.value.trim()) field.setCustomValidity(copy().required);
      else if (field.type === "email" && field.validity.typeMismatch) field.setCustomValidity(copy().email);
      if (!field.validity.valid) {
        field.setAttribute("aria-invalid", "true");
        firstInvalid ||= field;
      }
    }
    if (!firstInvalid) return true;
    firstInvalid.focus();
    firstInvalid.reportValidity();
    return false;
  }

  function inquiryMessage(form) {
    const values = Object.fromEntries(new FormData(form).entries());
    const lines = [copy().hello, ""];
    for (const [key, label] of Object.entries(copy().labels)) {
      if (key === "notes") continue;
      let value = String(values[key] || "").trim();
      if (!value) continue;
      if (key === "service" && locale() === "id") value = value === "Export" ? "Ekspor" : "Impor";
      lines.push(`${label}: ${value}`);
    }
    if (values.notes.trim()) lines.push("", `${copy().labels.notes}:`, values.notes.trim());
    lines.push("", copy().ending);
    return lines.join("\n");
  }

  document.addEventListener("click", event => {
    const menu = event.target.closest(".menu-toggle");
    if (menu) {
      setMenu(menu.getAttribute("aria-expanded") !== "true");
      return;
    }
    const language = event.target.closest("[data-language]");
    if (language && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0 && location.protocol !== "file:") {
      event.preventDefault();
      switchLanguage(language.dataset.language);
      return;
    }
    const slide = event.target.closest("[data-slide]");
    if (slide) {
      slideshowController?.showSlide(Number(slide.dataset.slide));
      setMenu(false);
      return;
    }
    if (event.target.closest(".slideshow-pause")) {
      slideshowController?.togglePause();
      setMenu(false);
      return;
    }
    const whatsapp = event.target.closest("[data-whatsapp]");
    if (whatsapp) {
      event.preventDefault();
      const url = whatsappURL();
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      else {
        showStatus("contact-status", copy().unavailable);
        document.getElementById("contact").scrollIntoView({ behavior: "auto" });
      }
      return;
    }
    const contact = event.target.closest("[data-contact-link], [data-social]");
    if (contact && contact.dataset.configured !== "true") {
      event.preventDefault();
      showStatus("contact-status", copy().contactUnavailable);
      document.getElementById("contact").scrollIntoView({ behavior: "auto" });
    }
    if (event.target.closest('.primary-navigation a, a[href^="#"]') || !event.target.closest(".site-header")) setMenu(false);
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && document.querySelector(".site-header.menu-open")) setMenu(false, true);
  });
  document.addEventListener("focusin", event => {
    let element = event.target.closest("[data-reveal]");
    while (element) {
      element.classList.add("is-visible");
      revealObserver?.unobserve(element);
      element = element.parentElement?.closest("[data-reveal]");
    }
  });
  document.addEventListener("input", event => {
    if (event.target.matches("#quote-form input, #quote-form textarea, #quote-form select")) {
      event.target.setCustomValidity("");
      event.target.removeAttribute("aria-invalid");
      document.getElementById("form-status").hidden = true;
    }
  });
  document.addEventListener("submit", event => {
    if (event.target.id !== "quote-form") return;
    event.preventDefault();
    const form = event.target;
    if (!validateForm(form)) return;
    const url = whatsappURL(inquiryMessage(form));
    if (!url) {
      showStatus("form-status", copy().unavailable);
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
    showStatus("form-status", copy().ready);
  });
  window.addEventListener("popstate", () => {
    const nextLocale = location.pathname === pageURLs.id.pathname || location.pathname === `${pageURLs.id.pathname}index.html` ? "id" : "en";
    switchLanguage(nextLocale, false);
  });
  const desktop = matchMedia("(min-width: 1024px)");
  desktop.addEventListener("change", () => setMenu(false));
  addEventListener("scroll", scheduleScrollUI, { passive: true });
  addEventListener("resize", scheduleScrollUI, { passive: true });
  document.addEventListener("visibilitychange", () => slideshowController?.sync());
  motionPreference.addEventListener("change", () => { setupReveals(); slideshowController?.sync(); });
  pageCache.set(locale(), document.documentElement.outerHTML);
  applyConfig();
  setupReveals();
  setupSlideshow();
  updateScrollUI();
})();
