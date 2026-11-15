(function () {
  "use strict";
  var root = document.documentElement;
  root.classList.add("js");

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- Theme ---------- */
  var toggle = $("#themeToggle");
  var icon = $("i", toggle);
  function setTheme(light, persist) {
    root.classList.toggle("light-mode", light);
    icon.className = "fas " + (light ? "fa-sun" : "fa-moon");
    toggle.setAttribute("aria-label", light ? "Switch to dark mode" : "Switch to light mode");
    var meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", light ? "#f8fafc" : "#0b0f2b");
    if (persist) { try { localStorage.setItem("lipahub-theme", light ? "light" : "dark"); } catch (e) {} }
  }
  setTheme(root.classList.contains("light-mode"), false);
  toggle.addEventListener("click", function () { setTheme(!root.classList.contains("light-mode"), true); });

  /* ---------- Mobile nav ---------- */
  var hamburger = $("#hamburger"), nav = $("#mainNav");
  function closeNav() { nav.classList.remove("open"); hamburger.setAttribute("aria-expanded", "false"); }
  hamburger.addEventListener("click", function () {
    var open = nav.classList.toggle("open");
    hamburger.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", function (e) {
    if (!nav.contains(e.target) && !hamburger.contains(e.target)) closeNav();
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeNav(); });
  $$('a[href^="#"]', nav).forEach(function (a) { a.addEventListener("click", closeNav); });

  /* ---------- Header shadow & progress bar ---------- */
  var header = $("#siteHeader"), bar = $("#scrollProgress"), ticking = false;
  function onScroll() {
    var y = window.scrollY, h = document.documentElement.scrollHeight - window.innerHeight;
    header.classList.toggle("scrolled", y > 10);
    bar.style.width = (h > 0 ? (y / h) * 100 : 0) + "%";
    ticking = false;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ---------- Active nav link ---------- */
  var links = $$('.main-nav a[href^="#"]:not(.nav-cta)');
  if ("IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          links.forEach(function (l) { l.classList.toggle("active", l.getAttribute("href") === "#" + en.target.id); });
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    links.forEach(function (l) { var s = $(l.getAttribute("href")); if (s) spy.observe(s); });

    /* ---------- Reveal on scroll ---------- */
    var rev = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); rev.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    $$(".reveal").forEach(function (el, i) {
      el.style.transitionDelay = (i % 4) * 70 + "ms";
      rev.observe(el);
    });
  } else {
    $$(".reveal").forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- FAQ: one open at a time ---------- */
  var items = $$("#accordion details");
  items.forEach(function (d) {
    d.addEventListener("toggle", function () {
      if (d.open) items.forEach(function (o) { if (o !== d) o.open = false; });
    });
  });

  /* ---------- Countries ----------
     EDIT THIS LIST to match your real data.
     fee = activation fee = minimum withdrawal. Method keys: mpesa, airtel, mtn.
     The first methods are the common local default for that country. */
  var METHODS = { mpesa: "M-Pesa", airtel: "Airtel Money", mtn: "MTN MoMo",
    orange: "Orange Money", wave: "Wave", ecocash: "EcoCash", lumicash: "Lumicash", bank: "Bank transfer", momo: "Local mobile money" };
  var MAIN = ["mpesa", "airtel", "mtn"];
  var COUNTRIES = [
    { name: "Kenya", code: "ke", fee: "KSH 550", methods: ["mpesa", "airtel"] },
    { name: "Uganda", code: "ug", fee: "UGX 18,500", methods: ["mtn", "airtel"] },
    { name: "Tanzania", code: "tz", fee: "TSH 11,000", methods: ["mpesa", "airtel"] },
    { name: "Rwanda", code: "rw", fee: "RF 7,000", methods: ["mtn", "airtel"] },
    { name: "Nigeria", code: "ng", fee: "NGN 8,000", methods: ["mtn", "airtel"] },
    { name: "Malawi", code: "mw", fee: "MWK 26,000", methods: ["airtel"] },
    { name: "Zambia", code: "zm", fee: "ZK 110", methods: ["mtn", "airtel"] },
    { name: "Ghana", code: "gh", fee: "GHC 85", methods: ["mtn"] },
    { name: "Cameroon", code: "cm", fee: "XAF 3,500", methods: ["mtn"] },
    { name: "Botswana", code: "bw", fee: "BWP 90", methods: ["orange"] },
    { name: "Burundi", code: "bi", fee: "FBu 25,000", methods: ["lumicash", "ecocash"] },
    { name: "Zimbabwe", code: "zw", fee: "ZWD 2,500", methods: ["ecocash"] },
    { name: "Mozambique", code: "mz", fee: "MZN 300", methods: ["mpesa"] },
    { name: "South Africa", code: "za", fee: "ZAR 70", methods: ["bank"] },
    { name: "DR Congo", code: "cd", fee: "CDF 12,500", methods: ["mpesa", "airtel"] },
    { name: "South Sudan", code: "ss", fee: "SSP 20,000", methods: ["mtn"] },
    { name: "Senegal", code: "sn", fee: "XOF 3,500", methods: ["orange", "wave"] },
    { name: "Burkina Faso", code: "bf", fee: "XOF 3,500", methods: ["orange"] },
    { name: "Other countries", code: "", fee: "USD 5", methods: ["momo"], other: true }
  ];

  var grid = $("#countryGrid"), empty = $("#emptyNote"), search = $("#countrySearch");
  var tabs = $$(".method-tab"), method = "all";

  function card(c) {
    var chips = c.methods.map(function (m) {
      var cls = MAIN.indexOf(m) > -1 ? m : "local";
      return '<span class="chip ' + cls + '">' + METHODS[m] + "</span>";
    }).join("");
    var flag = c.code
      ? '<img class="cc-flag" src="https://flagcdn.com/w80/' + c.code + '.png" alt="" width="36" height="26" loading="lazy" onerror="this.style.visibility=\'hidden\'">'
      : '<span class="cc-globe" aria-hidden="true">\uD83C\uDF0D</span>';
    return '<article class="country-card"><div class="cc-head">' + flag + '<span class="cc-name">' + c.name + "</span>" +
      '<span class="cc-amount" title="Activation fee and minimum withdrawal">' + c.fee + "</span></div>" +
      '<div class="cc-methods">' + chips + "</div></article>";
  }

  function render() {
    var q = search.value.trim().toLowerCase();
    var list = COUNTRIES.filter(function (c) {
      var okName = !q || c.name.toLowerCase().indexOf(q) > -1;
      var okM = method === "all" ||
        (method === "local" ? c.methods.some(function (m) { return MAIN.indexOf(m) < 0; }) : c.methods.indexOf(method) > -1);
      return okName && okM;
    });
    grid.innerHTML = list.map(card).join("");
    empty.hidden = list.length > 0;
  }

  search.addEventListener("input", render);
  tabs.forEach(function (t) {
    t.addEventListener("click", function () {
      method = t.dataset.method;
      tabs.forEach(function (o) {
        var on = o === t; o.classList.toggle("active", on); o.setAttribute("aria-pressed", String(on));
      });
      render();
    });
  });
  render();

  /* ---------- Install app (PWA) ---------- */
  var installBtn = $("#installBtn"), hint = $("#installHint"), deferred = null;
  var standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  function hideInstall() { installBtn.hidden = true; hint.hidden = true; }

  if (standalone) { hideInstall(); }
  else {
    if (isIOS) installBtn.hidden = false;
    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault(); deferred = e; installBtn.hidden = false;
    });
  }
  installBtn.addEventListener("click", function () {
    if (deferred) {
      deferred.prompt();
      deferred.userChoice.then(function (r) { if (r.outcome === "accepted") hideInstall(); deferred = null; });
    } else if (isIOS) { hint.hidden = !hint.hidden; }
  });
  $("#hintClose").addEventListener("click", function () { hint.hidden = true; });
  window.addEventListener("appinstalled", hideInstall);
  window.matchMedia("(display-mode: standalone)").addEventListener &&
    window.matchMedia("(display-mode: standalone)").addEventListener("change", function (e) { if (e.matches) hideInstall(); });

  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
  }

  var y = $("#year"); if (y) y.textContent = new Date().getFullYear();
})();
