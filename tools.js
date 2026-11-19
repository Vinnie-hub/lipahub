(function () {
  "use strict";
  var BASE = "https://lipahub.vercel.app/";
  var STORE = "lipahub-tools-username";
  var STORE_WA = "lipahub-tools-wa";
  var DEFAULT_WA = "254707995729"; /* default support number; used unless the person enters their own */
  var root = document.documentElement;
  var $ = function (s) { return document.querySelector(s); };

  /* Theme (shares the marketing site's saved preference) */
  var toggle = $("#themeToggle"), icon = toggle.querySelector("i");
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

  /* Generator */
  var input = $("#refInput"), hint = $("#refHint"), box = $("#linkBox"),
      copyBtn = $("#copyBtn"), waBtn = $("#waBtn"), status = $("#copyStatus"), statusTimer;
  var waInput = $("#waInput"), waHint = $("#waHint");
  var current = "";

  /* Turn what the person typed into digits-only international format.
     Kenyan local formats (0712…, 712…) get 254; "+" or "00" means the country code is already there. */
  function normalizeWa(raw) {
    var t = String(raw || "").trim();
    if (!t) return { empty: true, num: "" };
    var intl = /^(\+|00)/.test(t);
    var d = t.replace(/\D/g, "");
    if (/^00/.test(d)) d = d.slice(2);
    if (!intl) {
      if (/^0[17]\d{8}$/.test(d)) d = "254" + d.slice(1);
      else if (/^[17]\d{8}$/.test(d)) d = "254" + d;
    }
    var ok = /^\d{10,15}$/.test(d) && (d.indexOf("254") !== 0 || d.length === 12);
    return { empty: false, valid: ok, num: ok ? d : "" };
  }
  function prettyWa(n) { return "+" + n.replace(/^(254)(\d{3})(\d{3})(\d{3})$/, "$1 $2 $3 $4"); }

  function setStatus(msg) {
    status.textContent = msg;
    clearTimeout(statusTimer);
    if (msg) statusTimer = setTimeout(function () { status.textContent = ""; }, 3000);
  }

  function update(showWarn) {
    var raw = input.value.trim().replace(/^@+/, "");
    var cleaned = raw.replace(/[^A-Za-z0-9._-]/g, "").slice(0, 40);
    if (cleaned !== input.value) input.value = cleaned;
    hint.classList.toggle("warn", !!showWarn);
    hint.textContent = showWarn ? "Only letters, numbers, dots, dashes and underscores are allowed." : "";
    current = cleaned;

    var w = normalizeWa(waInput.value);
    setSupportNumber(w.valid ? w.num : DEFAULT_WA);
    waHint.classList.remove("warn", "ok");
    if (w.empty) {
      waHint.textContent = "The number will be used as a customer support contact";
    } else if (!w.valid) {
      waHint.classList.add("warn");
      waHint.textContent = "Not applied yet \u2014 enter a full WhatsApp number, e.g. 0712 345 678 or +254712345678.";
    } else if (w.num === DEFAULT_WA) {
      waHint.textContent = "That is already the default support number.";
    } else {
      waHint.classList.add("ok");
      waHint.textContent = "Support links will open WhatsApp at " + prettyWa(w.num) + ".";
    }

    if (current) {
      var link = BASE + "?ref=" + encodeURIComponent(current);
      box.textContent = link;
      box.classList.remove("is-empty");
      copyBtn.disabled = false;
      waBtn.classList.remove("is-disabled");
      waBtn.removeAttribute("aria-disabled");
      waBtn.href = "https://wa.me/?text=" + encodeURIComponent(
        "Join LipaHub and start earning online with hotel reviews, chats, Kiswahili teaching and more. Register free here: " + link);
      try { localStorage.setItem(STORE, current); } catch (e) {}
    } else {
      box.textContent = "Enter your username above to generate your link";
      box.classList.add("is-empty");
      copyBtn.disabled = true;
      waBtn.classList.add("is-disabled");
      waBtn.setAttribute("aria-disabled", "true");
      waBtn.removeAttribute("href");
    }
  }

  function saveWa() { try { localStorage.setItem(STORE_WA, waInput.value.trim()); } catch (e) {} }
  waInput.addEventListener("input", function () {
    waInput.value = waInput.value.replace(/[^\d+\s()-]/g, "");
    update(false); saveWa();
  });

  input.addEventListener("input", function () {
    var before = input.value.trim().replace(/^@+/, "");
    var after = before.replace(/[^A-Za-z0-9._-]/g, "");
    update(before !== after);
  });

  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
    document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
    return ok;
  }

  copyBtn.addEventListener("click", function () {
    if (!current) return;
    var link = box.textContent;
    function done(ok) { setStatus(ok ? "Link copied to clipboard!" : "Couldn't copy automatically — please select and copy the link."); }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(link).then(function () { done(true); }, function () { done(fallbackCopy(link)); });
    } else { done(fallbackCopy(link)); }
  });

  waBtn.addEventListener("click", function (e) {
    if (!current) { e.preventDefault(); return; }
    waBtn.target = "_blank"; waBtn.rel = "noopener";
  });

  /* WhatsApp assistance */
  var WA_NUMBER = DEFAULT_WA;
  var WA_MESSAGES = {
    website:
      "Hello, I'm interested in website development services and would like to discuss my project.",
    guidance:
      "Hello, I would like to know how to use my Lipahub marketing link.",
    support: "Hello, I need some assistance. Could you please help me?",
  };
  var assistBtn = $("#assistBtn"), modal = $("#assistModal");
  var options = modal.querySelectorAll(".assist-option");
  function setSupportNumber(num) {
    WA_NUMBER = num || DEFAULT_WA;
    Array.prototype.forEach.call(options, function (a) {
      a.href = "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(WA_MESSAGES[a.getAttribute("data-service")]);
    });
  }
  Array.prototype.forEach.call(options, function (a) {
    a.addEventListener("click", function () { setTimeout(closeModal, 150); });
  });
  setSupportNumber(DEFAULT_WA);
  function openModal() {
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    options[0].focus();
  }
  function closeModal() {
    if (modal.hidden) return;
    modal.hidden = true;
    document.body.style.overflow = "";
    assistBtn.focus();
  }
  assistBtn.addEventListener("click", openModal);

  /* Always-visible preview next to the button; the X hides it for this visit */
  var preview = $("#assistPreview");
  $("#assistPreviewBody").addEventListener("click", openModal);
  $("#assistPreviewClose").addEventListener("click", function () { preview.hidden = true; assistBtn.focus(); });
  modal.addEventListener("click", function (e) { if (e.target.closest("[data-close]")) closeModal(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });

  try { input.value = localStorage.getItem(STORE) || ""; waInput.value = localStorage.getItem(STORE_WA) || ""; } catch (e) {}
  update(false);

  var y = $("#year"); if (y) y.textContent = new Date().getFullYear();
})();
