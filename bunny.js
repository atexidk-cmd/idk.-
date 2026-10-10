/* bunny.js - the new mascot: layered inline-SVG builder, palettes, small runtime.
   Visuals only. Styles and every keyframe live in bunny.css. Globals kept: bunny(), avatar(), TINTS. */
(function (W) {
  "use strict";
  var D = document, R = D.documentElement;

  /* ---------- palettes (the colors themselves live in bunny.css as --bn-* variables) ---------- */
  var KEYS = ["pink", "butter", "mint", "sky", "lilac", "cocoa"];
  /* [saved id, palette key]. Saved ids are unchanged, so existing users keep their pick. */
  var TINTS = [["meadow", "mint"], ["blush", "pink"], ["sky", "sky"], ["sun", "butter"], ["lilac", "lilac"], ["charcoal", "cocoa"]];
  /* legacy hex tints that older call sites or stored values may still pass */
  var LEG = { "#86C13B": "mint", "#F3A9C4": "pink", "#7CB8E8": "sky", "#F5C85C": "butter", "#9D8ED8": "lilac", "#4A4C3A": "cocoa" };
  function pal(t) {
    if (!t) return "pink";
    if (KEYS.indexOf(t) >= 0) return t;
    for (var i = 0; i < TINTS.length; i++) if (TINTS[i][0] === t) return TINTS[i][1];
    return LEG[String(t).toUpperCase()] || "pink";
  }

  /* ---------- shared parts, defined once as strings ---------- */
  var INK = "var(--bn-ink)", CHK = "var(--bn-cheek)";
  var ARC = 'fill="none" stroke="' + INK + '" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"';
  function dots(rx, ry, hr) {
    return '<g fill="' + INK + '"><ellipse cx="40" cy="74" rx="' + rx + '" ry="' + ry + '"/><ellipse cx="80" cy="74" rx="' + rx + '" ry="' + ry + '"/></g>' +
      '<g fill="#fff"><circle cx="41.3" cy="72.3" r="' + hr + '"/><circle cx="81.3" cy="72.3" r="' + hr + '"/></g>';
  }
  var HEARTP = function (x, y) { return '<path d="M' + x + ' ' + (y + 5) + 'l-6-6a3.6 3.6 0 0 1 6-4 3.6 3.6 0 0 1 6 4z" fill="' + CHK + '"/>'; };
  var EYES = {
    open: '<g class="eyes ey blink">' + dots(3.8, 4.6, 1.3) + '</g>',
    wide: '<g class="eyes ey blink">' + dots(4.7, 5.9, 1.7) + '</g>',
    arc: '<g class="eyes ey" ' + ARC + '><path d="M33 77q7-10 14 0M73 77q7-10 14 0"/></g>',
    sleep: '<g class="eyes ey" ' + ARC + '><path d="M33 73q7 7 14 0M73 73q7 7 14 0"/></g>',
    sq: '<g class="eyes ey" ' + ARC + '><path d="M33 69l10 5-10 5M87 69l-10 5 10 5"/></g>',
    heart: '<g class="eyes ey">' + HEARTP(40, 72) + HEARTP(80, 72) + '</g>'
  };
  var SQ = '<g class="eyes-sq" ' + ARC + '><path d="M33 69l10 5-10 5M87 69l-10 5 10 5"/></g>';
  var TONGUE = function (d) { return '<path d="' + d + '" fill="' + CHK + '"/>'; };
  var LINE = 'fill="none" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"';
  var MOUTH = {
    w: '<path ' + LINE + ' d="M53 80q3.5 6 7 0q3.5 6 7 0"/>',
    open: '<path d="M51 79h18q0 12-9 12t-9-12z" fill="' + INK + '"/>' + TONGUE("M54.5 87.5q5.5-3.5 11 0q-1 3.5-5.5 3.5t-5.5-3.5z"),
    laugh: '<path d="M48 78h24q0 15-12 15t-12-15z" fill="' + INK + '"/>' + TONGUE("M53.5 88.5q6.5-4.5 13 0q-1.5 4.5-6.5 4.5t-6.5-4.5z"),
    o: '<ellipse cx="60" cy="85" rx="3" ry="3.8" fill="' + INK + '"/>',
    chew: '<ellipse cx="60" cy="85" rx="4.2" ry="3.4" fill="' + INK + '"/>',
    tiny: '<ellipse cx="60" cy="85" rx="2.2" ry="2.8" fill="' + INK + '"/>',
    frown: '<path ' + LINE + ' d="M54 87q6-5 12 0"/>',
    flat: '<path ' + LINE + ' d="M56 85h8"/>',
    thirsty: '<path ' + LINE + ' d="M54 86q6-4 12 0"/>' + TONGUE("M57.5 86.6q2.5 6 5 0z")
  };
  var BROW = '<g class="brow" fill="none" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"><path d="M32 64l11-5M88 64l-11-5"/></g>';
  /* expression = [eyes, mouth, brow?, puffed cheeks?] - only eyes/mouth/brow ever change */
  var EXPR = {
    neutral: ["open", "w"], glossy: ["open", "w"], happy: ["arc", "open"], squint: ["sq", "open"],
    sleep: ["sleep", "tiny"], love: ["heart", "open"], wide: ["wide", "o"],
    sad: ["open", "frown", 1], thirsty: ["wide", "thirsty", 1],
    puff: ["open", "flat", 0, 1], drinking: ["wide", "o", 0, 1],
    hug: ["arc", "w"], cheer: ["sq", "laugh"], chew: ["open", "chew"], talk: ["open", "open"]
  };

  /* pose = left / right arm angle (css vars), raised arms get .pawup */
  var POSE = { idle: 1, wave: 1, cheer: 1, hug: 1, nibble: 1, pat: 1 };

  /* ---------- decor (hearts / stars / z / confetti), animated by css ---------- */
  var GOLD = "#ffc928", LAV = "#b98cff", ORG = "#ffa430", GRN = "#4fc36b";
  function fxH(x, y, d, s) { return '<g transform="translate(' + x + ' ' + y + ') scale(' + (s || 1) + ')"><path class="fx-h" style="--fd:' + d + 's" d="M0 7l-7-7a4 4 0 0 1 7-5 4 4 0 0 1 7 5z" fill="' + CHK + '"/></g>'; }
  function fxS(x, y, d, c, s, cls) { return '<g transform="translate(' + x + ' ' + y + ') scale(' + (s || 1) + ')"><path class="fx-s ' + (cls || "") + '" style="--fd:' + d + 's" d="M0-9L2.5-2.5 9 0 2.5 2.5 0 9-2.5 2.5-9 0-2.5-2.5Z" fill="' + c + '"/></g>'; }
  function fxZ(x, y, d, z) { return '<text class="fx-z" style="--fd:' + d + 's" x="' + x + '" y="' + y + '" font-size="' + z + '" font-weight="800" fill="' + LAV + '" font-family="sans-serif">z</text>'; }
  function fxK(x, d, c, dx) { return '<g transform="translate(' + x + ' 4)"><rect class="fx-k" style="--fd:' + d + 's;--dx:' + dx + 'px" width="6" height="9" rx="1.5" fill="' + c + '"/></g>'; }
  var BUBBLE = '<g class="fx-b"><circle cx="92" cy="38" r="3" fill="#fff"/><circle cx="100" cy="28" r="4.5" fill="#fff"/><ellipse cx="112" cy="9" rx="17" ry="13" fill="#fff"/><path class="fx-beat" d="M112 16l-8-8a4.5 4.5 0 0 1 8-5 4.5 4.5 0 0 1 8 5z" fill="' + CHK + '"/></g>';
  var HAT = '<g class="hat"><g transform="rotate(8 60 36)"><path d="M49 38L60 4L71 38Z" fill="' + LAV + '"/><path d="M53 27l14-3M51.5 33l17-3.5" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none"/><circle cx="60" cy="4" r="5" fill="' + GOLD + '"/></g></g>';
  var CONF = fxK(16, 0, CHK, -6) + fxK(42, .4, GOLD, 4) + fxK(76, .9, LAV, -4) + fxK(104, .2, GRN, 6) + fxK(60, 1.2, ORG, -8);
  var DECOR = {
    sleepy: fxZ(92, 34, 0, 20) + fxZ(102, 20, 1.2, 15) + fxZ(84, 46, 2.4, 12),
    love: fxH(14, 44, 0) + fxH(106, 38, .9) + fxH(60, 14, 1.8),
    welcome: fxH(10, 52, 0, 1.2) + fxH(110, 44, .9, 1.2) + fxH(58, 14, 1.8, 1.1) + fxS(100, 10, .5, GOLD, .9),
    excite: fxS(12, 30, 0, GOLD, 1) + fxS(110, 26, .6, LAV, .9) + fxS(108, 72, 1.2, GOLD, .8),
    party: CONF + fxS(10, 28, .5, GOLD, .8) + fxS(112, 34, 1.1, LAV, .8),
    ready: CONF + fxK(30, .7, ORG, 8) + fxK(90, .3, CHK, -8) + fxS(8, 40, .4, GOLD, 1.2) + fxS(112, 30, .9, LAV, 1) + fxS(100, 80, 1.3, GOLD, .9),
    perfect: fxH(12, 50, 0) + fxH(108, 42, .2) + fxS(60, 4, .1, GOLD, 1) + fxS(104, 12, .3, LAV, .8),
    preview: fxS(6, 44, 0, GOLD, 1) + fxS(114, 40, .7, LAV, .9) + fxS(98, 4, 1.3, GOLD, .8),
    name: fxS(10, 36, 0, GOLD, 1, "fx-sp") + fxS(112, 30, .15, LAV, .9, "fx-sp") + fxS(104, 70, .3, GOLD, .8, "fx-sp"),
    wait: BUBBLE + fxH(10, 62, .3) + fxH(24, 34, 1.4),
    partner: fxH(6, 50, 0) + fxH(112, 42, 1.4) + fxH(100, 16, 2.4),
    cheered: fxH(14, 40, 0) + fxH(104, 34, .15) + fxH(58, 10, .3) + fxH(30, 20, .5) + fxH(88, 16, .7) + fxS(112, 60, .2, GOLD, .8),
    water: '<g class="fx-rip"><ellipse cx="60" cy="137" rx="30" ry="5"/><ellipse class="r2" cx="60" cy="137" rx="30" ry="5"/></g>' +
      '<g class="fx-bubs"><circle cx="60" cy="82" r="2.6"/><circle class="b2" cx="64" cy="82" r="1.9"/><circle class="b3" cx="57" cy="82" r="3.2"/></g>' +
      '<g class="fx-win">' + fxH(14, 52, 0) + fxH(108, 46, .5) + fxS(10, 24, .2, GOLD, 1) + fxS(112, 28, .9, LAV, .9) + fxS(104, 86, 1.4, GOLD, .8) + '</g>',
    meal: '<g class="fx-cr">' + [[-22, -8, 0], [-8, -16, 1], [8, -14, 2], [22, -6, 3], [0, -22, 4]].map(function (c, i) {
      return '<rect style="--x:' + c[0] + 'px;--y:' + (c[1] + 30) + 'px;--cd:' + (i * .05) + 's" x="58" y="88" width="4" height="4" rx="1" fill="' + (i % 2 ? GOLD : ORG) + '"/>';
    }).join("") + '</g>' + '<g class="fx-win">' + fxS(12, 30, .2, GOLD, 1) + fxS(108, 26, .9, LAV, .9) + '</g>'
  };
  /* contexts that wear the party hat */
  var HATTED = { party: 1, ready: 1, perfect: 1 };
  var POKE = fxH(94, 34, 0, 1.1).replace('class="fx-h"', 'class="fx-pk"');

  /* ---------- the builder ---------- */
  var PARTS = {
    shadow: '<ellipse class="shadow" cx="60" cy="137.5" rx="34" ry="4.6"/>',
    tail: '<g class="tail"><circle cx="86.5" cy="126" r="8.6" fill="var(--bn-shade)"/></g>',
    body: '<g class="body"><ellipse cx="60" cy="114" rx="25" ry="21" fill="var(--bn-body)"/>' +
      '<ellipse cx="60" cy="105.5" rx="26" ry="6.5" fill="var(--bn-shade)"/>' +
      '<ellipse class="belly" cx="60" cy="119" rx="9.5" ry="10.5" fill="var(--bn-light)"/>' +
      '<g class="feet" fill="var(--bn-body)"><ellipse cx="46" cy="134" rx="10.5" ry="5"/><ellipse cx="74" cy="134" rx="10.5" ry="5"/></g></g>',
    earL: '<g class="ear el"><g transform="rotate(-9 46 56)"><ellipse cx="42" cy="30" rx="11.5" ry="27" fill="var(--bn-body)"/><ellipse cx="42.5" cy="33" rx="5.8" ry="17" fill="var(--bn-ear,var(--bn-light))"/><ellipse cx="45" cy="54" rx="9.5" ry="4.4" fill="var(--bn-shade)"/></g></g>',
    earR: '<g class="ear er"><g transform="rotate(9 74 56)"><ellipse cx="78" cy="30" rx="11.5" ry="27" fill="var(--bn-body)"/><ellipse cx="77.5" cy="33" rx="5.8" ry="17" fill="var(--bn-ear,var(--bn-light))"/><ellipse cx="75" cy="54" rx="9.5" ry="4.4" fill="var(--bn-shade)"/></g></g>',
    head: '<ellipse cx="60" cy="68" rx="46" ry="36" fill="var(--bn-body)"/>',
    cheeks: '<g class="cheeks"><ellipse class="bxcheek" cx="31" cy="83" rx="8.6" ry="5.8" fill="var(--bn-cheek)"/><ellipse class="bxcheek" cx="89" cy="83" rx="8.6" ry="5.8" fill="var(--bn-cheek)"/></g>',
    gg: '<g class="gg"><g fill="rgba(170,220,255,.4)" stroke="#3c4a7a" stroke-width="3"><circle cx="40" cy="74" r="12.5"/><circle cx="80" cy="74" r="12.5"/></g><path d="M52.5 74h15M27.5 72L16 68M92.5 72L104 68" stroke="#3c4a7a" stroke-width="3" stroke-linecap="round" fill="none"/></g>'
  };
  function arm(side, up) {
    var x = side < 0 ? 37 : 83, k = side < 0 ? "pwl" : "pwr", dx = side < 0 ? 2.5 : -2.5;
    return '<g class="pw ' + k + (up ? " pawup" : "") + '"><ellipse cx="' + x + '" cy="115" rx="5.8" ry="10.5" fill="var(--bn-body)"/><circle cx="' + x + '" cy="124" r="6" fill="var(--bn-body)"/><ellipse cx="' + (x + dx) + '" cy="117" rx="2" ry="6.5" fill="var(--bn-shade)"/></g>';
  }

  function bunny(o) {
    o = o || {};
    var key = pal(o.tint), s = o.size || 120, e = EXPR[o.expr || "glossy"] || EXPR.glossy, cx = o.ctx || "",
      pose = POSE[o.pose] ? o.pose : "idle", up = pose === "wave" || pose === "cheer",
      eyes = EYES[e[0]], open = e[0] === "open" || e[0] === "wide",
      d = (-Math.random() * 7).toFixed(2), fd = (Math.random() * 1.2).toFixed(2);
    var cls = "bun bn-" + key + " p-" + pose + (cx ? " bx bx-" + cx : "") + (open ? " eo" : "") + (e[3] ? " puffed" : "") +
      (o.paws ? " paws" : "") + (e[0] === "sleep" ? " sl" : "");
    return '<svg class="' + cls + '" width="' + s + '" height="' + Math.round(s * 1.167) + '" viewBox="0 0 120 140" style="--d:' + d + 's;--fo:' + fd + 's" aria-hidden="true" focusable="false">' +
      PARTS.shadow +
      '<g class="rig">' + PARTS.tail + PARTS.body +
      '<g class="hd">' + PARTS.earL + PARTS.earR + '<g class="head">' + PARTS.head +
      '<g class="face">' + PARTS.cheeks + eyes + SQ + '<g class="mouth">' + MOUTH[e[1]] + '</g>' + (e[2] ? BROW : "") + '</g>' +
      (o.goggles ? PARTS.gg : "") + (HATTED[cx] ? HAT : "") + '</g></g>' +
      arm(-1, up && pose !== "wave") + arm(1, up) + '</g>' +
      '<g class="fx">' + (DECOR[cx] || "") + POKE + '</g></svg>';
  }

  /* palette chip: round body-color swatch with a belly-color dot (36px sheet / 64px onboarding) */
  function chip(t, size) {
    return '<span class="bnchip bn-' + pal(t) + '" style="--cs:' + (size || 36) + 'px"><i></i></span>';
  }
  function avatar(id) {
    var t = TINTS.filter(function (x) { return x[0] === id; })[0];
    return t ? bunny({ tint: t[1], size: 38, expr: "happy", ctx: "av" })
      : '<b style="font:800 18px var(--df)">' + esc((state.profile.displayName || "B").charAt(0).toUpperCase()) + '</b>';
  }

  /* ---------- tiny runtime ---------- */
  function rm() { return R.classList.contains("rm"); }
  function flash(el, c, ms) {
    if (!el) return;
    el.classList.remove(c); void el.getBoundingClientRect(); el.classList.add(c);
    clearTimeout(el["_t" + c]); el["_t" + c] = setTimeout(function () { el.classList.remove(c); }, ms);
  }
  var BN = {
    pal: pal, chip: chip,
    poke: function (sv) { if (!rm()) flash(sv, "poke", 800); else flash(sv, "poke", 400); },
    wave: function (sv) { if (!rm()) flash(sv, "wv", 2000); },
    spark: function (sv) { if (!rm()) flash(sv, "spark", 1000); },
    /* profile sheet preview: build once, then swap the palette class and shimmer */
    preview: function (host, id) {
      var t = TINTS.filter(function (x) { return x[0] === id; })[0] || TINTS[1], k = pal(t[1]), sv = host.querySelector(".bun");
      if (!sv) { host.innerHTML = bunny({ tint: k, size: 84, expr: "happy", ctx: "preview" }); return; }
      sv.setAttribute("class", sv.getAttribute("class").replace(/bn-\w+/, "bn-" + k));
      if (!rm()) flash(sv, "shim", 700);
    }
  };
  /* one shared scheduler: random blink (3-6 s), ear twitch (8-14 s), only for bunnies on screen */
  function tick() {
    if (D.hidden || rm()) return;
    var now = performance.now(), L = D.querySelectorAll(".bun"), vh = W.innerHeight, vw = W.innerWidth, i, b, r, on;
    for (i = 0; i < L.length; i++) {
      b = L[i]; r = b.getBoundingClientRect();
      on = r.width > 0 && r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw;
      if (b._on !== on) { b._on = on; b.classList.toggle("off", !on); }
      if (!on) continue;
      if (!b._nb) { b._nb = now + 600 + Math.random() * 4400; b._nt = now + 3000 + Math.random() * 9000; }
      if (now > b._nb) { b._nb = now + 3000 + Math.random() * 3000; if (b.classList.contains("eo")) flash(b, "bk", 190); }
      if (now > b._nt) { b._nt = now + 8000 + Math.random() * 6000; flash(b, Math.random() < .5 ? "twl" : "twr", 700); }
    }
  }
  setInterval(tick, 350);
  /* pause every bunny animation while the app is hidden */
  function vis() { R.classList.toggle("bn-bg", D.hidden); }
  D.addEventListener("visibilitychange", vis); vis();
  /* sparkle while the buddy name is typed (onboarding) */
  D.addEventListener("input", function (e) {
    if (e.target && e.target.id === "onbBuddy") BN.spark(D.querySelector(".bun.bx-name"));
  });

  W.TINTS = TINTS; W.bunny = bunny; W.avatar = avatar; W.BN = BN;
})(window);
