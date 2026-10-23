/* Ice-white honeycomb with restrained, soft lights following shared edges. */
(() => {
  'use strict';

  const canvas = document.getElementById('ambientCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;

  const backdrop = document.createElement('canvas');
  const plate = backdrop.getContext('2d', { alpha: false });
  if (!plate) return;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const compactQuery = window.matchMedia('(max-width: 700px)');
  const TAU = Math.PI * 2;
  const PALETTE = [
    '47,158,237', '65,181,242', '109,201,246', '72,161,232',
    '82,182,241', '140,211,246', '80,173,234', '109,198,243',
    '79,175,235', '105,196,242', '113,204,246', '229,192,126'
  ];
  let width = 0;
  let height = 0;
  let ratio = 1;
  let radius = 58;
  let frame = 0;
  let previousTime = 0;
  let lastPaint = 0;
  let vertices = [];
  let lights = [];
  let resizePending = false;

  function randomValue(n) {
    const value = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return value - Math.floor(value);
  }

  function polygon(target, points) {
    target.beginPath();
    points.forEach((p, i) => i ? target.lineTo(p.x, p.y) : target.moveTo(p.x, p.y));
    target.closePath();
  }

  function corners(x, y, size) {
    return Array.from({ length: 6 }, (_, i) => ({
      x: x + size * Math.cos(i * TAU / 6),
      y: y + size * Math.sin(i * TAU / 6)
    }));
  }

  function silverCell(x, y, seed) {
    const outer = corners(x, y, radius - 0.55);
    const inset = corners(x, y, radius - 3.5);
    const variation = randomValue(seed);
    const polish = randomValue(seed + 91);
    const shade = Math.round(variation * 10 - 5);
    const metal = plate.createLinearGradient(x - radius * 0.8, y - radius, x + radius * (0.5 + polish * 0.5), y + radius);
    metal.addColorStop(0, `rgb(${249 + Math.min(shade, 0)},${252 + Math.min(shade, 0)},255)`);
    metal.addColorStop(0.24, `rgb(${234 + shade},${242 + shade},${247 + shade})`);
    metal.addColorStop(0.44 + polish * 0.08, `rgb(${215 + shade},${230 + shade},${241 + shade})`);
    metal.addColorStop(0.68 + polish * 0.06, `rgb(${241 + shade},${248 + Math.min(shade, 0)},${253 + Math.min(shade, 0)})`);
    metal.addColorStop(1, `rgb(${220 + shade},${233 + shade},${243 + shade})`);
    polygon(plate, outer);
    plate.fillStyle = '#d2e2ee';
    plate.fill();

    const bevelColors = [
      '#bed2e2', '#d3e2ed', '#f0f7fc', '#ffffff', '#fbfdff', '#d2e4f0'
    ];
    for (let i = 0; i < 6; i++) {
      const next = (i + 1) % 6;
      polygon(plate, [outer[i], outer[next], inset[next], inset[i]]);
      plate.fillStyle = bevelColors[i];
      plate.fill();
    }
    polygon(plate, inset);
    plate.fillStyle = metal;
    plate.fill();

    plate.save();
    polygon(plate, inset);
    plate.clip();
    const reflection = plate.createLinearGradient(x - radius, y, x + radius, y + radius * 0.24);
    reflection.addColorStop(0, 'rgba(255,255,255,0)');
    reflection.addColorStop(0.32, 'rgba(255,255,255,.06)');
    reflection.addColorStop(0.48, 'rgba(255,255,255,.28)');
    reflection.addColorStop(0.54, 'rgba(255,255,255,.015)');
    reflection.addColorStop(1, 'rgba(83,132,168,.025)');
    plate.fillStyle = reflection;
    plate.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    plate.restore();
    polygon(plate, inset);
    plate.strokeStyle = 'rgba(255,255,255,.7)';
    plate.lineWidth = 0.65;
    plate.stroke();
  }

  function buildBackground() {
    const base = plate.createLinearGradient(0, 0, width, height);
    base.addColorStop(0, '#edf6fc');
    base.addColorStop(0.60, '#f4f9fe');
    base.addColorStop(1, '#e4f1fa');
    plate.fillStyle = base;
    plate.fillRect(0, 0, width, height);
    vertices = [];
    const vertexMap = new Map();
    const edgeSet = new Set();
    const stepX = radius * 1.5;
    const stepY = radius * Math.sqrt(3);

    function vertex(point) {
      const key = `${Math.round(point.x * 100)},${Math.round(point.y * 100)}`;
      if (!vertexMap.has(key)) {
        vertexMap.set(key, vertices.length);
        vertices.push({ x: point.x, y: point.y, adjacent: [] });
      }
      return vertexMap.get(key);
    }

    for (let col = -1; col <= Math.ceil(width / stepX) + 1; col++) {
      for (let row = -2; row <= Math.ceil(height / stepY) + 1; row++) {
        const x = col * stepX;
        const y = (row + (((col % 2) + 2) % 2) * 0.5) * stepY;
        silverCell(x, y, col * 73 + row * 151);
        const ids = corners(x, y, radius).map(vertex);
        for (let k = 0; k < 6; k++) {
          const a = ids[k];
          const b = ids[(k + 1) % 6];
          const key = a < b ? `${a}:${b}` : `${b}:${a}`;
          if (!edgeSet.has(key)) {
            edgeSet.add(key);
            vertices[a].adjacent.push(b);
            vertices[b].adjacent.push(a);
          }
        }
      }
    }

    // The same pale contact tint covers the whole viewport, without section joins.
    const whiteLight = plate.createLinearGradient(0, 0, width, height);
    whiteLight.addColorStop(0, 'rgba(237,247,253,.40)');
    whiteLight.addColorStop(0.62, 'rgba(249,252,255,.48)');
    whiteLight.addColorStop(1, 'rgba(229,243,252,.38)');
    plate.fillStyle = whiteLight;
    plate.fillRect(0, 0, width, height);

    plate.beginPath();
    for (const key of edgeSet) {
      const [a, b] = key.split(':').map(Number);
      plate.moveTo(vertices[a].x, vertices[a].y);
      plate.lineTo(vertices[b].x, vertices[b].y);
    }
    plate.strokeStyle = 'rgba(114,156,190,.17)';
    plate.lineWidth = 0.75;
    plate.stroke();

    const softLight = plate.createRadialGradient(width * 0.36, height * 0.25, 0, width * 0.36, height * 0.25, Math.max(width, height) * 0.8);
    softLight.addColorStop(0, 'rgba(255,255,255,.24)');
    softLight.addColorStop(0.6, 'rgba(255,255,255,.035)');
    softLight.addColorStop(1, 'rgba(218,237,252,.025)');
    plate.fillStyle = softLight;
    plate.fillRect(0, 0, width, height);
  }

  // A radial alpha falloff reaches zero well before the bitmap boundary.
  // Small, overlapping round blooms replace the broad unblurred edge bands.
  const blooms = PALETTE.map(color => {
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 96;
    const brush = sprite.getContext('2d');
    const halo = brush.createRadialGradient(48, 48, 0, 48, 48, 43);
    halo.addColorStop(0, `rgba(${color},.54)`);
    halo.addColorStop(0.12, `rgba(${color},.45)`);
    halo.addColorStop(0.30, `rgba(${color},.24)`);
    halo.addColorStop(0.55, `rgba(${color},.085)`);
    halo.addColorStop(0.80, `rgba(${color},.018)`);
    halo.addColorStop(1, `rgba(${color},0)`);
    brush.fillStyle = halo;
    brush.fillRect(0, 0, 96, 96);
    return sprite;
  });

  function visible(point) {
    return point.x > 6 && point.x < width - 6 && point.y > 6 && point.y < height - 6;
  }

  function nextVertex(path, salt) {
    const current = vertices[path[path.length - 1]];
    const previous = path.length > 1 ? path[path.length - 2] : -1;
    let options = current.adjacent.filter(id => id !== previous);
    if (!options.length) options = current.adjacent;
    const inside = options.filter(id => visible(vertices[id]));
    if (inside.length) options = inside;
    return options[Math.floor(randomValue(salt) * options.length)];
  }

  function makeLights() {
    const compact = compactQuery.matches;
    const count = compact
      ? Math.max(5, Math.min(7, Math.round(width * height / 65000)))
      : Math.max(12, Math.min(18, Math.round(width * height / 85000)));
    const starts = vertices.map((point, i) => visible(point) ? i : -1).filter(i => i >= 0);
    if (!starts.length) { lights = []; return; }
    const columns = Math.ceil(Math.sqrt(count * width / height));
    const rows = Math.ceil(count / columns);
    lights = Array.from({ length: count }, (_, i) => {
      const targetX = ((i % columns) + 0.2 + randomValue(i + 29) * 0.6) * width / columns;
      const targetY = (Math.floor(i / columns) + 0.2 + randomValue(i + 97) * 0.6) * height / rows;
      let nearest = starts[0];
      let distance = Infinity;
      for (const id of starts) {
        const d = (vertices[id].x - targetX) ** 2 + (vertices[id].y - targetY) ** 2;
        if (d < distance) { distance = d; nearest = id; }
      }
      const path = [nearest];
      for (let k = 0; k < 7; k++) path.push(nextVertex(path, 1000 + i * 73 + k * 11));
      return {
        path,
        distance: radius * (4.0 + randomValue(i + 13) * 0.9),
        speed: (compact ? 82 : 106) + randomValue(i + 47) * (compact ? 42 : 46),
        trail: radius * (1.5 + randomValue(i + 61) * 0.5),
        brightness: 0.72 + randomValue(i + 84) * 0.23,
        color: PALETTE[i % PALETTE.length],
        bloom: blooms[i % PALETTE.length],
        seed: i * 73 + 1000,
        step: 7
      };
    });
  }

  function advance(light, elapsed) {
    light.distance += elapsed * light.speed;
    while (light.distance >= radius * 5) {
      light.path.shift();
      light.distance -= radius;
      light.path.push(nextVertex(light.path, light.seed + (++light.step) * 11));
    }
  }

  function pointAt(light, distance) {
    const index = Math.min(Math.floor(distance / radius), light.path.length - 2);
    const a = vertices[light.path[index]];
    const b = vertices[light.path[index + 1]];
    const fraction = Math.max(0, Math.min(1, distance / radius - index));
    return { x: a.x + (b.x - a.x) * fraction, y: a.y + (b.y - a.y) * fraction };
  }

  function drawLight(light, staticFrame) {
    const end = light.distance;
    const trail = light.trail * (staticFrame ? 0.85 : 1);
    const start = Math.max(0, end - trail);
    const first = Math.floor(start / radius);
    const last = Math.min(Math.floor(end / radius), light.path.length - 2);
    const brightness = light.brightness * (staticFrame ? 0.65 : 1);

    // The halo is a chain of small feathered circles along the true route.
    // It stays round through corners, without wide rectangular edge strokes.
    const samples = Math.ceil(trail / 5);
    for (let i = 1; i <= samples; i++) {
      const age = i / samples;
      const point = pointAt(light, start + (end - start) * age);
      const size = 18 + age * 6;
      ctx.globalAlpha = Math.pow(age, 1.65) * 0.22 * brightness;
      ctx.drawImage(light.bloom, point.x - size / 2, point.y - size / 2, size, size);
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let index = first; index <= last; index++) {
      const from = Math.max(start, index * radius);
      const to = Math.min(end, (index + 1) * radius);
      if (to - from < 0.01) continue;
      const a = pointAt(light, from);
      const b = pointAt(light, to);
      const alphaA = Math.pow(Math.max(0, (from - start) / trail), 1.35);
      const alphaB = Math.pow(Math.max(0, (to - start) / trail), 1.35);
      const coloredLine = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      coloredLine.addColorStop(0, `rgba(${light.color},${alphaA})`);
      coloredLine.addColorStop(1, `rgba(${light.color},${alphaB})`);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.globalAlpha = brightness * 0.90;
      ctx.strokeStyle = coloredLine;
      ctx.lineWidth = 1.7;
      ctx.stroke();
      const core = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      core.addColorStop(0, `rgba(255,255,255,${alphaA * 0.55})`);
      core.addColorStop(1, `rgba(255,255,255,${alphaB * 0.80})`);
      ctx.strokeStyle = core;
      ctx.lineWidth = 0.55;
      ctx.stroke();
    }

    const head = pointAt(light, end);
    ctx.globalAlpha = brightness * 0.95;
    ctx.drawImage(light.bloom, head.x - 15, head.y - 15, 30, 30);
    ctx.beginPath();
    ctx.arc(head.x, head.y, 1.65, 0, TAU);
    ctx.fillStyle = `rgba(${light.color},.90)`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(head.x, head.y, 0.85, 0, TAU);
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = brightness;
    ctx.fill();
  }

  function paint(staticFrame) {
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.globalAlpha = 1;
    ctx.drawImage(backdrop, 0, 0, backdrop.width, backdrop.height, 0, 0, width, height);
    ctx.save();
    // Keep blue edges saturated against the white surface; white cores add shine.
    ctx.globalCompositeOperation = 'source-over';
    lights.forEach(light => drawLight(light, staticFrame));
    ctx.restore();
  }

  function resize() {
    width = Math.max(1, window.innerWidth);
    height = Math.max(1, window.innerHeight);
    ratio = Math.min(window.devicePixelRatio || 1, compactQuery.matches ? 1.35 : 1.5);
    radius = compactQuery.matches ? 52 : 58;
    canvas.width = backdrop.width = Math.round(width * ratio);
    canvas.height = backdrop.height = Math.round(height * ratio);
    plate.setTransform(ratio, 0, 0, ratio, 0, 0);
    buildBackground();
    makeLights();
    paint(motion.matches);
    previousTime = 0;
    lastPaint = 0;
  }

  function tick(time) {
    frame = 0;
    if (document.hidden) return;
    if (resizePending) { resizePending = false; resize(); }
    if (motion.matches) return;
    const interval = 1000 / (compactQuery.matches ? 30 : 40);
    if (!lastPaint || time - lastPaint >= interval) {
      const elapsed = previousTime ? Math.min((time - previousTime) / 1000, 0.1) : 0;
      previousTime = time;
      lastPaint = time;
      lights.forEach(light => advance(light, elapsed));
      paint(false);
    }
    frame = requestAnimationFrame(tick);
  }

  function resume() {
    if (!frame && !document.hidden) frame = requestAnimationFrame(tick);
  }

  resize();
  if (!motion.matches) resume();
  window.addEventListener('resize', () => { resizePending = true; resume(); }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
      previousTime = 0;
      lastPaint = 0;
    } else resume();
  });
  const motionChanged = () => {
    previousTime = 0;
    lastPaint = 0;
    if (motion.matches) {
      cancelAnimationFrame(frame);
      frame = 0;
      paint(true);
    } else resume();
  };
  if (motion.addEventListener) motion.addEventListener('change', motionChanged);
  else if (motion.addListener) motion.addListener(motionChanged);
})();
