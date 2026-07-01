'use strict';

/**
 * 玄学数符雨：慢落 · 金紫幽光 · 卦象混列
 */
class DigitRain {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'digit-rain';
    this.canvas.style.cssText =
      'position:fixed;inset:0;width:100%;height:100%;z-index:4;pointer-events:none;opacity:0;transition:opacity 1s ease;';
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d', { alpha: true });
    this.fontFamily = '"KaiTi", "STKaiti", "SimSun", serif';
    this.monoFamily = 'Consolas, "Courier New", monospace';
    this.mysticPool = ['☰', '☱', '☲', '☳', '☴', '☵', '☶', '☷', '卦', '玄', '道', '天', '地', '宿', '☯'];
    this.cnNums = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
    this.columns = [];
    this.motes = [];
    this.rings = [];
    this.active = false;
    this.converging = false;
    this.convergeProgress = 0;
    this.digitPool = '0123456789';
    this.stockCode = '';
    this.codeFlash = 0;
    this.rafId = null;
    this.time = 0;
    this._initMotes();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  _initMotes() {
    this.motes = Array.from({ length: 14 }, () => this._spawnMote());
  }

  _spawnMote() {
    return {
      x: Math.random() * (this.viewW || window.innerWidth),
      y: Math.random() * (this.viewH || window.innerHeight),
      vy: 0.3 + Math.random() * 0.8,
      vx: (Math.random() - 0.5) * 0.2,
      size: 0.8 + Math.random() * 1.4,
      alpha: 0.04 + Math.random() * 0.1,
      phase: Math.random() * Math.PI * 2,
    };
  }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.viewW = window.innerWidth;
    this.viewH = window.innerHeight;
    this.canvas.width = Math.floor(this.viewW * this.dpr);
    this.canvas.height = Math.floor(this.viewH * this.dpr);
    this.canvas.style.width = `${this.viewW}px`;
    this.canvas.style.height = `${this.viewH}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const isMobile = this.viewW < 768;
    const targetCount = isMobile ? 8 : 11;
    this.colWidth = isMobile ? 48 : 58;

    this.columns = [];
    const leftCenter = this.viewW * 0.13;
    const rightCenter = this.viewW * 0.87;
    const sigma = this.viewW * 0.10; // 略微增加扩散，使分布更自然

    for (let i = 0; i < targetCount; i++) {
      const isLeft = i < targetCount / 2;
      const center = isLeft ? leftCenter : rightCenter;
      const x = this._gaussianRandom(center, sigma);
      const col = this._spawnColumn(i, this.colWidth, true);
      col.x = x;
      this.columns.push(col);
    }
    this._initMotes();
  }

  _gaussianRandom(mean, stdDev) {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return mean + z * stdDev;
  }

  _snap(n) {
    return Math.round(n) + 0.5;
  }

  _spawnColumn(index, colWidth, randomY = false) {
    const amp = 2.5 + Math.random() * 2.0;
    return {
      x: index * colWidth + colWidth / 2,
      y: randomY ? Math.random() * this.viewH : -80 - Math.random() * 260,
      speed: 0.7 + Math.random() * 1.2,
      chars: this._makeColumnChars(),
      mystic: Math.random() < 0.35,
      driftPhase: Math.random() * Math.PI * 2,
      driftAmp: amp,
    };
  }

  _pickChar() {
    const r = Math.random();
    if (this.stockCode && r < 0.32) {
      return this.stockCode[Math.floor(Math.random() * this.stockCode.length)];
    }
    if (r < 0.48) return this._randomDigit();
    if (r < 0.62) return this.cnNums[Math.floor(Math.random() * this.cnNums.length)];
    return this.mysticPool[Math.floor(Math.random() * this.mysticPool.length)];
  }

  _makeColumnChars() {
    const len = 5 + Math.floor(Math.random() * 5);
    const chars = [];
    for (let i = 0; i < len; i++) chars.push(this._pickChar());
    return chars;
  }

  _randomDigit() {
    return this.digitPool[Math.floor(Math.random() * this.digitPool.length)];
  }

  setDigitPool(code) {
    const digits = String(code || '').replace(/\D/g, '');
    this.stockCode = digits;
    this.digitPool = digits.length >= 4 ? digits + '0123456789' : '0123456789';
    if (digits) {
      this.codeFlash = 1.6;
      for (const col of this.columns) {
        col.chars = this._makeColumnChars();
        col.mystic = true;
      }
      this._pushRing(0.2);
    }
  }

  _pushRing(delay = 0) {
    this.rings.push({ r: 8, alpha: 0.55, delay });
  }

  start(code) {
    this.setDigitPool(code);
    this.active = true;
    this.converging = false;
    this.convergeProgress = 0;
    this.rings = [];
    this.time = 0;
    this.canvas.style.opacity = '0.42';
    if (!this.rafId) this._tick();
  }

  beginConverge(durationMs = 4200) {
    this.converging = true;
    this.convergeStart = performance.now();
    this.convergeDuration = durationMs;
    this._pushRing(0);
    this._pushRing(0.35);
    // 为每列分配随机相位，使漩涡更自然
    for (const col of this.columns) {
      col.convergePhase = Math.random() * Math.PI * 2;
    }
  }

  stop() {
    this.active = false;
    this.converging = false;
    this.codeFlash = 0;
    this.rings = [];
    this.canvas.style.opacity = '0';
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.ctx.clearRect(0, 0, this.viewW, this.viewH);
  }

  _isDigit(ch) {
    return /[0-9]/.test(ch);
  }

  _drawChar(x, y, char, { head = false, stock = false, mystic = false, alpha = 1, size = 18 } = {}) {
    const ctx = this.ctx;
    const px = this._snap(x);
    const py = this._snap(y);
    const isNum = this._isDigit(char);
    const font = isNum ? this.monoFamily : this.fontFamily;
    const weight = head || stock ? '700' : '600';

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 0;

    if (head) {
      ctx.font = `${weight} ${size + 4}px ${font}`;
      ctx.fillStyle = `rgba(120, 80, 160, ${0.15 * alpha})`;
      ctx.fillText(char, px, py);
    }

    ctx.font = `${weight} ${size}px ${font}`;
    if (head) {
      ctx.fillStyle = `rgba(240, 220, 170, ${Math.min(1, alpha * 0.95)})`;
      ctx.fillText(char, px, py);
      ctx.strokeStyle = `rgba(160, 120, 60, ${Math.min(1, alpha * 0.7)})`;
      ctx.lineWidth = 0.8;
      ctx.strokeText(char, px, py);
    } else if (stock) {
      ctx.fillStyle = `rgba(220, 190, 110, ${Math.min(1, alpha * 0.88)})`;
      ctx.fillText(char, px, py);
    } else if (mystic && !isNum) {
      ctx.fillStyle = `rgba(150, 120, 200, ${Math.min(1, alpha * 0.55)})`;
      ctx.fillText(char, px, py);
    } else if (isNum) {
      ctx.fillStyle = `rgba(140, 130, 170, ${Math.min(1, alpha * 0.65)})`;
      ctx.fillText(char, px, py);
    } else {
      ctx.fillStyle = `rgba(120, 100, 150, ${Math.min(1, alpha * 0.5)})`;
      ctx.fillText(char, px, py);
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  _drawMotes(width, height, cx, cy) {
    const ctx = this.ctx;
    for (let i = 0; i < this.motes.length; i++) {
      const m = this.motes[i];
      if (this.converging) {
        const pull = this.convergeProgress * 0.015;
        m.x += (cx - m.x) * pull + m.vx;
        m.y += (cy - m.y) * pull + m.vy * 0.3;
      } else {
        m.x += m.vx;
        m.y += m.vy;
      }
      const tw = 0.5 + Math.sin(this.time * 0.02 + m.phase) * 0.5;
      if (m.y > height + 5) {
        this.motes[i] = this._spawnMote();
        this.motes[i].y = -5;
        continue;
      }
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180, 150, 100, ${m.alpha * tw})`;
      ctx.fill();
    }
  }

  _drawRings(cx, cy) {
    const ctx = this.ctx;
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const ring = this.rings[i];
      ring.delay = Math.max(0, ring.delay - 0.012);
      if (ring.delay > 0) continue;
      ring.r += this.converging ? 2.2 : 1.4;
      ring.alpha *= 0.988;
      if (ring.alpha < 0.02) {
        this.rings.splice(i, 1);
        continue;
      }
      ctx.beginPath();
      ctx.arc(cx, cy, ring.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(160, 120, 60, ${ring.alpha * 0.45})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  _drawVortex(cx, cy, strength) {
    if (strength < 0.1) return;
    const ctx = this.ctx;
    const r = 60 + strength * 180;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(80, 50, 30, ${0.15 * strength})`);
    g.addColorStop(0.4, `rgba(50, 25, 80, ${0.08 * strength})`);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  _tick() {
    if (!this.active) {
      this.rafId = null;
      return;
    }

    this.time += 0.016;
    const width = this.viewW;
    const height = this.viewH;
    const cx = width / 2;
    const cy = height / 2;

    this.ctx.fillStyle = this.converging ? 'rgba(2, 1, 8, 0.14)' : 'rgba(2, 1, 8, 0.1)';
    this.ctx.fillRect(0, 0, width, height);

    if (this.converging) {
      this.convergeProgress = Math.min(
        1,
        (performance.now() - this.convergeStart) / this.convergeDuration
      );
      this._drawVortex(cx, cy, this.convergeProgress);
    }

    this._drawMotes(width, height, cx, cy);
    this._drawRings(cx, cy);

    const lineGap = 32;
    const baseSize = this.viewW > 768 ? 16 : 14;

    for (const col of this.columns) {
      if (!this.converging) {
        col.y += col.speed;
        if (col.y - col.chars.length * lineGap > height + 40) {
          col.y = -lineGap * col.chars.length - Math.random() * 160;
          col.chars = this._makeColumnChars();
          col.speed = 0.7 + Math.random() * 1.2;
          col.mystic = Math.random() < 0.35;
        }
      }

      for (let i = 0; i < col.chars.length; i++) {
        const char = col.chars[i];
        const drift = col.driftAmp ? Math.sin(this.time * 0.9 + col.driftPhase) * col.driftAmp : 0;
        let x = col.x + drift;
        let y = col.y - i * lineGap;
        if (y < -30 || y > height + 30) continue;

        let alpha = Math.max(0.12, 0.72 - i * 0.14);
        let size = baseSize;

        if (this.converging) {
          const ease = 1 - Math.pow(1 - this.convergeProgress, 3);
          const angle = Math.atan2(y - cy, x - cx);
          const dist = Math.hypot(x - cx, y - cy);
          const phase = col.convergePhase || 0;
          // 越靠近中心，转得越快，形成漩涡
          const spin = (1 - ease) * (1.6 + (1 - dist / Math.max(this.viewW, this.viewH) * 0.5));
          const newDist = dist * (1 - ease * 0.96);
          const newAngle = angle + spin + phase * 0.3 * (1 - ease);
          x = cx + Math.cos(newAngle) * newDist;
          y = cy + Math.sin(newAngle) * newDist + ease * 0.4; // 轻微向下加速，增加重量感
          alpha = Math.max(0.25, alpha * (1 - this.convergeProgress * 0.15));
          size = baseSize + ease * 6;
        }

        const isHead = i === 0;
        const isStock = this.stockCode && this.stockCode.includes(char);
        this._drawChar(x, y, char, {
          head: isHead,
          stock: !isHead && isStock,
          mystic: col.mystic,
          alpha,
          size,
        });
      }
    }

    if (this.codeFlash > 0) {
      this.codeFlash = Math.max(0, this.codeFlash - 0.008);
      const fontSize = Math.round(48 + (1 - this.codeFlash / 1.6) * 12);
      const ctx = this.ctx;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 ${fontSize}px ${this.monoFamily}`;
      ctx.fillStyle = `rgba(120, 80, 40, ${this.codeFlash * 0.2})`;
      ctx.fillText(this.stockCode || '······', this._snap(cx), this._snap(cy));
      ctx.globalAlpha = Math.min(1, this.codeFlash);
      ctx.fillStyle = 'rgba(230, 210, 160, 0.92)';
      ctx.strokeStyle = 'rgba(140, 100, 50, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.strokeText(this.stockCode || '······', this._snap(cx), this._snap(cy));
      ctx.fillText(this.stockCode || '······', this._snap(cx), this._snap(cy));
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    this.rafId = requestAnimationFrame(() => this._tick());
  }
}

window.DigitRain = DigitRain;
