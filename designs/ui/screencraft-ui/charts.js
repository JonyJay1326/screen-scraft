/* charts.js — SVG 迷你图表生成器（原型专用，替代 ECharts 的视觉占位）。
   所有函数返回 SVG 字符串；颜色取自设计契约深色主题。 */
(function () {
  var C = {
    line: '#35E0FF', line2: '#2F7FF7', bar: '#2F7FF7', bar2: '#35E0FF',
    grid: 'rgba(159,179,209,.14)', text: '#9FB3D1',
    pie: ['#2F7FF7', '#35E0FF', '#22C55E', '#F59E0B', '#8B5CF6', '#9FB3D1']
  };
  var uid = 0;
  function nid() { return 'cg' + (++uid); }

  /* 折线（带面积渐变） */
  window.cLine = function (data, o) {
    o = o || {};
    var w = o.w || 300, h = o.h || 140, pad = 6;
    var max = Math.max.apply(null, data) * 1.15, min = 0;
    var pts = data.map(function (v, i) {
      var x = pad + i * (w - pad * 2) / (data.length - 1);
      var y = h - pad - (v - min) / (max - min) * (h - pad * 2);
      return [x, y];
    });
    var path = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
    var area = path + ' L ' + pts[pts.length - 1][0].toFixed(1) + ' ' + (h - pad) + ' L ' + pts[0][0].toFixed(1) + ' ' + (h - pad) + ' Z';
    var gid = nid();
    var color = o.color || C.line;
    var grid = '';
    for (var g = 1; g <= 3; g++) {
      var gy = pad + g * (h - pad * 2) / 4;
      grid += '<line x1="' + pad + '" y1="' + gy + '" x2="' + (w - pad) + '" y2="' + gy + '" stroke="' + C.grid + '" stroke-width="1"/>';
    }
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
      '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="' + color + '" stop-opacity=".28"/><stop offset="1" stop-color="' + color + '" stop-opacity="0"/></linearGradient></defs>' +
      grid + '<path d="' + area + '" fill="url(#' + gid + ')"/>' +
      '<path d="' + path + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round"/>' +
      '<circle cx="' + pts[pts.length - 1][0] + '" cy="' + pts[pts.length - 1][1] + '" r="3" fill="' + color + '"/></svg>';
  };

  /* 柱状（可双系列） */
  window.cBars = function (data, o) {
    o = o || {};
    var w = o.w || 300, h = o.h || 140, pad = 6;
    var d2 = o.data2 || null;
    var all = data.concat(d2 || []);
    var max = Math.max.apply(null, all) * 1.15;
    var n = data.length, slot = (w - pad * 2) / n;
    var bw = Math.min(d2 ? slot * 0.3 : slot * 0.5, 26);
    var out = '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">';
    for (var g = 1; g <= 3; g++) {
      var gy = pad + g * (h - pad * 2) / 4;
      out += '<line x1="' + pad + '" y1="' + gy + '" x2="' + (w - pad) + '" y2="' + gy + '" stroke="' + C.grid + '"/>';
    }
    data.forEach(function (v, i) {
      var bh = v / max * (h - pad * 2);
      var x = pad + i * slot + (slot - (d2 ? bw * 2 + 3 : bw)) / 2;
      out += '<rect x="' + x.toFixed(1) + '" y="' + (h - pad - bh).toFixed(1) + '" width="' + bw + '" height="' + bh.toFixed(1) + '" rx="2" fill="' + (o.color || C.bar) + '" opacity=".92"/>';
      if (d2) {
        var bh2 = d2[i] / max * (h - pad * 2);
        out += '<rect x="' + (x + bw + 3).toFixed(1) + '" y="' + (h - pad - bh2).toFixed(1) + '" width="' + bw + '" height="' + bh2.toFixed(1) + '" rx="2" fill="' + C.bar2 + '" opacity=".92"/>';
      }
    });
    return out + '</svg>';
  };

  /* 环形饼图 */
  window.cDonut = function (data, o) {
    o = o || {};
    var size = o.size || 120, r = size / 2 - 8, cx = size / 2, cy = size / 2;
    var total = data.reduce(function (s, d) { return s + d.value; }, 0);
    var circ = 2 * Math.PI * r, off = 0;
    var out = '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">';
    data.forEach(function (d, i) {
      var frac = d.value / total;
      out += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + (d.color || C.pie[i % C.pie.length]) + '" stroke-width="' + (o.thick || 12) + '" stroke-dasharray="' + (frac * circ - 2).toFixed(1) + ' ' + circ.toFixed(1) + '" stroke-dashoffset="' + (-off * circ).toFixed(1) + '" transform="rotate(-90 ' + cx + ' ' + cy + ')" stroke-linecap="butt"/>';
      off += frac;
    });
    if (o.center) {
      out += '<text x="' + cx + '" y="' + (cy - 2) + '" text-anchor="middle" font-family="DIN Alternate,Bahnschrift,monospace" font-size="' + (o.centerSize || 18) + '" fill="#EAF2FF">' + o.center + '</text>';
      if (o.sub) out += '<text x="' + cx + '" y="' + (cy + 14) + '" text-anchor="middle" font-size="10" fill="' + C.text + '">' + o.sub + '</text>';
    }
    return out + '</svg>';
  };

  /* 仪表盘 */
  window.cGauge = function (pct, o) {
    o = o || {};
    var w = o.w || 140, h = o.h || 90, cx = w / 2, cy = h - 10, r = Math.min(w / 2 - 8, h - 18);
    var start = Math.PI, end = 0;
    function arc(a0, a1, color, width) {
      var x0 = cx + r * Math.cos(a0), y0 = cy - r * Math.sin(a0);
      var x1 = cx + r * Math.cos(a1), y1 = cy - r * Math.sin(a1);
      var large = Math.abs(a0 - a1) > Math.PI ? 1 : 0;
      return '<path d="M ' + x0.toFixed(1) + ' ' + y0.toFixed(1) + ' A ' + r + ' ' + r + ' 0 ' + large + ' 1 ' + x1.toFixed(1) + ' ' + y1.toFixed(1) + '" fill="none" stroke="' + color + '" stroke-width="' + width + '" stroke-linecap="round"/>';
    }
    var val = start + (end - start) * pct / 100;
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' +
      arc(start, end, 'rgba(47,127,247,.18)', 9) + arc(start, val, o.color || C.line, 9) +
      '<text x="' + cx + '" y="' + (cy - 6) + '" text-anchor="middle" font-family="DIN Alternate,Bahnschrift,monospace" font-size="' + (o.fs || 20) + '" fill="#EAF2FF">' + pct + '<tspan font-size="10" fill="' + C.text + '">%</tspan></text></svg>';
  };

  /* 漏斗 */
  window.cFunnel = function (data, o) {
    o = o || {};
    var w = o.w || 220, h = o.h || 140, pad = 4;
    var max = data[0].value;
    var rowH = (h - pad * 2) / data.length;
    var out = '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">';
    data.forEach(function (d, i) {
      var wTop = d.value / max * (w - 40);
      var wBot = (data[i + 1] ? data[i + 1].value / max : d.value / max * 0.72) * (w - 40);
      var y0 = pad + i * rowH, y1 = y0 + rowH - 3;
      var pts = [(w - wTop) / 2, y0, (w + wTop) / 2, y0, (w + wBot) / 2, y1, (w - wBot) / 2, y1];
      out += '<polygon points="' + pts.map(function (p) { return p.toFixed(1); }).join(' ') + '" fill="' + (d.color || C.pie[i % C.pie.length]) + '" opacity=".88"/>';
      out += '<text x="' + (w / 2) + '" y="' + (y0 + rowH / 2 + 3) + '" text-anchor="middle" font-size="10" fill="#fff">' + d.name + '</text>';
    });
    return out + '</svg>';
  };

  /* 雷达 */
  window.cRadar = function (values, o) {
    o = o || {};
    var size = o.size || 140, cx = size / 2, cy = size / 2, r = size / 2 - 16;
    var n = values.length;
    function pt(i, rr) {
      var a = -Math.PI / 2 + i * 2 * Math.PI / n;
      return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
    }
    var out = '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">';
    [0.33, 0.66, 1].forEach(function (k) {
      var ring = [];
      for (var i = 0; i < n; i++) ring.push(pt(i, r * k).map(function (v) { return v.toFixed(1); }).join(','));
      out += '<polygon points="' + ring.join(' ') + '" fill="none" stroke="' + C.grid + '"/>';
    });
    var poly = values.map(function (v, i) { return pt(i, r * v).map(function (x) { return x.toFixed(1); }).join(','); }).join(' ');
    out += '<polygon points="' + poly + '" fill="rgba(53,224,255,.2)" stroke="' + C.line + '" stroke-width="1.5"/>';
    values.forEach(function (v, i) {
      var p = pt(i, r * v);
      out += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="2.4" fill="' + C.line + '"/>';
    });
    return out + '</svg>';
  };

  /* 缩略图：迷你大屏（用于大屏卡片/模板卡片） */
  window.thumbSVG = function (seed) {
    seed = seed || 1;
    function rnd(i) { var x = Math.sin(seed * 97 + i * 13) * 10000; return x - Math.floor(x); }
    var w = 320, h = 180;
    var lineData = [];
    for (var i = 0; i < 12; i++) lineData.push(30 + rnd(i) * 60);
    var s = '<svg width="100%" height="100%" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid slice">';
    s += '<rect width="' + w + '" height="' + h + '" fill="#0B142B"/>';
    s += '<rect x="10" y="10" width="' + (w - 20) + '" height="18" rx="3" fill="rgba(22,41,78,.9)"/>';
    s += '<rect x="18" y="17" width="64" height="4" rx="2" fill="#35E0FF" opacity=".8"/>';
    s += '<rect x="10" y="36" width="190" height="82" rx="4" fill="rgba(22,41,78,.75)" stroke="rgba(53,114,200,.3)"/>';
    s += '<g transform="translate(16,42)">' + cLine(lineData, { w: 178, h: 68 }) + '</g>';
    s += '<rect x="208" y="36" width="102" height="82" rx="4" fill="rgba(22,41,78,.75)" stroke="rgba(53,114,200,.3)"/>';
    s += '<g transform="translate(223,42)">' + cDonut([{ value: 40 + rnd(20) * 30 }, { value: 25 }, { value: 18 }], { size: 62, thick: 8 }) + '</g>';
    for (var k = 0; k < 3; k++) {
      var kx = 10 + k * 104;
      s += '<rect x="' + kx + '" y="126" width="96" height="44" rx="4" fill="rgba(22,41,78,.75)" stroke="rgba(53,114,200,.3)"/>';
      s += '<text x="' + (kx + 10) + '" y="146" font-size="8" fill="#9FB3D1">' + ['累计供水', '管网压力', '设备在线'][k] + '</text>';
      s += '<text x="' + (kx + 10) + '" y="162" font-family="DIN Alternate,Bahnschrift,monospace" font-size="13" fill="#EAF2FF">' + (1000 + Math.floor(rnd(30 + k) * 8000)) + '</text>';
    }
    return s + '</svg>';
  };

  /* 组件库小缩略图（按类型给个示意） */
  window.libThumb = function (type) {
    var base = { w: 96, h: 44 };
    switch (type) {
      case '折线图': return cLine([8, 14, 10, 18, 15, 24, 20, 28], { w: 96, h: 44 });
      case '柱状图': return cBars([12, 20, 15, 26, 18], { w: 96, h: 44 });
      case '饼图': return cDonut([{ value: 42 }, { value: 30 }, { value: 18 }], { size: 44, thick: 7 });
      case '组合图': return cBars([10, 16, 12, 20, 15], { w: 96, h: 44, data2: [6, 12, 9, 15, 11] });
      case '漏斗图': return cFunnel([{ name: '', value: 30 }, { name: '', value: 22 }, { name: '', value: 14 }], { w: 96, h: 44 });
      case '雷达图': return cRadar([0.8, 0.6, 0.9, 0.5, 0.7], { size: 44 });
      case '仪表盘': return cGauge(72, { w: 64, h: 42, fs: 12 });
      case '指标卡': return '<svg width="96" height="44" viewBox="0 0 96 44"><rect x="2" y="4" width="44" height="16" rx="3" fill="rgba(47,127,247,.25)"/><rect x="50" y="4" width="44" height="16" rx="3" fill="rgba(53,224,255,.2)"/><rect x="2" y="24" width="44" height="16" rx="3" fill="rgba(34,197,94,.2)"/><rect x="50" y="24" width="44" height="16" rx="3" fill="rgba(245,158,11,.2)"/></svg>';
      case '表格': return '<svg width="96" height="44" viewBox="0 0 96 44">' + [0, 1, 2, 3].map(function (i) { return '<rect x="2" y="' + (4 + i * 10) + '" width="92" height="7" rx="2" fill="' + (i ? 'rgba(159,179,209,.14)' : 'rgba(47,127,247,.35)') + '"/>'; }).join('') + '</svg>';
      default: return '<svg width="96" height="44" viewBox="0 0 96 44"><rect x="18" y="6" width="60" height="32" rx="4" fill="none" stroke="rgba(53,224,255,.5)" stroke-dasharray="4 3"/></svg>';
    }
  };
})();
