'use strict';

/**
 * 全局玄学氛围层：迷雾 · 浮符 · 星尘 · 暗角脉动
 */
class MysticAmbience {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'fx-mystic';
    this.canvas.style.cssText =
      'position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;opacity:1;';
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.intensity = 0.2;
    this.targetIntensity = 0.2;
    this.symbols = ['☰', '☱', '☲', '☳', '☴', '☵', '☶', '☷', '卦', '玄', '道', '天', '地', '人', '☯', '宿'];
    this.floaters = [];
    this.mists = [];
    this.rafId = null;
    this.time = 0;
    this._initFloaters();
    this._initMists();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this._tick();
  }

  _initFloaters() {
    this.floaters = [];
  }

  _spawnFloater() {
    return {
      x: Math.random(),
      y: Math.random(),
      char: this.symbols[Math.floor(Math.random() * this.symbols.length)],
      size: 14 + Math.random() * 22,
      drift: (Math.random() - 0.5) * 0.00008,
      rise: -0.00003 - Math.random() * 0.00005,
      rot: (Math.random() - 0.5) * 0.0004,
      angle: Math.random() * Math.PI * 2,
      alpha: 0.04 + Math.random() * 0.08,
      phase: Math.random() * Math.PI * 2,
    };
  }

  _initMists() {
    this.mists = Array.from({ length: 3 }, (_, i) => ({
      x: 0.25 + i * 0.25,
      y: 0.35 + (i % 2) * 0.25,
      r: 0.2 + Math.random() * 0.15,
      speed: 0.0001 + Math.random() * 0.00012,
      phase: Math.random() * Math.PI * 2,
    }));
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
  }

  setRitual(active) {
    this.targetIntensity = active ? 0.42 : 0.2;
  }

  _drawGrain() {
    /* 关闭噪点层，避免画面发脏 */
  }

  _drawMist(strength) {
    const ctx = this.ctx;
    for (const m of this.mists) {
      m.phase += m.speed;
      const cx = (m.x + Math.sin(m.phase) * 0.08) * this.w;
      const cy = (m.y + Math.cos(m.phase * 0.7) * 0.06) * this.h;
      const r = m.r * Math.max(this.w, this.h) * (0.8 + strength * 0.4);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, `rgba(40, 20, 70, ${0.08 * strength})`);
      g.addColorStop(0.45, `rgba(20, 10, 40, ${0.05 * strength})`);
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawFloaters(strength) {
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of this.floaters) {
      f.x += f.drift;
      f.y += f.rise;
      f.angle += f.rot;
      if (f.x < -0.05 || f.x > 1.05 || f.y < -0.05 || f.y > 1.05) {
        Object.assign(f, this._spawnFloater());
        f.y = 1.05;
      }
      const pulse = 0.6 + Math.sin(this.time * 0.002 + f.phase) * 0.4;
      const px = f.x * this.w;
      const py = f.y * this.h;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(f.angle);
      ctx.font = `${f.size}px "KaiTi", "STKaiti", "SimSun", serif`;
      ctx.fillStyle = `rgba(180, 150, 90, ${f.alpha * pulse * strength})`;
      ctx.fillText(f.char, 0, 0);
      ctx.restore();
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  _drawVignettePulse(strength) {
    const ctx = this.ctx;
    const pulse = 0.85 + Math.sin(this.time * 0.0015) * 0.15;
    const g = ctx.createRadialGradient(
      this.w / 2,
      this.h / 2,
      Math.min(this.w, this.h) * 0.28,
      this.w / 2,
      this.h / 2,
      Math.max(this.w, this.h) * 0.78
    );
    g.addColorStop(0, 'rgba(0, 0, 0, 0)');
    g.addColorStop(0.6, `rgba(8, 2, 18, ${0.04 * strength * pulse})`);
    g.addColorStop(1, `rgba(0, 0, 0, ${0.22 * strength * pulse})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.w, this.h);
  }

  _tick() {
    this.time += 16;
    this.intensity += (this.targetIntensity - this.intensity) * 0.025;

    this.ctx.clearRect(0, 0, this.w, this.h);
    this._drawMist(this.intensity);
    this._drawVignettePulse(this.intensity);

    this.rafId = requestAnimationFrame(() => this._tick());
  }
}

window.MysticAmbience = MysticAmbience;
