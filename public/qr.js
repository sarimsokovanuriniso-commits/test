// Minimal QR Code generator (byte mode, ECC level M, versions 1-40). Based on the standard algorithm.
(function (root) {
  var ECC = [-1,10,16,26,18,24,16,18,22,22,26,30,22,22,24,24,28,28,26,26,26,26,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28];
  var BLK = [-1,1,1,1,2,2,4,4,4,5,5,5,8,9,9,10,10,11,13,14,16,17,17,18,20,21,23,25,26,28,29,31,33,35,37,38,40,43,45,47,49];

  function rawModules(v) {
    var r = (16 * v + 128) * v + 64;
    if (v >= 2) {
      var na = Math.floor(v / 7) + 2;
      r -= (25 * na - 10) * na - 55;
      if (v >= 7) r -= 36;
    }
    return r;
  }
  function dataCodewords(v) { return Math.floor(rawModules(v) / 8) - ECC[v] * BLK[v]; }

  // GF(256) Reed-Solomon
  function mul(x, y) { var z = 0; for (var i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; } return z; }
  function rsDivisor(deg) {
    var r = []; for (var i = 0; i < deg - 1; i++) r.push(0); r.push(1);
    var root = 1;
    for (i = 0; i < deg; i++) {
      for (var j = 0; j < r.length; j++) { r[j] = mul(r[j], root); if (j + 1 < r.length) r[j] ^= r[j + 1]; }
      root = mul(root, 2);
    }
    return r;
  }
  function rsRemainder(data, div) {
    var r = div.map(function () { return 0; });
    data.forEach(function (b) {
      var f = b ^ r.shift(); r.push(0);
      div.forEach(function (c, i) { r[i] ^= mul(c, f); });
    });
    return r;
  }

  function utf8(str) {
    var out = [], e = unescape(encodeURIComponent(str));
    for (var i = 0; i < e.length; i++) out.push(e.charCodeAt(i));
    return out;
  }

  function encode(text) {
    var bytes = utf8(text), ver, cap;
    for (ver = 1; ver <= 40; ver++) {
      var ccbits = ver < 10 ? 8 : 16;
      if (4 + ccbits + bytes.length * 8 <= dataCodewords(ver) * 8) break;
    }
    if (ver > 40) throw new Error("Matn juda uzun");
    var bits = [];
    function put(val, len) { for (var i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); }
    put(4, 4); put(bytes.length, ver < 10 ? 8 : 16);
    bytes.forEach(function (b) { put(b, 8); });
    cap = dataCodewords(ver) * 8;
    put(0, Math.min(4, cap - bits.length));
    while (bits.length % 8) bits.push(0);
    for (var pad = 0xEC; bits.length < cap; pad ^= 0xEC ^ 0x11) put(pad, 8);
    var data = [];
    for (var i = 0; i < bits.length; i += 8) { var b = 0; for (var k = 0; k < 8; k++) b = (b << 1) | bits[i + k]; data.push(b); }

    // split into blocks, add ECC, interleave
    var nb = BLK[ver], el = ECC[ver], raw = Math.floor(rawModules(ver) / 8);
    var shortCount = nb - raw % nb, shortLen = Math.floor(raw / nb);
    var blocks = [], div = rsDivisor(el);
    for (i = 0, k = 0; i < nb; i++) {
      var len = shortLen - el + (i < shortCount ? 0 : 1);
      var d = data.slice(k, k + len); k += len;
      var e = rsRemainder(d, div);
      if (i < shortCount) d.push(0);
      blocks.push(d.concat(e));
    }
    var all = [];
    for (i = 0; i < blocks[0].length; i++)
      blocks.forEach(function (bl, j) { if (i !== shortLen - el || j >= shortCount) all.push(bl[i]); });

    var size = ver * 4 + 17;
    var mod = [], isFn = [];
    for (i = 0; i < size; i++) { mod.push(new Array(size).fill(false)); isFn.push(new Array(size).fill(false)); }
    function setFn(x, y, v) { mod[y][x] = v; isFn[y][x] = true; }

    for (i = 0; i < size; i++) { setFn(6, i, i % 2 === 0); setFn(i, 6, i % 2 === 0); }
    function finder(cx, cy) {
      for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) {
        var dist = Math.max(Math.abs(dx), Math.abs(dy)), x = cx + dx, y = cy + dy;
        if (x >= 0 && x < size && y >= 0 && y < size) setFn(x, y, dist !== 2 && dist !== 4);
      }
    }
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
    if (ver >= 2) {
      var na = Math.floor(ver / 7) + 2;
      var step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (na * 2 - 2)) * 2;
      var pos = [6];
      for (var p = size - 7; pos.length < na; p -= step) pos.splice(1, 0, p);
      pos.forEach(function (ax, ia) { pos.forEach(function (ay, ib) {
        if ((ia === 0 && ib === 0) || (ia === 0 && ib === na - 1) || (ia === na - 1 && ib === 0)) return;
        for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++)
          setFn(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }); });
    }
    function drawFormat(mask) {
      var d = (0 << 3) | mask; // ECC M => format bits 00
      var rem = d;
      for (var i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      var f = ((d << 10) | rem) ^ 0x5412;
      function bit(i) { return ((f >>> i) & 1) !== 0; }
      for (var i = 0; i <= 5; i++) setFn(8, i, bit(i));
      setFn(8, 7, bit(6)); setFn(8, 8, bit(7)); setFn(7, 8, bit(8));
      for (i = 9; i < 15; i++) setFn(14 - i, 8, bit(i));
      for (i = 0; i < 8; i++) setFn(size - 1 - i, 8, bit(i));
      for (i = 8; i < 15; i++) setFn(8, size - 15 + i, bit(i));
      setFn(8, size - 8, true);
    }
    drawFormat(0);
    if (ver >= 7) {
      var rem = ver;
      for (i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
      var vb = (ver << 12) | rem;
      for (i = 0; i < 18; i++) {
        var bt = ((vb >>> i) & 1) !== 0, a = size - 11 + i % 3, bb = Math.floor(i / 3);
        setFn(a, bb, bt); setFn(bb, a, bt);
      }
    }
    // place data
    var idx = 0;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) for (var j = 0; j < 2; j++) {
        var x = right - j, upward = ((right + 1) & 2) === 0, y = upward ? size - 1 - vert : vert;
        if (!isFn[y][x] && idx < all.length * 8) { mod[y][x] = ((all[idx >>> 3] >>> (7 - (idx & 7))) & 1) !== 0; idx++; }
      }
    }
    function applyMask(m) {
      for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
        var inv;
        switch (m) {
          case 0: inv = (x + y) % 2 === 0; break;
          case 1: inv = y % 2 === 0; break;
          case 2: inv = x % 3 === 0; break;
          case 3: inv = (x + y) % 3 === 0; break;
          case 4: inv = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
          case 5: inv = x * y % 2 + x * y % 3 === 0; break;
          case 6: inv = (x * y % 2 + x * y % 3) % 2 === 0; break;
          default: inv = ((x + y) % 2 + x * y % 3) % 2 === 0;
        }
        if (!isFn[y][x] && inv) mod[y][x] = !mod[y][x];
      }
    }
    function penalty() {
      var res = 0, x, y;
      function runs(get) {
        for (var a = 0; a < size; a++) {
          var run = 1, hist = [0, 0, 0, 0, 0, 0, 0], prev = get(a, 0), cnt = 0;
          // simplified: run-length + finder-like penalty
          for (var b = 1; b < size; b++) {
            var c = get(a, b);
            if (c === prev) { run++; if (run === 5) res += 3; else if (run > 5) res++; }
            else { run = 1; prev = c; }
          }
        }
      }
      runs(function (a, b) { return mod[a][b]; });
      runs(function (a, b) { return mod[b][a]; });
      for (y = 0; y < size - 1; y++) for (x = 0; x < size - 1; x++) {
        var c = mod[y][x]; if (c === mod[y][x + 1] && c === mod[y + 1][x] && c === mod[y + 1][x + 1]) res += 3;
      }
      var dark = 0; mod.forEach(function (r) { r.forEach(function (v) { if (v) dark++; }); });
      var total = size * size;
      res += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
      return res;
    }
    var best = 0, bestPen = Infinity;
    for (var m = 0; m < 8; m++) {
      applyMask(m); drawFormat(m);
      var pn = penalty();
      if (pn < bestPen) { bestPen = pn; best = m; }
      applyMask(m);
    }
    applyMask(best); drawFormat(best);
    return { size: size, get: function (x, y) { return mod[y][x]; } };
  }

  function toSVG(text, opts) {
    opts = opts || {};
    var q = encode(text), border = opts.border == null ? 4 : opts.border, s = q.size + border * 2, d = [];
    for (var y = 0; y < q.size; y++) for (var x = 0; x < q.size; x++)
      if (q.get(x, y)) d.push("M" + (x + border) + "," + (y + border) + "h1v1h-1z");
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + s + " " + s + '" shape-rendering="crispEdges">' +
      '<rect width="100%" height="100%" fill="#fff"/><path d="' + d.join("") + '" fill="#111"/></svg>';
  }

  var api = { encode: encode, toSVG: toSVG };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.QR = api;
})(typeof window !== "undefined" ? window : globalThis);
