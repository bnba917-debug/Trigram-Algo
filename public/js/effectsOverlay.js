'use strict';

class EffectsOverlay {
  constructor() {
    this.flash = document.createElement('div');
    this.flash.id = 'fx-flash';
    document.body.appendChild(this.flash);

    if (!document.getElementById('fx-vignette')) {
      const vignette = document.createElement('div');
      vignette.id = 'fx-vignette';
      document.body.appendChild(vignette);
    }

    if (!document.getElementById('fx-star-rays')) {
      const rays = document.createElement('div');
      rays.id = 'fx-star-rays';
      document.body.appendChild(rays);
    }
    if (!document.getElementById('fx-mist')) {
      const mist = document.createElement('div');
      mist.id = 'fx-mist';
      document.body.appendChild(mist);
    }
    this.starRays = document.getElementById('fx-star-rays');
    this.mist = document.getElementById('fx-mist');
  }

  starPowerOn() {
    this.mist?.classList.add('active');
  }

  starPowerOff() {
    this.mist?.classList.remove('active');
  }

  burst(intensity = 1) {
    this.flash.classList.remove('fade');
    this.flash.classList.add('active');
    this.flash.style.opacity = String(0.12 + intensity * 0.18);

    window.setTimeout(() => {
      this.flash.classList.add('fade');
      this.flash.classList.remove('active');
    }, 100);

    window.setTimeout(() => {
      this.flash.classList.remove('fade');
      this.flash.style.opacity = '';
    }, 850);
  }

  pulse() {
    this.flash.classList.remove('fade');
    this.flash.style.opacity = '0.14';
    window.setTimeout(() => {
      this.flash.classList.add('fade');
    }, 40);
    window.setTimeout(() => {
      this.flash.classList.remove('fade');
      this.flash.style.opacity = '';
    }, 400);
  }

  vignettePulse() {
    const v = document.getElementById('fx-vignette');
    if (!v) return;
    v.style.transition = 'opacity 1.2s ease';
    v.style.opacity = '0.72';
    setTimeout(() => {
      v.style.opacity = '0.55';
      setTimeout(() => {
        v.style.transition = '';
      }, 1200);
    }, 1200);
  }
}

window.EffectsOverlay = EffectsOverlay;
