'use strict';

/**
 * 玄学起卦 · 星辰灌注（慢节奏 · 深紫金 · 符阵）
 */
class StarPowerOverlay {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'fx-star-power';
    this.canvas.style.cssText =
      'position:fixed;inset:0;width:100%;height:100%;z-index:5;pointer-events:none;opacity:0;transition:opacity 1.2s ease;';
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.active = false;
    this.startTime = 0;
    this.meteors = [];
    this.constellation = [];
    this.rafId = null;
    this.phase = 'gather';
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this._buildConstellation();
  }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
    this.canvas.style.width = `${this.w}px`;
    this.canvas.style.height = `${this.h}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.cx = this.w / 2;
    this.cy = this.h / 2;
    this._buildConstellation();
  }

  _buildConstellation() {
    const pts = [];
    const n = 28;
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      const r = 0.28 + (i % 4) * 0.04;
      pts.push({
        bx: 0.5 + Math.cos(angle) * r,
        by: 0.5 + Math.sin(angle) * r,
        phase: Math.random() * Math.PI * 2,
      });
    }
    this.constellation = pts;
  }

  _spawnMeteor(inward = true) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.max(this.w, this.h) * 0.7;
    const speed = inward ? 1.2 + Math.random() * 2 : 1.5 + Math.random() * 3.5;
    if (inward) {
      return {
        x: this.cx + Math.cos(angle) * dist,
        y: this.cy + Math.sin(angle) * dist,
        vx: -Math.cos(angle) * speed,
        vy: -Math.sin(angle) * speed,
        len: 18 + Math.random() * 30,
        life: 1,
      };
    }
    return {
      x: this.cx + (Math.random() - 0.5) * 20,
      y: this.cy + (Math.random() - 0.5) * 20,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      len: 24 + Math.random() * 40,
      life: 1,
    };
  }

  start() {
    this.active = true;
    this.startTime = performance.now();
    this.phase = 'gather';
    const count = window.innerWidth < 768 ? 14 : 10;
    this.meteors = Array.from({ length: count }, () => this._spawnMeteor(true));
    this.canvas.style.opacity = '1';
    if (!this.rafId) this._tick();
  }

  burst() {
    this.phase = 'release';
    const count = window.innerWidth < 768 ? 20 : 16;
    this.meteors = Array.from({ length: count }, () => this._spawnMeteor(false));
  }

  stop() {
    this.active = false;
    this.canvas.style.opacity = '0';
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.ctx.clearRect(0, 0, this.w, this.h);
  }

  _drawBagua(elapsed, strength) {
    const ctx = this.ctx;
    const rot = elapsed * 0.00008 * (this.phase === 'release' ? 1.4 : 1);
    const r = 88 + strength * 42;
    ctx.save();
    ctx.translate(this.cx, this.cy);
    ctx.rotate(rot);

    ctx.strokeStyle = `rgba(160, 120, 60, ${0.22 * strength})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 8;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.strokeStyle = `rgba(100, 70, 160, ${0.18 * strength})`;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.38, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.38, Math.sin(a) * r * 0.38);
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawConstellation(elapsed, strength) {
    const ctx = this.ctx;
    const rot = elapsed * 0.00005;
    const pts = this.constellation.map((p) => {
      const wobble = Math.sin(elapsed * 0.001 + p.phase) * 0.008 * strength;
      const a = Math.atan2(p.by - 0.5, p.bx - 0.5) + rot;
      const d = Math.hypot(p.bx - 0.5, p.by - 0.5) + wobble;
      return {
        x: this.cx + Math.cos(a) * d * Math.min(this.w, this.h),
        y: this.cy + Math.sin(a) * d * Math.min(this.w, this.h),
      };
    });

    ctx.strokeStyle = `rgba(120, 90, 180, ${0.06 * strength})`;
    ctx.lineWidth = 0.8;
    for (let i = 0; i < pts.length; i++) {
      const j = (i + 5) % pts.length;
      ctx.beginPath();
      ctx.moveTo(pts[i].x, pts[i].y);
      ctx.lineTo(pts[j].x, pts[j].y);
      ctx.stroke();
    }

    for (const p of pts) {
      const tw = 0.5 + Math.sin(elapsed * 0.003 + p.x) * 0.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.5 + tw, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220, 190, 120, ${0.35 * strength * tw})`;
      ctx.fill();
    }
  }

  _drawCore(elapsed, strength) {
    const ctx = this.ctx;
    const pulse = 0.88 + Math.sin(elapsed * 0.002) * 0.12;
    const r = (36 + strength * 64) * pulse;
    const g = ctx.createRadialGradient(this.cx, this.cy, 0, this.cx, this.cy, r);
    g.addColorStop(0, `rgba(120, 80, 40, ${0.35 * strength})`);
    g.addColorStop(0.35, `rgba(60, 30, 90, ${0.18 * strength})`);
    g.addColorStop(0.7, `rgba(20, 8, 40, ${0.06 * strength})`);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawMeteors() {
    const ctx = this.ctx;
    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      m.x += m.vx;
      m.y += m.vy;
      m.life -= this.phase === 'gather' ? 0.002 : 0.003;

      const mag = Math.hypot(m.vx, m.vy) || 1;
      const tailX = m.x - (m.vx / mag) * m.len;
      const tailY = m.y - (m.vy / mag) * m.len;
      const grad = ctx.createLinearGradient(tailX, tailY, m.x, m.y);
      grad.addColorStop(0, 'rgba(80, 40, 120, 0)');
      grad.addColorStop(0.6, `rgba(180, 140, 70, ${m.life * 0.35})`);
      grad.addColorStop(1, `rgba(220, 200, 140, ${m.life * 0.55})`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(m.x, m.y);
      ctx.stroke();

      const near = Math.hypot(m.x - this.cx, m.y - this.cy) < 30;
      if (m.life <= 0 || (this.phase === 'gather' && near)) {
        this.meteors[i] = this._spawnMeteor(this.phase === 'gather');
      }
    }
    while (this.meteors.length < (this.phase === 'gather' ? 8 : 12)) {
      this.meteors.push(this._spawnMeteor(this.phase === 'gather'));
    }
  }

  _tick() {
    if (!this.active) {
      this.rafId = null;
      return;
    }
    const elapsed = performance.now() - this.startTime;
    const gatherEnd = 1800;
    let strength;
    if (elapsed < gatherEnd) strength = elapsed / gatherEnd;
    else if (elapsed < 6800) strength = 1;
    else strength = Math.max(0, 1 - (elapsed - 6800) / 1600);

    this.ctx.clearRect(0, 0, this.w, this.h);

    this._drawConstellation(elapsed, strength);
    this._drawBagua(elapsed, strength);
    this._drawCore(elapsed, strength);
    this._drawMeteors();

    this.rafId = requestAnimationFrame(() => this._tick());
  }
}

window.StarPowerOverlay = StarPowerOverlay;
