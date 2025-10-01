/**
 * HeatSlider Component (Global Build)
 * Class-based slider for visualizing oven heat distribution with
 * scoped styling, pointer + keyboard controls, and reusable API.
 *
 * Designed for direct <script> usage in prototype files without bundlers.
 */

(function (global) {
  'use strict';

  const PRESET_STEPS = [0, 25, 50, 75, 100];
  const DEFAULT_KEYS = { left: 'o', right: 'p', reset: 'r', toggle: 'q' };

  const clampPercent = (value) => {
    const n = Number(value);
    if (Number.isNaN(n)) return 0;
    return Math.max(0, Math.min(100, Math.round(n)));
  };

  const clampRange = (value, min, max) => {
    const n = Number(value);
    if (Number.isNaN(n)) return min;
    return Math.max(min, Math.min(max, n));
  };

  const parseColorToRgb = (value) => {
    if (!value || typeof value !== 'string') return null;
    const trimmed = value.trim();

    if (trimmed.startsWith('#')) {
      const hex = trimmed.slice(1);
      if (hex.length === 3) {
        const r = parseInt(hex[0] + hex[0], 16);
        const g = parseInt(hex[1] + hex[1], 16);
        const b = parseInt(hex[2] + hex[2], 16);
        return { r, g, b };
      }
      if (hex.length === 6) {
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return { r, g, b };
      }
      return null;
    }

    const rgbMatch = trimmed.match(/rgba?\(([^)]+)\)/i);
    if (rgbMatch) {
      const parts = rgbMatch[1].split(',').map(part => parseFloat(part.trim()));
      if (parts.length >= 3 && parts.every(n => Number.isFinite(n))) {
        const [r, g, b] = parts;
        return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
      }
    }

    return null;
  };

  const createSvgIcon = (rotation = 0) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '25');
    svg.setAttribute('height', '24');
    svg.setAttribute('viewBox', '0 0 25 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    if (rotation !== 0) {
      svg.style.transform = `rotate(${rotation}deg)`;
    }

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M21.6667 13.25C22.219 13.25 22.6667 13.6977 22.6667 14.25V18C22.6667 20.2091 20.8759 22 18.6667 22H6.66675C4.45761 22 2.66675 20.2091 2.66675 18V14.25C2.66675 13.6977 3.11446 13.25 3.66675 13.25C4.21903 13.25 4.66675 13.6977 4.66675 14.25V18C4.66675 19.1046 5.56218 20 6.66675 20H18.6667C19.7713 20 20.6667 19.1046 20.6667 18V14.25C20.6667 13.6977 21.1145 13.25 21.6667 13.25ZM18.6667 2C20.8759 2 22.6667 3.79086 22.6667 6V9.75C22.6667 10.3023 22.219 10.75 21.6667 10.75C21.1145 10.75 20.6667 10.3023 20.6667 9.75V6C20.6667 4.89543 19.7713 4 18.6667 4H6.66675C5.56218 4 4.66675 4.89543 4.66675 6V9.75C4.66675 10.3023 4.21903 10.75 3.66675 10.75C3.11446 10.75 2.66675 10.3023 2.66675 9.75V6C2.66675 3.79086 4.45761 2 6.66675 2H18.6667ZM16.7244 6C17.1213 6.00004 17.3933 6.207 17.53 6.34668L17.533 6.34961L19.3845 8.25684C19.7692 8.65308 19.7593 9.2862 19.363 9.6709C18.9668 10.0555 18.3337 10.0466 17.949 9.65039L16.7244 8.38867L15.4988 9.65039L15.4968 9.65332C15.3602 9.79299 15.0881 9.99993 14.6912 10C14.2943 9.99999 14.0222 9.79301 13.8855 9.65332L13.8826 9.65039L12.6501 8.37988L11.5291 9.50391C11.4847 9.57969 11.4308 9.65153 11.365 9.71582C10.9698 10.1013 10.3367 10.0932 9.95093 9.69824L8.66675 8.38281L7.38257 9.69824C6.99685 10.0933 6.36368 10.1013 5.96851 9.71582C5.57348 9.3301 5.56545 8.69693 5.95093 8.30176L7.85815 6.34863L7.86011 6.3457L7.98901 6.23242C8.14242 6.11535 8.3699 6 8.66675 6C9.06261 6.00001 9.33513 6.2052 9.47339 6.3457L9.47534 6.34863L10.6511 7.55273L11.8582 6.34082L11.8591 6.3418C11.9977 6.20225 12.2667 6.00001 12.658 6C13.0549 6.0001 13.327 6.20702 13.4636 6.34668L13.4656 6.34961L14.6912 7.61035L15.9158 6.34961L15.9187 6.34668L16.0466 6.23438C16.1993 6.11711 16.4265 6.00001 16.7244 6Z');
    path.setAttribute('fill', 'white');
    svg.appendChild(path);
    return svg;
  };

  const createElement = (tag, className, attributes = {}) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    Object.entries(attributes).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (key === 'text') {
        el.textContent = value;
      } else {
        el.setAttribute(key, value);
      }
    });
    return el;
  };

  class HeatSlider {
    constructor(target, options = {}) {
      const container = typeof target === 'string' ? document.querySelector(target) : target;
      if (!container) {
        throw new Error(`HeatSlider: container "${target}" not found`);
      }

      const keyboardOptions = options.keyboardKeys || {};
      this.options = {
        initialPosition: options.initialTopPercent ?? options.initialPosition ?? 50,
        showLabel: options.showLabel ?? false,
        enableShortcuts: options.enableKeyboard ?? true,
        enableFocusKeyboard: options.enableFocusKeyboard ?? true,
        keyboardKeys: {
          left: keyboardOptions.left || DEFAULT_KEYS.left,
          right: keyboardOptions.right || DEFAULT_KEYS.right,
          reset: keyboardOptions.reset || DEFAULT_KEYS.reset,
          toggle: keyboardOptions.toggle || DEFAULT_KEYS.toggle
        },
        stepMode: options.stepMode || 'preset',
        enablePointer: options.enablePointer ?? true,
        labelFormatter: options.labelFormatter || ((bottomPct, topPct) => `${bottomPct}% Bottom / ${topPct}% Top`),
        hotColor: options.hotColor,
        coolColor: options.coolColor,
        intensity: options.intensity,
        animationMs: options.animationMs,
        onChange: options.onChange,
        onToggle: options.onToggle,
        showTitle: options.showTitle ?? false,
        titleText: options.titleText ?? 'Heat Distribution'
      };

      this.root = container;
      this.root.classList.add('heat-slider');
      this.root.innerHTML = '';

      this._isOn = true;
      this._currentTop = clampPercent(this.options.initialPosition);
      this._dragActive = false;

      this._buildMarkup();
      this._applyTheme();
      this._bindEvents();
      this.setPosition(this._currentTop);
      this.showTitle(this.options.showTitle);

      HeatSlider.instances.add(this);
    }

    _buildMarkup() {
      const row = createElement('div', 'heat-slider__row', {
        role: 'group',
        'aria-label': 'Heat distribution'
      });

      this.iconBottom = createElement('div', 'heat-slider__icon heat-slider__icon--bottom', {
        role: 'img',
        'aria-label': 'Bottom element'
      });
      this.iconBottom.appendChild(createSvgIcon(180));

      this.heatbar = createElement('div', 'heat-slider__heatbar', {
        role: 'slider',
        'aria-valuemin': '0',
        'aria-valuemax': '100',
        'aria-valuenow': String(this._currentTop),
        tabindex: '0'
      });

      this.overlay = createElement('div', 'heat-slider__overlay');
      this.indicator = createElement('div', 'heat-slider__indicator', { 'aria-hidden': 'true' });
      this.heatbar.append(this.overlay, this.indicator);

      this.iconTop = createElement('div', 'heat-slider__icon heat-slider__icon--top', {
        role: 'img',
        'aria-label': 'Top element'
      });
      this.iconTop.appendChild(createSvgIcon(0));

      row.append(this.iconBottom, this.heatbar, this.iconTop);

      this.titleEl = createElement('div', 'heat-slider__title');
      this.titleEl.textContent = this.options.titleText;

      this.root.append(this.titleEl, row);
    }

    _applyTheme() {
      if (this.options.hotColor) {
        const rgb = parseColorToRgb(this.options.hotColor);
        if (rgb) {
          this.root.style.setProperty('--heat-slider-hot-r', String(rgb.r));
          this.root.style.setProperty('--heat-slider-hot-g', String(rgb.g));
          this.root.style.setProperty('--heat-slider-hot-b', String(rgb.b));
        }
      }
      if (this.options.coolColor) {
        this.root.style.setProperty('--heat-slider-cool', this.options.coolColor);
      }
      if (this.options.intensity != null) {
        this.setIntensity(this.options.intensity);
      }
      if (this.options.animationMs != null) {
        this.setAnimationDuration(this.options.animationMs);
      }
    }

    _bindEvents() {
      if (this.options.enablePointer) {
        this._onPointerDown = (event) => {
          if (!this._isOn) return;
          event.preventDefault();
          this._dragActive = true;
          this.root.classList.add('heat-slider--dragging');
          this._updateFromPointer(event);
          window.addEventListener('pointermove', this._onPointerMove);
          window.addEventListener('pointerup', this._onPointerUp);
          window.addEventListener('pointercancel', this._onPointerUp);
        };

        this._onPointerMove = (event) => {
          if (!this._dragActive) return;
          this._updateFromPointer(event);
        };

        this._onPointerUp = () => {
          if (!this._dragActive) return;
          this._dragActive = false;
          this.root.classList.remove('heat-slider--dragging');
          window.removeEventListener('pointermove', this._onPointerMove);
          window.removeEventListener('pointerup', this._onPointerUp);
          window.removeEventListener('pointercancel', this._onPointerUp);
        };

        this.heatbar.addEventListener('pointerdown', this._onPointerDown);
      }

      this._onBarKeyDown = (event) => {
        if (!this.options.enableFocusKeyboard) return;
        if (!this._isOn) return;
        const key = event.key;
        if (key === 'ArrowLeft' || key === 'ArrowDown') {
          event.preventDefault();
          this._nudge(-1);
        } else if (key === 'ArrowRight' || key === 'ArrowUp') {
          event.preventDefault();
          this._nudge(1);
        } else if (key === 'Home') {
          event.preventDefault();
          this.setPosition(0);
        } else if (key === 'End') {
          event.preventDefault();
          this.setPosition(100);
        } else if (key === ' ') {
          event.preventDefault();
          this.toggle();
        }
      };

      this.heatbar.addEventListener('keydown', this._onBarKeyDown);

      if (this.options.enableShortcuts) {
        this._onShortcutKeyDown = (event) => {
          const key = event.key.toLowerCase();
          if (key === this.options.keyboardKeys.toggle) {
            event.preventDefault();
            this.toggle();
            return;
          }
          if (!this._isOn) return;
          if (key === this.options.keyboardKeys.left) {
            event.preventDefault();
            this._nudge(-1);
          } else if (key === this.options.keyboardKeys.right) {
            event.preventDefault();
            this._nudge(1);
          } else if (key === this.options.keyboardKeys.reset) {
            event.preventDefault();
            this.setPosition(50);
          }
        };
        document.addEventListener('keydown', this._onShortcutKeyDown);
      }
    }

    _updateFromPointer(event) {
      const rect = this.heatbar.getBoundingClientRect();
      const ratio = (event.clientX - rect.left) / rect.width;
      const clamped = Math.max(0, Math.min(1, ratio));
      this.setPosition(clampPercent(clamped * 100));
    }

    _nudge(direction) {
      const current = this.getPosition();
      if (this.options.stepMode === 'preset') {
        const idx = PRESET_STEPS.findIndex((value) => Math.abs(value - current) <= 2);
        if (idx === -1) {
          const nextIndex = direction < 0
            ? PRESET_STEPS.findIndex((value) => value >= current) - 1
            : PRESET_STEPS.findIndex((value) => value > current);
          if (nextIndex >= 0 && nextIndex < PRESET_STEPS.length) {
            this.setPosition(PRESET_STEPS[nextIndex]);
          }
          return;
        }
        const targetIndex = idx + direction;
        if (targetIndex >= 0 && targetIndex < PRESET_STEPS.length) {
          this.setPosition(PRESET_STEPS[targetIndex]);
        }
      } else {
        const stepSize = parseInt(this.options.stepMode, 10) || 1;
        this.setPosition(current + (direction * stepSize));
      }
    }

    setPosition(value) {
      const topPct = clampPercent(value);
      const wasDifferent = topPct !== this._currentTop;
      this._currentTop = topPct;
      const bottomPct = 100 - topPct;

      this.root.style.setProperty('--heat-slider-p', String(topPct));

      const distanceFromCenter = Math.abs(topPct - 50) / 50;
      const dynamicWidth = 25 + (distanceFromCenter * 25);
      this.root.style.setProperty('--heat-slider-w', String(dynamicWidth));

      const rangeProgress = (pct) => pct / 50;
      let bottomOpacity;
      let topOpacity;
      if (topPct <= 50) {
        const progress = rangeProgress(50 - topPct);
        bottomOpacity = 0.5 + (progress * 0.5);
        topOpacity = 0.5 - (progress * 0.4);
      } else {
        const progress = rangeProgress(topPct - 50);
        bottomOpacity = 0.5 - (progress * 0.4);
        topOpacity = 0.5 + (progress * 0.5);
      }
      this.iconBottom.style.opacity = bottomOpacity.toFixed(2);
      this.iconTop.style.opacity = topOpacity.toFixed(2);

      this.heatbar.setAttribute('aria-valuenow', String(topPct));

      if (wasDifferent && typeof this.options.onChange === 'function') {
        this.options.onChange({ topPct, bottomPct, isOn: this._isOn });
      }

      return { topPct, bottomPct };
    }

    getPosition() {
      return this._currentTop;
    }

    getDistribution() {
      return { topPct: this._currentTop, bottomPct: 100 - this._currentTop };
    }

    toggle(forceState) {
      const shouldBeOn = typeof forceState === 'boolean' ? forceState : !this._isOn;
      if (shouldBeOn === this._isOn) return this._isOn;
      this._isOn = shouldBeOn;
      this.root.classList.toggle('heat-slider--off', !this._isOn);
      if (typeof this.options.onToggle === 'function') {
        this.options.onToggle({ isOn: this._isOn, position: this._currentTop });
      }
      return this._isOn;
    }

    isOn() {
      return this._isOn;
    }

    setStepMode(mode) {
      this.options.stepMode = mode || 'preset';
    }

    showLabel(show) {
      this.options.showLabel = !!show;
    }

    showTitle(show) {
      this.options.showTitle = !!show;
      if (this.titleEl) {
        this.root.classList.toggle('heat-slider--title-enabled', this.options.showTitle);
      }
    }

    setLabelFormatter(formatter) {
      if (typeof formatter !== 'function') {
        return;
      }
      this.options.labelFormatter = formatter;
    }

    setTitleText(text) {
      if (typeof text !== 'string') {
        return;
      }
      this.options.titleText = text;
      if (this.titleEl) {
        this.titleEl.textContent = text;
      }
    }

    setIntensity(intensity) {
      const clamped = clampRange(intensity, 0, 1);
      this.root.style.setProperty('--heat-slider-intensity', String(clamped));
    }

    setAnimationDuration(ms) {
      const duration = clampRange(ms, 0, 10000);
      this.root.style.setProperty('--heat-slider-anim-ms', `${duration}ms`);
    }

    setTheme(theme = {}) {
      if (theme.hotColor) {
        const rgb = parseColorToRgb(theme.hotColor);
        if (rgb) {
          this.root.style.setProperty('--heat-slider-hot-r', String(rgb.r));
          this.root.style.setProperty('--heat-slider-hot-g', String(rgb.g));
          this.root.style.setProperty('--heat-slider-hot-b', String(rgb.b));
        }
      }
      if (theme.coolColor) {
        this.root.style.setProperty('--heat-slider-cool', theme.coolColor);
      }
      if (typeof theme.intensity === 'number') {
        this.setIntensity(theme.intensity);
      }
      if (typeof theme.animationMs === 'number') {
        this.setAnimationDuration(theme.animationMs);
      }
    }

    destroy() {
      if (this.options.enablePointer) {
        this.heatbar.removeEventListener('pointerdown', this._onPointerDown);
        window.removeEventListener('pointermove', this._onPointerMove);
        window.removeEventListener('pointerup', this._onPointerUp);
        window.removeEventListener('pointercancel', this._onPointerUp);
      }
      this.heatbar.removeEventListener('keydown', this._onBarKeyDown);
      if (this.options.enableShortcuts) {
        document.removeEventListener('keydown', this._onShortcutKeyDown);
      }
      HeatSlider.instances.delete(this);
    }

    static mountAll(selector = '[data-heat-slider]') {
      const elements = Array.from(document.querySelectorAll(selector));
      return elements.map((element) => new HeatSlider(element));
    }
  }

  HeatSlider.instances = new Set();

  global.HeatSlider = HeatSlider;

  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = HeatSlider;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
