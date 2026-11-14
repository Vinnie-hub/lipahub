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

  /* ---------- Header shadow, progress bar, back-to-top ---------- */
  var header = $("#siteHeader"), bar = $("#scrollProgress"), toTop = $("#toTop"), ticking = false;
  function onScroll() {
    var y = window.scrollY, h = document.documentElement.scrollHeight - window.innerHeight;
    header.classList.toggle("scrolled", y > 10);
    bar.style.width = (h > 0 ? (y / h) * 100 : 0) + "%";
    toTop.classList.toggle("show", y > 700);
    ticking = false;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();
  toTop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });

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

  /* ---------- Payout explorer ----------
     EDIT THIS LIST to match your real payout coverage.
     Method keys: mpesa, airtel, mtn. An empty list shows "contact support". */
  var METHODS = { mpesa: "M-Pesa", airtel: "Airtel Money", mtn: "MTN Mobile Money" };
  var COUNTRIES = [
    { name: "Kenya", methods: ["mpesa", "airtel"] },
    { name: "Uganda", methods: ["mtn", "airtel"] },
    { name: "Tanzania", methods: ["mpesa", "airtel"] },
    { name: "Rwanda", methods: ["mtn", "airtel"] },
    { name: "Burundi", methods: [] },
    { name: "Malawi", methods: ["airtel"] },
    { name: "Cameroon", methods: ["mtn"] },
    { name: "Nigeria", methods: ["mtn", "airtel"] },
    { name: "Ghana", methods: ["mtn"] },
    { name: "DR Congo", methods: ["mpesa", "airtel"] },
    { name: "Mozambique", methods: ["mpesa"] },
    { name: "Botswana", methods: [] },
    { name: "South Sudan", methods: ["mtn"] },
    { name: "Zambia", methods: ["mtn", "airtel"] },
    { name: "Zimbabwe", methods: [] },
    { name: "South Africa", methods: [] }
  ];

  var wrap = $("#countries"), info = $("#countryInfo"), tabs = $$(".method-tab");
  var currentMethod = "all", selected = null;

  COUNTRIES.forEach(function (c) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "country-pill"; b.textContent = c.name;
    b.addEventListener("click", function () { selected = c; render(); });
    c.el = b; wrap.appendChild(b);
  });

  function names(list) { return list.map(function (m) { return METHODS[m]; }); }
  function join(a) { return a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]; }

  function render() {
    COUNTRIES.forEach(function (c) {
      var match = currentMethod === "all" || c.methods.indexOf(currentMethod) > -1;
      c.el.classList.toggle("dim", !match);
      c.el.classList.toggle("selected", selected === c);
    });
    if (selected) {
      info.innerHTML = selected.methods.length
        ? "<strong>" + selected.name + ":</strong> withdraw via " + join(names(selected.methods)) + "."
        : "<strong>" + selected.name + ":</strong> please <a href=\"https://wa.me/254729743223\" target=\"_blank\" rel=\"noopener\">contact support</a> for withdrawal options.";
    } else if (currentMethod !== "all") {
      var n = COUNTRIES.filter(function (c) { return c.methods.indexOf(currentMethod) > -1; }).length;
      info.innerHTML = "<strong>" + METHODS[currentMethod] + "</strong> is available in " + n + " of our " + COUNTRIES.length + " countries.";
    } else {
      info.textContent = "Select a country to see how you can withdraw.";
    }
  }

  tabs.forEach(function (t) {
    t.addEventListener("click", function () {
      currentMethod = t.dataset.method; selected = null;
      tabs.forEach(function (o) {
        var on = o === t; o.classList.toggle("active", on); o.setAttribute("aria-selected", String(on));
      });
      render();
    });
  });
  render();

  var y = $("#year"); if (y) y.textContent = new Date().getFullYear();
})();
