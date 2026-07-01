'use strict';

/**
 * 六十四卦环 — 序号 + 均匀卦序 + 刻度环
 */
class HexagramRing {
  constructor() {
    this.el = document.createElement('div');
    this.el.id = 'hexagram-ring';
    this.el.setAttribute('aria-hidden', 'true');

    this.legend = document.createElement('div');
    this.legend.className = 'hex-seq-legend';
    this.legend.innerHTML =
      '<span class="hex-seq-title">周易六十四卦</span>' +
      '<span class="hex-seq-dir">① 起北 · 顺时读至 64 · 每八卦示名 · 余为刻度</span>';

    this.orderPin = document.createElement('div');
    this.orderPin.className = 'hex-order-pin';
    this.orderPin.title = '第一卦「乾」起始方位';

    this.track = document.createElement('div');
    this.track.className = 'hex-track';

    this.spinner = document.createElement('div');
    this.spinner.className = 'hex-spinner';

    this.el.appendChild(this.legend);
    this.el.appendChild(this.orderPin);
    this.el.appendChild(this.track);
    this.el.appendChild(this.spinner);
    document.body.appendChild(this.el);

    this.rotation = 0;
    this.scale = 1;
    this.ringRadius = 40;
    this.ritual = false;
    this.el.style.setProperty('--hex-r', `${this.ringRadius}vmin`);
    this._buildTicks();
    this._buildLabels();
  }

  _buildTicks() {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'hex-ticks');
    svg.setAttribute('viewBox', '-100 -100 200 200');
    svg.setAttribute('aria-hidden', 'true');

    const guide = document.createElementNS(NS, 'circle');
    guide.setAttribute('cx', '0');
    guide.setAttribute('cy', '0');
    guide.setAttribute('r', '96');
    guide.setAttribute('class', 'hex-tick-ring');
    svg.appendChild(guide);

    for (let i = 0; i < 64; i++) {
      const deg = (i / 64) * 360 - 90;
      const rad = (deg * Math.PI) / 180;
      const major = i % 8 === 0;
      const rIn = major ? 86 : 91;
      const rOut = 98;

      const line = document.createElementNS(NS, 'line');
      line.setAttribute('x1', String(Math.cos(rad) * rIn));
      line.setAttribute('y1', String(Math.sin(rad) * rIn));
      line.setAttribute('x2', String(Math.cos(rad) * rOut));
      line.setAttribute('y2', String(Math.sin(rad) * rOut));
      line.setAttribute('class', major ? 'hex-tick hex-tick--major' : 'hex-tick');
      svg.appendChild(line);
    }

    this.spinner.appendChild(svg);
  }

  _buildLabels() {
    const names = window.HEXAGRAMS || [];
    const total = names.length;

    names.forEach((name, i) => {
      if (i % 8 !== 0) return;

      const idx = i + 1;
      const isDouble = name.length > 1;
      const oct = Math.floor(i / 8);
      const angle = (i / total) * 360 - 90;

      const item = document.createElement('span');
      item.className = 'hex-label hex-label--oct';
      if (isDouble) item.classList.add('hex-label--double');
      item.dataset.index = String(idx);
      item.dataset.oct = String(oct);

      const idxEl = document.createElement('span');
      idxEl.className = 'hex-idx';
      idxEl.textContent = String(idx).padStart(2, '0');
      item.appendChild(idxEl);

      const nameEl = document.createElement('span');
      nameEl.className = 'hex-name';
      nameEl.textContent = name;
      item.appendChild(nameEl);

      item.style.setProperty('--a', `${angle}deg`);
      this.spinner.appendChild(item);
    });
  }

  _applyTransform() {
    this.spinner.style.transform = `rotate(${this.rotation}rad) scale(${this.scale})`;
  }

  setRotation(rad) {
    this.rotation = rad;
    this._applyTransform();
  }

  setScale(s) {
    this.scale = s;
    this._applyTransform();
  }

  setOpacity(o) {
    this.el.style.opacity = String(Math.max(0, Math.min(1, o)));
  }

  ritualMode(on) {
    this.ritual = on;
    this.el.classList.toggle('is-ritual', on);
  }

  getRotationSpeed() {
    return this.ritual ? 0.7 : 1.0;
  }

  emphasize() {
    const labels = this.el.querySelectorAll('.hex-label');
    labels.forEach((el, i) => {
      el.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
      el.style.transform = `rotate(var(--a)) translateY(calc(-1 * var(--hex-r, 40vmin))) rotate(calc(-1 * var(--a))) translate(-50%, -50%) scale(1.08)`;
      el.style.boxShadow = '0 0 0 1px rgba(255, 215, 120, 0.55), 0 0 20px rgba(255, 200, 80, 0.6), 0 2px 10px rgba(0, 0, 0, 0.6)';
      setTimeout(() => {
        el.style.transform = `rotate(var(--a)) translateY(calc(-1 * var(--hex-r, 40vmin))) rotate(calc(-1 * var(--a))) translate(-50%, -50%) scale(1)`;
        el.style.boxShadow = '';
        setTimeout(() => {
          el.style.transition = '';
        }, 200);
      }, 220 + i * 15);
    });
  }

  hide() {
    this.el.classList.add('is-off');
  }

  show() {
    this.el.classList.remove('is-off');
  }
}

window.HexagramRing = HexagramRing;
