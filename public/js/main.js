'use strict';

const API_BASE = '';

let isLocked = true;
let siteStatus = null;
const btn = document.getElementById('predict-btn');
const countdownEl = document.getElementById('countdown');
const timerLabel = document.getElementById('timer-label');
const uiContent = document.getElementById('ui-content');
const statusBadge = document.getElementById('status-badge');

const urlParams = new URLSearchParams(window.location.search);
const debugMode = urlParams.get('debug') === '1';

async function fetchStatus() {
  const query = debugMode ? '?debug=1' : '';
  const res = await fetch(`${API_BASE}/api/status${query}`);
  if (!res.ok) throw new Error('无法获取天机状态');
  return res.json();
}

function setPredictBtnLabel(text) {
  if (!btn) return;
  btn.textContent = text;
  if (text === '启坛引星辰') {
    const span = document.createElement('span');
    span.className = 'btn-glow';
    span.setAttribute('aria-hidden', 'true');
    btn.prepend(span);
  }
}

async function updateTimer() {
  try {
    siteStatus = await fetchStatus();
    isLocked = !siteStatus.unlocked;
    btn.disabled = isLocked || isAnimating;
    setPredictBtnLabel(isLocked ? '天机未到' : '启坛引星辰');

    if (uiContent) {
      uiContent.classList.toggle('is-unlocked', siteStatus.unlocked);
      uiContent.classList.toggle('is-locked', !siteStatus.unlocked);
    }
    if (statusBadge) {
      statusBadge.textContent = siteStatus.unlocked ? '开坛中' : '封坛中';
      statusBadge.className = `status-badge ${siteStatus.unlocked ? 'open' : 'closed'}`;
    }

    timerLabel.innerText = siteStatus.countdownLabel || '距离下一次开坛还有';
    countdownEl.innerText = siteStatus.countdownText || '--:--:--';
  } catch {
    timerLabel.innerText = '星轨紊乱，稍后再试';
    countdownEl.innerText = '--:--:--';
    btn.disabled = true;
  }
}

updateTimer();
setInterval(updateTimer, 1000);

let scene, camera, renderer, clock;
let baguaRing, baguaCore, innerRing, outerRing, particles, starField;
let starFieldDust, starFieldBright, starNebula;
let shockwave, shockwave2, centerGlow, lightningGroup, starStreams;
let hexRing = null;
let hexRingSpin = 0;
let isAnimating = false;
let animStarCollapse = 0;
let starInitialPositions = [];
let starTwinklePhases = [];
let starBrightBaseColors = [];
let starLayers = [];
let starTexture = null;
let pendingPrediction = null;
let digitRain = null;
let fxOverlay = null;
let starPower = null;
let mysticAmbience = null;
let emitStarStreamsFn = null;
let talismanRing = null;
let starFieldDim = 1;

function createStarTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
  g.addColorStop(0, 'rgba(255, 255, 255, 1)');
  g.addColorStop(0.12, 'rgba(255, 248, 230, 0.95)');
  g.addColorStop(0.28, 'rgba(255, 220, 160, 0.55)');
  g.addColorStop(0.5, 'rgba(200, 170, 255, 0.22)');
  g.addColorStop(0.72, 'rgba(100, 140, 255, 0.08)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

function sampleGalaxyPoint(index, maxR) {
  const r = Math.pow(Math.random(), 2.05) * maxR;
  const arms = index % 2 === 0 ? 0 : Math.PI;
  const theta = r * 1.18 + arms + (Math.random() - 0.5) * 0.26;
  return {
    x: Math.cos(theta) * r,
    y: Math.sin(theta) * r,
    z: (Math.random() - 0.5) * (0.9 / (r + 0.35)),
    r,
  };
}

function pickStarColor(r, maxR, variant) {
  const t = r / maxR;
  const roll = Math.random();
  if (roll < 0.07) return new THREE.Color(0xb8d8ff);
  if (roll < 0.12) return new THREE.Color(0xffeeb8);
  const core = new THREE.Color(0xfff8f0);
  const mid = new THREE.Color(0xe0c8ff);
  const edge = new THREE.Color(0x7090d8);
  const c = core.clone().lerp(mid, t * 0.55).lerp(edge, t * t);
  if (variant === 'dust') c.multiplyScalar(0.62);
  if (variant === 'bright') c.multiplyScalar(1.15);
  return c;
}

function buildStarLayers() {
  starTexture = createStarTexture();
  starInitialPositions = [];
  starTwinklePhases = [];
  starBrightBaseColors = [];
  starLayers = [];

  const maxR = 11;

  const dustCount = 2200;
  const dustPos = new Float32Array(dustCount * 3);
  const dustCol = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    const p = sampleGalaxyPoint(i, maxR * 1.15);
    dustPos[i * 3] = p.x;
    dustPos[i * 3 + 1] = p.y;
    dustPos[i * 3 + 2] = p.z - 0.15;
    starInitialPositions.push({ x: p.x, y: p.y, z: p.z - 0.15, layer: 'dust', idx: i });
    const c = pickStarColor(p.r, maxR, 'dust');
    dustCol[i * 3] = c.r;
    dustCol[i * 3 + 1] = c.g;
    dustCol[i * 3 + 2] = c.b;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  dustGeo.setAttribute('color', new THREE.BufferAttribute(dustCol, 3));
  starFieldDust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({
      map: starTexture,
      size: 0.034,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false,
    })
  );
  scene.add(starFieldDust);
  starLayers.push(starFieldDust);

  const mainCount = 2600;
  const mainPos = new Float32Array(mainCount * 3);
  const mainCol = new Float32Array(mainCount * 3);
  for (let i = 0; i < mainCount; i++) {
    const p = sampleGalaxyPoint(i + dustCount, maxR);
    mainPos[i * 3] = p.x;
    mainPos[i * 3 + 1] = p.y;
    mainPos[i * 3 + 2] = p.z;
    starInitialPositions.push({ x: p.x, y: p.y, z: p.z, layer: 'main', idx: i });
    const c = pickStarColor(p.r, maxR, 'main');
    mainCol[i * 3] = c.r;
    mainCol[i * 3 + 1] = c.g;
    mainCol[i * 3 + 2] = c.b;
  }
  const mainGeo = new THREE.BufferGeometry();
  mainGeo.setAttribute('position', new THREE.BufferAttribute(mainPos, 3));
  mainGeo.setAttribute('color', new THREE.BufferAttribute(mainCol, 3));
  starField = new THREE.Points(
    mainGeo,
    new THREE.PointsMaterial({
      map: starTexture,
      size: 0.064,
      vertexColors: true,
      transparent: true,
      opacity: 0.96,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false,
    })
  );
  scene.add(starField);
  starLayers.push(starField);

  const brightCount = 160;
  const brightPos = new Float32Array(brightCount * 3);
  const brightCol = new Float32Array(brightCount * 3);
  for (let i = 0; i < brightCount; i++) {
    const p = sampleGalaxyPoint(i + 9000, maxR * 0.92);
    if (p.r < 1.2) {
      const a = Math.random() * Math.PI * 2;
      p.x = Math.cos(a) * (1.8 + Math.random() * 2);
      p.y = Math.sin(a) * (1.8 + Math.random() * 2);
      p.r = Math.hypot(p.x, p.y);
    }
    brightPos[i * 3] = p.x;
    brightPos[i * 3 + 1] = p.y;
    brightPos[i * 3 + 2] = p.z + 0.08;
    starInitialPositions.push({ x: p.x, y: p.y, z: p.z + 0.08, layer: 'bright', idx: i });
    const c = pickStarColor(p.r, maxR, 'bright');
    brightCol[i * 3] = c.r;
    brightCol[i * 3 + 1] = c.g;
    brightCol[i * 3 + 2] = c.b;
    starBrightBaseColors.push({ r: c.r, g: c.g, b: c.b });
    starTwinklePhases.push({
      phase: Math.random() * Math.PI * 2,
      speed: 1.2 + Math.random() * 2.8,
    });
  }
  const brightGeo = new THREE.BufferGeometry();
  brightGeo.setAttribute('position', new THREE.BufferAttribute(brightPos, 3));
  brightGeo.setAttribute('color', new THREE.BufferAttribute(brightCol, 3));
  starFieldBright = new THREE.Points(
    brightGeo,
    new THREE.PointsMaterial({
      map: starTexture,
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false,
    })
  );
  scene.add(starFieldBright);
  starLayers.push(starFieldBright);

  const nebulaCanvas = document.createElement('canvas');
  nebulaCanvas.width = 512;
  nebulaCanvas.height = 512;
  const nctx = nebulaCanvas.getContext('2d');
  const ng = nctx.createRadialGradient(256, 256, 0, 256, 256, 256);
  ng.addColorStop(0, 'rgba(255, 220, 160, 0.55)');
  ng.addColorStop(0.2, 'rgba(180, 120, 255, 0.28)');
  ng.addColorStop(0.45, 'rgba(80, 50, 140, 0.12)');
  ng.addColorStop(0.7, 'rgba(20, 10, 50, 0.04)');
  ng.addColorStop(1, 'rgba(0, 0, 0, 0)');
  nctx.fillStyle = ng;
  nctx.fillRect(0, 0, 512, 512);
  const nebulaTex = new THREE.CanvasTexture(nebulaCanvas);
  nebulaTex.minFilter = THREE.LinearFilter;
  starNebula = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: nebulaTex,
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  starNebula.scale.set(16, 16, 1);
  starNebula.position.z = -0.8;
  scene.add(starNebula);
}

function applyStarCollapse(progress) {
  for (const entry of starInitialPositions) {
    let geo;
    if (entry.layer === 'dust') geo = starFieldDust.geometry;
    else if (entry.layer === 'bright') geo = starFieldBright.geometry;
    else geo = starField.geometry;
    const arr = geo.attributes.position.array;
    arr[entry.idx * 3] = entry.x * (1 - progress * 0.96);
    arr[entry.idx * 3 + 1] = entry.y * (1 - progress * 0.96);
    arr[entry.idx * 3 + 2] = entry.z * (1 - progress * 0.96);
    geo.attributes.position.needsUpdate = true;
  }
}

function resetStarPositions() {
  for (const entry of starInitialPositions) {
    let geo;
    if (entry.layer === 'dust') geo = starFieldDust.geometry;
    else if (entry.layer === 'bright') geo = starFieldBright.geometry;
    else geo = starField.geometry;
    const arr = geo.attributes.position.array;
    arr[entry.idx * 3] = entry.x;
    arr[entry.idx * 3 + 1] = entry.y;
    arr[entry.idx * 3 + 2] = entry.z;
    geo.attributes.position.needsUpdate = true;
  }
}

function setStarRitualDim(on) {
  const target = on ? 0.18 : 0.96;
  const ringTarget = on ? 0.10 : 0.62;
  const innerTarget = on ? 0.06 : 0.42;
  const particleTarget = on ? 0.04 : 1.0;

  if (starField) starField.material.opacity = target;
  if (starFieldBright) starFieldBright.material.opacity = target * 0.9;
  if (starFieldDust) starFieldDust.material.opacity = target * 0.7;
  if (baguaRing) baguaRing.material.opacity = ringTarget;
  if (innerRing) innerRing.material.opacity = innerTarget;
  if (outerRing) outerRing.material.opacity = innerTarget;
  if (particles) particles.material.opacity = particleTarget;
}

function updateStarTwinkle(t) {
  if (!starFieldBright) return;
  const colors = starFieldBright.geometry.attributes.color.array;
  for (let i = 0; i < starTwinklePhases.length; i++) {
    const tp = starTwinklePhases[i];
    const tw = 0.55 + Math.sin(t * tp.speed + tp.phase) * 0.45;
    const base = starBrightBaseColors[i];
    colors[i * 3] = base.r * tw;
    colors[i * 3 + 1] = base.g * tw;
    colors[i * 3 + 2] = base.b * tw;
  }
  starFieldBright.geometry.attributes.color.needsUpdate = true;
  starFieldBright.material.size = 0.11 + Math.sin(t * 0.7) * 0.018;
}

function initThree() {
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050210, 0.012);
  clock = new THREE.Clock();
  camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = 6;

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x030108, 1);
  document.body.appendChild(renderer.domElement);

  mysticAmbience = new window.MysticAmbience();
  fxOverlay = new window.EffectsOverlay();
  digitRain = new window.DigitRain();
  starPower = new window.StarPowerOverlay();
  hexRing = new window.HexagramRing();

  buildStarLayers();

  const ringCount = 200;
  const ringPositions = new Float32Array(ringCount * 3);
  for (let i = 0; i < ringCount; i++) {
    const angle = (i / ringCount) * Math.PI * 2;
    ringPositions[i * 3] = Math.cos(angle) * 1.55;
    ringPositions[i * 3 + 1] = Math.sin(angle) * 1.55;
    ringPositions[i * 3 + 2] = 0;
  }
  const ringGeo = new THREE.BufferGeometry();
  ringGeo.setAttribute('position', new THREE.BufferAttribute(ringPositions, 3));
  baguaRing = new THREE.Points(
    ringGeo,
    new THREE.PointsMaterial({
      color: 0xddb860,
      size: 0.082,
      transparent: true,
      opacity: 0.62,
      blending: THREE.AdditiveBlending,
    })
  );
  scene.add(baguaRing);

  const innerGeo = new THREE.BufferGeometry();
  const innerCount = 120;
  const innerPos = new Float32Array(innerCount * 3);
  for (let i = 0; i < innerCount; i++) {
    const angle = (i / innerCount) * Math.PI * 2;
    innerPos[i * 3] = Math.cos(angle) * 1.05;
    innerPos[i * 3 + 1] = Math.sin(angle) * 1.05;
    innerPos[i * 3 + 2] = 0.01;
  }
  innerGeo.setAttribute('position', new THREE.BufferAttribute(innerPos, 3));
  innerRing = new THREE.Points(
    innerGeo,
    new THREE.PointsMaterial({
      color: 0x6b4fa8,
      size: 0.052,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
    })
  );
  scene.add(innerRing);

  const outerCount = 240;
  const outerPos = new Float32Array(outerCount * 3);
  for (let i = 0; i < outerCount; i++) {
    const angle = (i / outerCount) * Math.PI * 2;
    outerPos[i * 3] = Math.cos(angle) * 2.85;
    outerPos[i * 3 + 1] = Math.sin(angle) * 2.85;
    outerPos[i * 3 + 2] = -0.02;
  }
  const outerGeo = new THREE.BufferGeometry();
  outerGeo.setAttribute('position', new THREE.BufferAttribute(outerPos, 3));
  outerRing = new THREE.Points(
    outerGeo,
    new THREE.PointsMaterial({
      color: 0x8a6040,
      size: 0.042,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
    })
  );
  scene.add(outerRing);

  lightningGroup = new THREE.Group();
  const lightningMat = new THREE.LineBasicMaterial({
    color: 0x6a5090,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
  });
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const pts = new Float32Array([
      0, 0, 0.05,
      Math.cos(angle) * 3.2,
      Math.sin(angle) * 3.2,
      0.05,
    ]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    const line = new THREE.Line(geo, lightningMat.clone());
    line.userData.baseAngle = angle;
    lightningGroup.add(line);
  }
  scene.add(lightningGroup);

  baguaCore = new THREE.Mesh(
    new THREE.RingGeometry(0.12, 1.35, 8),
    new THREE.MeshBasicMaterial({
      color: 0x8a7040,
      wireframe: true,
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
    })
  );
  scene.add(baguaCore);

  talismanRing = new THREE.Mesh(
    new THREE.RingGeometry(1.55, 1.62, 64),
    new THREE.MeshBasicMaterial({
      color: 0x5a4080,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    })
  );
  scene.add(talismanRing);

  shockwave = new THREE.Mesh(
    new THREE.RingGeometry(0.2, 0.35, 64),
    new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    })
  );
  scene.add(shockwave);

  shockwave2 = new THREE.Mesh(
    new THREE.RingGeometry(0.15, 0.28, 64),
    new THREE.MeshBasicMaterial({
      color: 0x66bbff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    })
  );
  scene.add(shockwave2);

  const glowCount = 850;
  const glowPos = new Float32Array(glowCount * 3);
  for (let i = 0; i < glowCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * 0.5;
    glowPos[i * 3] = Math.cos(angle) * r;
    glowPos[i * 3 + 1] = Math.sin(angle) * r;
    glowPos[i * 3 + 2] = 0;
  }
  const glowGeo = new THREE.BufferGeometry();
  glowGeo.setAttribute('position', new THREE.BufferAttribute(glowPos, 3));
  centerGlow = new THREE.Points(
    glowGeo,
    new THREE.PointsMaterial({
      color: 0xffd898,
      size: 0.052,
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
    })
  );
  scene.add(centerGlow);

  const partCount = 3800;
  const partPositions = new Float32Array(partCount * 3);
  const partColors = new Float32Array(partCount * 3);
  for (let i = 0; i < partCount; i++) {
    partPositions[i * 3] = 0;
    partPositions[i * 3 + 1] = 0;
    partPositions[i * 3 + 2] = 0;
    partColors[i * 3] = 1.0;
    partColors[i * 3 + 1] = 0.85;
    partColors[i * 3 + 2] = 0.3;
  }
  const partGeometry = new THREE.BufferGeometry();
  partGeometry.setAttribute('position', new THREE.BufferAttribute(partPositions, 3));
  partGeometry.setAttribute('color', new THREE.BufferAttribute(partColors, 3));
  particles = new THREE.Points(
    partGeometry,
    new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    })
  );
  scene.add(particles);

  const streamCount = 720;
  const streamPos = new Float32Array(streamCount * 3);
  const streamVel = new Float32Array(streamCount * 3);
  const streamLife = new Float32Array(streamCount);
  for (let i = 0; i < streamCount; i++) {
    streamPos[i * 3] = 0;
    streamPos[i * 3 + 1] = 0;
    streamPos[i * 3 + 2] = 0;
    streamLife[i] = 0;
  }
  const streamGeo = new THREE.BufferGeometry();
  streamGeo.setAttribute('position', new THREE.BufferAttribute(streamPos, 3));
  starStreams = new THREE.Points(
    streamGeo,
    new THREE.PointsMaterial({
      color: 0xb89060,
      size: 0.06,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    })
  );
  starStreams.userData.vel = streamVel;
  starStreams.userData.life = streamLife;
  scene.add(starStreams);

  function emitStarStreams(intensity = 1) {
    const vel = starStreams.userData.vel;
    const life = starStreams.userData.life;
    const pos = starStreams.geometry.attributes.position.array;
    for (let i = 0; i < streamCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const pitch = (Math.random() - 0.5) * Math.PI * 0.85;
      const speed = (0.04 + Math.random() * 0.12) * intensity;
      vel[i * 3] = Math.cos(angle) * Math.cos(pitch) * speed;
      vel[i * 3 + 1] = Math.sin(angle) * Math.cos(pitch) * speed;
      vel[i * 3 + 2] = Math.sin(pitch) * speed * 0.5;
      pos[i * 3] = (Math.random() - 0.5) * 0.08;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 0.08;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.05;
      life[i] = 0.5 + Math.random() * 0.5;
    }
    starStreams.geometry.attributes.position.needsUpdate = true;
    starStreams.material.opacity = Math.min(1, 0.85 * intensity);
  }
  emitStarStreamsFn = emitStarStreams;

  function updateStarStreams() {
    if (!starStreams || starStreams.material.opacity <= 0.01) return;
    const pos = starStreams.geometry.attributes.position.array;
    const vel = starStreams.userData.vel;
    const life = starStreams.userData.life;
    let alive = 0;
    for (let i = 0; i < streamCount; i++) {
      if (life[i] <= 0) continue;
      pos[i * 3] += vel[i * 3];
      pos[i * 3 + 1] += vel[i * 3 + 1];
      pos[i * 3 + 2] += vel[i * 3 + 2];
      vel[i * 3] *= 0.992;
      vel[i * 3 + 1] *= 0.992;
      vel[i * 3 + 2] *= 0.992;
      life[i] -= 0.004;
      if (life[i] > 0) alive++;
    }
    starStreams.geometry.attributes.position.needsUpdate = true;
    if (alive === 0) starStreams.material.opacity *= 0.92;
  }

  function animateFrame() {
    requestAnimationFrame(animateFrame);
    const t = clock.getElapsedTime();
    const breathe = 0.5 + Math.sin(t * 0.8) * 0.5;

    if (!isAnimating) {
      baguaRing.rotation.z -= 0.0014;
      innerRing.rotation.z += 0.002;
      outerRing.rotation.z -= 0.0009;
      baguaCore.rotation.z += 0.0016;
      starField.rotation.z += 0.00035;
      if (starFieldDust) starFieldDust.rotation.z += 0.00022;
      if (starFieldBright) starFieldBright.rotation.z += 0.00042;
      updateStarTwinkle(t);
      if (starNebula) {
        const nb = 0.28 + breathe * 0.12 + Math.sin(t * 0.45) * 0.04;
        starNebula.material.opacity = nb;
        starNebula.scale.set(15.5 + breathe * 0.8, 15.5 + breathe * 0.8, 1);
        starNebula.material.rotation = t * 0.04;
      }
      starField.material.opacity = 0.9 + breathe * 0.08;
      starField.material.size = 0.062 + breathe * 0.006;
      if (talismanRing) talismanRing.material.opacity = 0;
      if (hexRing) {
        const speed = hexRing.getRotationSpeed ? hexRing.getRotationSpeed() : 1;
        hexRingSpin -= 0.00022 * speed;
        hexRing.setRotation(hexRingSpin);
      }
      camera.position.z = 6 + Math.sin(t * 0.35) * 0.08;
      const dim = starFieldDim;
      baguaRing.material.opacity = (0.38 + breathe * 0.18) * dim;
      outerRing.material.opacity = (0.18 + breathe * 0.12) * dim;
      centerGlow.material.opacity = 0.2 + breathe * 0.14;
      centerGlow.rotation.z = t * 0.08;
      if (lightningGroup) {
        lightningGroup.children.forEach((line, i) => {
          const flash = Math.max(0, Math.sin(t * 2.2 + i * 0.8));
          line.material.opacity = flash * 0.06;
        });
      }
    } else {
      starField.rotation.z -= 0.006;
      if (starFieldDust) starFieldDust.rotation.z -= 0.004;
      if (starFieldBright) starFieldBright.rotation.z -= 0.007;
      updateStarTwinkle(t);
      const corePulse = 0.5 + Math.sin(t * 2.5) * 0.5;
      starField.material.opacity = 0.78 + corePulse * 0.2;
      starField.material.size = 0.05 + corePulse * 0.024 + animStarCollapse * 0.015;
      if (starFieldBright) {
        starFieldBright.material.opacity = 0.85 + corePulse * 0.15;
      }
      if (starNebula) {
        starNebula.material.opacity = 0.35 + corePulse * 0.25;
        starNebula.material.rotation = t * 0.08;
      }
      if (talismanRing) {
        talismanRing.rotation.z = t * 0.12;
        talismanRing.material.opacity = 0.15 + corePulse * 0.2;
      }

      if (animStarCollapse > 0.05) {
        const wobble = Math.sin(t * 6) * 0.018 * animStarCollapse;
        for (const entry of starInitialPositions) {
          let geo;
          if (entry.layer === 'dust') geo = starFieldDust.geometry;
          else if (entry.layer === 'bright') geo = starFieldBright.geometry;
          else geo = starField.geometry;
          const arr = geo.attributes.position.array;
          const scale = 1 - animStarCollapse * 0.96;
          const spin = t * 0.8 + entry.idx * 0.002;
          arr[entry.idx * 3] =
            entry.x * scale * (1 + wobble) + Math.cos(spin) * wobble * 0.3;
          arr[entry.idx * 3 + 1] =
            entry.y * scale * (1 + wobble) + Math.sin(spin) * wobble * 0.3;
          arr[entry.idx * 3 + 2] = entry.z * scale;
          geo.attributes.position.needsUpdate = true;
        }
      }

      baguaRing.rotation.z -= 0.003;
      innerRing.rotation.z += 0.004;
      baguaCore.rotation.z += 0.003;
      particles.rotation.z += 0.0015;
      if (hexRing) {
        const speed = hexRing.getRotationSpeed ? hexRing.getRotationSpeed() : 1;
        hexRingSpin -= 0.008 * speed;
        hexRing.setRotation(hexRingSpin);
      }
      outerRing.rotation.z -= 0.004;
      centerGlow.rotation.z = t * 0.15;
      centerGlow.material.opacity = 0.4 + corePulse * 0.35;
      if (lightningGroup) {
        lightningGroup.children.forEach((line, i) => {
          line.material.opacity = 0.06 + Math.abs(Math.sin(t * 3 + i)) * 0.18;
          line.rotation.z = t * 0.2;
        });
      }
      updateStarStreams();
    }

    renderer.render(scene, camera);
  }
  animateFrame();
}

function fireShockwave() {
  if (fxOverlay) {
    fxOverlay.burst(0.55);
    fxOverlay.vignettePulse();
  }
  if (starPower) starPower.burst();
  if (emitStarStreamsFn) emitStarStreamsFn(0.45);

  shockwave.scale.set(1, 1, 1);
  shockwave.material.opacity = 0.28;
  shockwave.material.color.setHex(0xc9a050);
  gsap.to(shockwave.scale, { x: 12, y: 12, z: 12, duration: 2.2, ease: 'power1.out' });
  gsap.to(shockwave.material, { opacity: 0, duration: 2.2, ease: 'power1.out' });

  shockwave2.scale.set(1, 1, 1);
  shockwave2.material.opacity = 0.22;
  shockwave2.material.color.setHex(0x5a4080);
  gsap.to(shockwave2.scale, { x: 16, y: 16, z: 16, duration: 2.6, ease: 'power1.out', delay: 0.15 });
  gsap.to(shockwave2.material, { opacity: 0, duration: 2.6, ease: 'power1.out', delay: 0.15 });
}

async function fetchTodayPrediction() {
  const query = debugMode ? '?debug=1' : '';
  const res = await fetch(`${API_BASE}/api/today${query}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '无法窥探今日天机');
  return data;
}

async function startPrediction() {
  if (isLocked || isAnimating) return;
  isAnimating = true;

  // D-8: 起卦时 UI 轻微退让（呼吸感），不完全隐藏
  const ui = document.getElementById('ui-content');
  if (ui) {
    ui.style.transition = 'transform 0.6s ease, opacity 0.6s ease';
    ui.style.transform = 'scale(0.96) translateY(-1vh)';
    ui.style.opacity = '0.65';
  }
  btn.disabled = true;
  if (btn) btn.innerHTML = '<span class="btn-glow" aria-hidden="true"></span>凝神中…';

  pendingPrediction = fetchTodayPrediction().catch((err) => ({ error: err.message }));
  pendingPrediction.then((data) => {
    if (data && !data.error && digitRain) {
      digitRain.setDigitPool(data.code);
    }
  });

  digitRain.start('');
  setTimeout(() => digitRain.beginConverge(3800), 2200);
  if (starPower) starPower.start();
  if (fxOverlay) fxOverlay.starPowerOn();
  if (mysticAmbience) mysticAmbience.setRitual(true);

  if (hexRing) {
    hexRing.ritualMode(true);
    hexRing.setOpacity(0.55);
  }
  setStarRitualDim(true);

  const hexAnim = { spin: hexRingSpin, scale: 1, offsetY: 0 };
  const dimAnim = { dim: 1 };

  const timeline = gsap.timeline({
    onComplete: () => {
      digitRain.stop();
      if (starPower) starPower.stop();
      if (fxOverlay) fxOverlay.starPowerOff();
      if (mysticAmbience) mysticAmbience.setRitual(false);
      if (hexRing) {
        hexRing.ritualMode(false);
        hexRing.setScale(1);
        hexRing.setOpacity(1);
        // 清除偏移
        if (hexRing.el) hexRing.el.style.transform = '';
      }
      // D-8: 恢复 UI 状态
      if (ui) {
        ui.style.transition = '';
        ui.style.transform = '';
        ui.style.opacity = '';
      }
      starFieldDim = 1;
      // C-4: 缓慢恢复星场（1.8s）
      if (starField || baguaRing) {
        const rec = { o: 0.18 };
        gsap.to(rec, {
          o: 0.96,
          duration: 1.8,
          ease: 'power1.out',
          onUpdate: () => {
            if (starField) starField.material.opacity = rec.o;
            if (starFieldBright) starFieldBright.material.opacity = rec.o * 0.9;
            if (starFieldDust) starFieldDust.material.opacity = rec.o * 0.7;
            if (baguaRing) baguaRing.material.opacity = rec.o * 0.65;
            if (innerRing) innerRing.material.opacity = rec.o * 0.44;
            if (outerRing) outerRing.material.opacity = rec.o * 0.44;
            if (particles) particles.material.opacity = rec.o;
          },
        });
      }
      if (hexRing) hexRing.emphasize();
      // 代码闪现后的留白（400ms）
      if (btn) btn.style.display = 'none';
      setTimeout(() => showResultUI(), 400);
    },
  });

  timeline
    .to(dimAnim, {
      dim: 0.6,
      duration: 0.6,
      ease: 'power1.in',
      onUpdate: () => {
        starFieldDim = dimAnim.dim;
      },
    }, 0)
    .to(hexAnim, {
      spin: hexRingSpin - 18,
      scale: 0.55,
      offsetY: -8,
      duration: 1.4,
      ease: 'power1.in',
      onUpdate: () => {
        hexRingSpin = hexAnim.spin;
        if (hexRing) {
          hexRing.setRotation(hexRingSpin);
          hexRing.setScale(hexAnim.scale);
          // D-1: 应用向上偏移
          if (hexRing.el) {
            const offset = hexAnim.offsetY || 0;
            hexRing.el.style.transform = `translateY(${offset}vh)`;
          }
        }
      },
    }, 0)
    .to(starField.rotation, { z: '+=6', duration: 1.4, ease: 'power1.in' }, 0)
    .to(baguaRing.rotation, { z: '-=14', duration: 1.4, ease: 'power1.in' }, 0)
    .to(innerRing.rotation, { z: '+=18', duration: 1.4, ease: 'power1.in' }, 0)
    .to(outerRing.rotation, { z: '-=10', duration: 1.4, ease: 'power1.in' }, 0)
    .to(baguaCore.rotation, { z: '+=16', duration: 1.4, ease: 'power1.in' }, 0)
    .to(camera.position, { z: 4.9, duration: 1.4, ease: 'power1.inOut' }, 0)
    .to(centerGlow.material, { opacity: 0.75, duration: 1.6, ease: 'power1.in' }, 0.3)
    .to(talismanRing.material, { opacity: 0.35, duration: 1.4, ease: 'power1.in' }, 0.8);

  const collapseObj = { progress: 0 };
  timeline.to(
    collapseObj,
    {
      progress: 1,
      duration: 1.4,
      ease: 'power1.in',
      onUpdate: () => {
        animStarCollapse = collapseObj.progress;
        applyStarCollapse(collapseObj.progress);
      },
    },
    0
  );

  // 凝神停顿 600ms（星光聚拢后）
  timeline.to({}, { duration: 0.6 }, '+=0');

  // 星光回弹（300ms）
  const rebound = { s: 1 };
  timeline.to(rebound, {
    s: 0.96,
    duration: 0.12,
    ease: 'power1.in',
    onUpdate: () => {
      if (starField) starField.material.size = 0.062 * rebound.s;
      if (baguaRing) baguaRing.material.size = 0.082 * rebound.s;
      if (centerGlow) centerGlow.scale.set(rebound.s, rebound.s, 1);
    },
  }, '+=0.05');
  timeline.to(rebound, {
    s: 1,
    duration: 0.18,
    ease: 'power1.out',
    onUpdate: () => {
      if (starField) starField.material.size = 0.062 * rebound.s;
      if (baguaRing) baguaRing.material.size = 0.082 * rebound.s;
      if (centerGlow) centerGlow.scale.set(rebound.s, rebound.s, 1);
    },
  }, '+=0.12');

  timeline.to(starField.material, { opacity: 0.96, size: 0.078, duration: 1.0, ease: 'power1.in' }, '+=0.1');

  timeline.add(() => fireShockwave(), '+=0.2');

  const pColors = particles.geometry.attributes.color.array;
  timeline
    .to(particles.material, { opacity: 1, duration: 0.08 }, 1.7)
    .to(particles.material, { size: 0.055, duration: 0.12 }, 1.7)
    .to(
      particles.geometry.attributes.position.array,
      {
        end: () => {
          const arr = particles.geometry.attributes.position.array;
          for (let i = 0; i < arr.length / 3; i++) {
            const angle = Math.random() * Math.PI * 2;
            const pitch = (Math.random() - 0.5) * Math.PI;
            const distance = 2 + Math.random() * 7;
            arr[i * 3] = Math.cos(angle) * Math.cos(pitch) * distance;
            arr[i * 3 + 1] = Math.sin(angle) * Math.cos(pitch) * distance;
            arr[i * 3 + 2] = Math.sin(pitch) * distance;
            const gold = Math.random() > 0.45;
            pColors[i * 3] = gold ? 0.85 : 0.35;
            pColors[i * 3 + 1] = gold ? 0.68 : 0.22;
            pColors[i * 3 + 2] = gold ? 0.35 : 0.55;
          }
          particles.geometry.attributes.position.needsUpdate = true;
          particles.geometry.attributes.color.needsUpdate = true;
          return arr;
        },
        duration: 5.2,
        ease: 'power2.out',
      },
      1.75
    );

  timeline
    .to(camera.position, { z: 6, duration: 1.5, ease: 'power1.out' }, 6.8)
    .to(particles.material, { opacity: 0, duration: 1.4 }, 6.8)
    .to(starStreams.material, { opacity: 0, duration: 1 }, 6.8)
    .to(starField.material, { opacity: 0.96, size: 0.064, duration: 1.4 }, 6.8)
    .to(talismanRing.material, { opacity: 0, duration: 1.2 }, 6.8)
    .to(centerGlow.material, { opacity: 0.28, duration: 1.4 }, 6.8)
    .to(hexAnim, {
      scale: 1,
      duration: 1.6,
      ease: 'power2.out',
      onUpdate: () => {
        if (hexRing) hexRing.setScale(hexAnim.scale);
      },
    }, 6.8)
    .to(
      collapseObj,
      {
        progress: 0,
        duration: 1.8,
        ease: 'power2.out',
        onUpdate: () => {
          animStarCollapse = collapseObj.progress;
          applyStarCollapse(collapseObj.progress);
        },
      },
      6.8
    );
}

async function showResultUI() {
  isAnimating = false;
  animStarCollapse = 0;
  if (starPower) starPower.stop();
  if (fxOverlay) fxOverlay.starPowerOff();
  if (mysticAmbience) mysticAmbience.setRitual(false);
  if (talismanRing) talismanRing.material.opacity = 0;
  if (starField) {
    resetStarPositions();
    starField.material.opacity = 0.96;
    starField.material.size = 0.064;
  }
  if (starFieldBright) starFieldBright.material.opacity = 1;
  if (starNebula) starNebula.material.opacity = 0.32;
  if (starStreams) starStreams.material.opacity = 0;
  if (hexRing) {
    hexRing.ritualMode(false);
    hexRing.setScale(1);
    hexRing.setOpacity(0.35); // D-2: 结果显示时卦环自动降透明
  }
  setStarRitualDim(false);
  const data = await pendingPrediction;

  document.getElementById('status-panel').style.display = 'none';
  document.getElementById('stock-result').style.display = 'block';

  if (data.error) {
    document.getElementById('res-code').innerText = '------';
    document.getElementById('res-name').innerText = '卦象未明';
    document.getElementById('res-reason').innerText = data.error;
  } else {
    document.getElementById('res-code').innerText = data.code;
    document.getElementById('res-name').innerText = data.name;
    document.getElementById('res-reason').innerText = data.reason;
  }

  if (fxOverlay) fxOverlay.pulse();
  if (statusBadge) {
    statusBadge.textContent = data.error ? '卦象未明' : '天机已示';
    statusBadge.className = `status-badge ${data.error ? 'closed' : 'open'}`;
  }

  // D-7: 结果弹出动画（从下方浮现）
  const stockResult = document.getElementById('stock-result');
  if (stockResult && window.gsap) {
    stockResult.style.display = 'block';
    stockResult.style.opacity = '0';
    stockResult.style.transform = 'translateY(20px)';
    gsap.to(stockResult, {
      opacity: 1,
      y: 0,
      duration: 0.6,
      ease: 'power2.out',
      onComplete: () => {
        uiContent?.classList.add('result-reveal');
        uiContent?.classList.remove('hidden');
      },
    });
  } else {
    uiContent?.classList.add('result-reveal');
    uiContent?.classList.remove('hidden');
  }
}

window.startPrediction = startPrediction;

window.onload = initThree;

window.onresize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
};
