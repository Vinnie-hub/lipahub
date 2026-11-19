(function () {
  "use strict";
  var BASE = "https://lipahub.vercel.app/";
  var STORE = "lipahub-tools-username";
  var STORE_WA = "lipahub-tools-wa";
  var STORE_CC = "lipahub-tools-cc";
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

  /* Countries: [ISO, name, dial code, keepLeadingZero]. Africa first; keepLeadingZero = the 0 is part of the number. */
  var AFRICA = [
    ["DZ","Algeria","213"],["AO","Angola","244"],["BJ","Benin","229",1],["BW","Botswana","267"],["BF","Burkina Faso","226"],
    ["BI","Burundi","257"],["CM","Cameroon","237"],["CV","Cape Verde","238"],["CF","Central African Rep.","236"],["TD","Chad","235"],
    ["KM","Comoros","269"],["CG","Congo","242"],["CD","DR Congo","243"],["CI","C\u00f4te d'Ivoire","225",1],["DJ","Djibouti","253"],
    ["EG","Egypt","20"],["GQ","Equatorial Guinea","240"],["ER","Eritrea","291"],["SZ","Eswatini","268"],["ET","Ethiopia","251"],
    ["GA","Gabon","241"],["GM","Gambia","220"],["GH","Ghana","233"],["GN","Guinea","224"],["GW","Guinea-Bissau","245"],
    ["KE","Kenya","254"],["LS","Lesotho","266"],["LR","Liberia","231"],["LY","Libya","218"],["MG","Madagascar","261"],
    ["MW","Malawi","265"],["ML","Mali","223"],["MR","Mauritania","222"],["MU","Mauritius","230"],["MA","Morocco","212"],
    ["MZ","Mozambique","258"],["NA","Namibia","264"],["NE","Niger","227"],["NG","Nigeria","234"],["RW","Rwanda","250"],
    ["ST","S\u00e3o Tom\u00e9 & Pr\u00edncipe","239"],["SN","Senegal","221"],["SC","Seychelles","248"],["SL","Sierra Leone","232"],
    ["SO","Somalia","252"],["ZA","South Africa","27"],["SS","South Sudan","211"],["SD","Sudan","249"],["TZ","Tanzania","255"],
    ["TG","Togo","228"],["TN","Tunisia","216"],["UG","Uganda","256"],["ZM","Zambia","260"],["ZW","Zimbabwe","263"]
  ];
  var OTHER = [
    ["AE","United Arab Emirates","971"],["AU","Australia","61"],["CA","Canada","1"],["CN","China","86"],["FR","France","33"],
    ["DE","Germany","49"],["IN","India","91"],["IT","Italy","39",1],["NL","Netherlands","31"],["QA","Qatar","974"],
    ["SA","Saudi Arabia","966"],["GB","United Kingdom","44"],["US","United States","1"]
  ];
  var DEFAULT_CC = "KE";
  var BY_ISO = {};
  AFRICA.concat(OTHER).forEach(function (c) { BY_ISO[c[0]] = { iso: c[0], name: c[1], code: c[2], keep: !!c[3] }; });

  var input = $("#refInput"), hint = $("#refHint"), box = $("#linkBox"),
      copyBtn = $("#copyBtn"), waBtn = $("#waBtn"), status = $("#copyStatus"), statusTimer;
  var waInput = $("#waInput"), waHint = $("#waHint"), ccSelect = $("#ccSelect");
  var altWrap = $("#altLink"), altBox = $("#altBox"), altCopyBtn = $("#altCopyBtn");
  var current = "";

  function addOptions(parent, list) {
    list.forEach(function (c) {
      var o = document.createElement("option"); o.value = c[0]; o.textContent = c[1] + " (+" + c[2] + ")"; parent.appendChild(o);
    });
  }
  addOptions(ccSelect, AFRICA);
  var otherGroup = document.createElement("optgroup"); otherGroup.label = "Other countries";
  addOptions(otherGroup, OTHER); ccSelect.appendChild(otherGroup);
  ccSelect.value = DEFAULT_CC;

  /* Digits-only international number. "+" or "00" = code already included; otherwise the selected country's code
     is added (a leading 0 is dropped, and a pasted number that already starts with the code is kept as is). */
  function parseWa(raw, c) {
    var t = String(raw || "").trim();
    if (!t) return { empty: true, num: "" };
    var intl = /^(\+|00)/.test(t), d = t.replace(/\D/g, "");
    if (intl) d = d.replace(/^00/, "");
    else if (d.indexOf(c.code) === 0 && d.length - c.code.length >= 7) { /* already has the code */ }
    else { if (!c.keep) d = d.replace(/^0/, ""); d = c.code + d; }
    var ok = /^[1-9]\d{7,14}$/.test(d) && (d.indexOf("254") !== 0 || d.length === 12);
    return { empty: false, valid: ok, num: ok ? d : "" };
  }
  function prettyWa(n) { return "+" + n.replace(/(\d{3})(?=\d)/g, "$1 ").trim(); }

  /* Coded form of the number for the link: base36 + 1 check character. Decoded in script.js. */
  function encodeWa(d) {
    var n = BigInt(d);
    return n.toString(36) + (n % BigInt(997) % BigInt(36)).toString(36);
  }

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

    var w = parseWa(waInput.value, BY_ISO[ccSelect.value]);
    setSupportNumber(w.valid ? w.num : DEFAULT_WA);
    waHint.classList.remove("warn", "ok");
    if (w.empty) {
      waHint.textContent = "Leave empty to get a link without a WhatsApp number.";
    } else if (!w.valid) {
      waHint.classList.add("warn");
      waHint.textContent = "Not valid yet \u2014 check the number, or start with + and the country code.";
    } else {
      waHint.classList.add("ok");
      waHint.textContent = "Your link will open WhatsApp at " + prettyWa(w.num) + ".";
    }

    if (current) {
      var plain = BASE + "?ref=" + encodeURIComponent(current);
      var link = w.valid ? plain + "&c=" + encodeWa(w.num) : plain;
      box.textContent = link;
      box.classList.remove("is-empty");
      altWrap.hidden = !w.valid;
      altBox.textContent = plain;
      copyBtn.disabled = false;
      waBtn.classList.remove("is-disabled");
      waBtn.removeAttribute("aria-disabled");
      waBtn.href = "https://wa.me/?text=" + encodeURIComponent(
        "Join LipaHub and start earning online with hotel reviews, chats, Kiswahili teaching and more. Register free here: " + link);
      try { localStorage.setItem(STORE, current); } catch (e) {}
    } else {
      box.textContent = "Enter your username above to generate your link";
      box.classList.add("is-empty");
      altWrap.hidden = true;
      copyBtn.disabled = true;
      waBtn.classList.add("is-disabled");
      waBtn.setAttribute("aria-disabled", "true");
      waBtn.removeAttribute("href");
    }
  }

  function saveWa() { try { localStorage.setItem(STORE_WA, waInput.value.trim()); localStorage.setItem(STORE_CC, ccSelect.value); } catch (e) {} }
  waInput.addEventListener("input", function () {
    waInput.value = waInput.value.replace(/[^\d+\s()-]/g, "");
    update(false); saveWa();
  });
  ccSelect.addEventListener("change", function () { update(false); saveWa(); });

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

  function copyText(link) {
    function done(ok) { setStatus(ok ? "Link copied to clipboard!" : "Couldn't copy automatically \u2014 please select and copy the link."); }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(link).then(function () { done(true); }, function () { done(fallbackCopy(link)); });
    } else { done(fallbackCopy(link)); }
  }
  copyBtn.addEventListener("click", function () { if (current) copyText(box.textContent); });
  altCopyBtn.addEventListener("click", function () { if (current) copyText(altBox.textContent); });

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

  try {
    input.value = localStorage.getItem(STORE) || ""; waInput.value = localStorage.getItem(STORE_WA) || "";
    var cc = localStorage.getItem(STORE_CC); if (cc && BY_ISO[cc]) ccSelect.value = cc;
  } catch (e) {}
  update(false);

  var y = $("#year"); if (y) y.textContent = new Date().getFullYear();
})();
