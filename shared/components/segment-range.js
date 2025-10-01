const DEFAULT_MIN_SEGMENTS = 2;
const DEFAULT_MAX_SEGMENTS = 30;
const DARKNESS_MAX_SEGMENTS = 10;
const DEFAULT_STYLE_OPTIONS = {
  transitionDuration: '250ms',
  switchSpeed: '250ms',
  heightEasing: 'ease',
  colorEasing: 'ease',
  minimizedHeight: '13px',
  normalHeight: '51px',
  unselectedColor: '#3d3d3d',
  selectedColor: 'var(--accent, #fa4947)',
  minimizedSelectedColor: '#b6b6b6'
};
const TOMATO_SCALE = [
  '--tomato-50',
  '--tomato-100',
  '--tomato-200',
  '--tomato-300',
  '--tomato-400',
  '--tomato-500',
  '--tomato-600',
  '--tomato-700',
  '--tomato-800',
  '--tomato-900'
];

const DARKNESS_COLOR_STARTS = {
  10: 0,
  9: 1,
  8: 1,
  7: 2,
  6: 2,
  5: 2,
  4: 3,
  3: 3,
  2: 4,
  1: 4
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const STYLE_VARIABLES = {
  transitionDuration: '--segment-range-transition-duration',
  switchSpeed: '--segment-range-switch-speed',
  heightEasing: '--segment-range-height-easing',
  colorEasing: '--segment-range-color-easing',
  minimizedHeight: '--segment-range-minimized-height',
  normalHeight: '--segment-range-normal-height',
  unselectedColor: '--segment-range-unselected-bg',
  selectedColor: '--segment-range-selected-color',
  minimizedSelectedColor: '--segment-range-minimized-selected-bg'
};

const buildDarknessPalette = (count) => {
  const startIndex = DARKNESS_COLOR_STARTS[count] ?? Math.max(0, TOMATO_SCALE.length - count);
  const endIndex = clamp(startIndex + count, startIndex, TOMATO_SCALE.length);
  return TOMATO_SCALE.slice(startIndex, endIndex);
};

export class SegmentRange {
  constructor(target, options = {}) {
    const root = typeof target === 'string' ? document.querySelector(target) : target;
    if (!root) {
      throw new Error('SegmentRange: target container was not found.');
    }

    this.root = root;
    this.root.classList.add('segment-range');

    this.variant = options.variant === 'darkness' ? 'darkness' : 'default';

    this.defaultStyleOptions = {
      ...DEFAULT_STYLE_OPTIONS,
      ...(options.styleOptions || {})
    };
    this.styleOptions = { ...this.defaultStyleOptions };
    this.applyStyleOptions(this.styleOptions, { updateState: false });

    const minSegmentsOption = typeof options.minSegments === 'number' ? options.minSegments : DEFAULT_MIN_SEGMENTS;
    const maxSegmentsOption = typeof options.maxSegments === 'number' ? options.maxSegments : DEFAULT_MAX_SEGMENTS;

    if (this.variant === 'darkness') {
      this.minSegments = clamp(Math.round(minSegmentsOption) || DEFAULT_MIN_SEGMENTS, 2, DARKNESS_MAX_SEGMENTS);
      this.maxSegments = clamp(Math.round(maxSegmentsOption) || DARKNESS_MAX_SEGMENTS, this.minSegments, DARKNESS_MAX_SEGMENTS);
    } else {
      this.minSegments = clamp(Math.round(minSegmentsOption) || DEFAULT_MIN_SEGMENTS, DEFAULT_MIN_SEGMENTS, DEFAULT_MAX_SEGMENTS);
      this.maxSegments = clamp(Math.round(maxSegmentsOption) || DEFAULT_MAX_SEGMENTS, this.minSegments, DEFAULT_MAX_SEGMENTS);
    }

    const requestedSegments = typeof options.segments === 'number' ? Math.round(options.segments) : this.minSegments;
    this.segmentCount = clamp(requestedSegments, this.minSegments, this.maxSegments);

    this.optionLabels = Array.isArray(options.optionLabels) ? [...options.optionLabels] : null;
    this.valueFormatter = typeof options.valueFormatter === 'function' ? options.valueFormatter : null;

    const requestedValue = typeof options.value === 'number' ? Math.round(options.value) : 1;
    this.value = clamp(requestedValue, 1, this.segmentCount);

    this.onChange = typeof options.onChange === 'function' ? options.onChange : null;
    this.isExpanded = options.expanded !== false;
    this.isActive = options.active !== false;

    this.buildMarkup();

    if (this.variant !== 'default') {
      this.root.setAttribute('data-variant', this.variant);
    } else {
      this.root.removeAttribute('data-variant');
    }

    this.setTitle(options.title || 'Segment Range');
    this.setSegments(this.segmentCount, { preserveValue: true, suppressEvent: true });
    this.setValue(this.value, { suppressEvent: true, forceUpdate: true });
    this.setExpanded(this.isExpanded);
    this.setActive(this.isActive);

    this.attachEvents();
  }

  buildMarkup() {
    this.root.innerHTML = '';

    this.headerEl = document.createElement('div');
    this.headerEl.className = 'segment-range__header';

    this.titleEl = document.createElement('div');
    this.titleEl.className = 'segment-range__title';

    this.valueEl = document.createElement('div');
    this.valueEl.className = 'segment-range__value';

    this.segmentsContainer = document.createElement('div');
    this.segmentsContainer.className = 'segment-range__segments';

    this.headerEl.appendChild(this.titleEl);
    this.headerEl.appendChild(this.valueEl);
    this.root.appendChild(this.headerEl);
    this.root.appendChild(this.segmentsContainer);
  }

  attachEvents() {
    this.segmentsContainer.addEventListener('click', (event) => {
      const segment = event.target.closest('.segment-range__segment');
      if (!segment) return;
      const index = Number(segment.dataset.index);
      if (Number.isNaN(index)) return;
      this.setValue(index + 1);
    });
  }

  setTitle(title) {
    this.titleEl.textContent = title;
  }

  setOptionLabels(labels) {
    this.optionLabels = Array.isArray(labels) ? [...labels] : null;
    this.updateValueDisplay();
  }

  setValueFormatter(formatter) {
    this.valueFormatter = typeof formatter === 'function' ? formatter : null;
    this.updateValueDisplay();
  }

  setSegments(count, { preserveValue = true, suppressEvent = false } = {}) {
    const normalized = clamp(Math.round(count), this.minSegments, this.maxSegments);
    const previousValue = this.value;
    this.segmentCount = normalized;

    this.renderSegments();

    if (preserveValue) {
      const clampedValue = clamp(this.value, 1, this.segmentCount);
      this.value = clampedValue;
      this.updateSelection();
      this.updateValueDisplay();
    } else {
      this.setValue(1, { suppressEvent: true, forceUpdate: true });
    }

    if (!suppressEvent && previousValue !== this.value && this.onChange) {
      this.onChange(this.value, this);
    }
  }

  renderSegments() {
    this.segmentsContainer.innerHTML = '';
    this.segmentElements = [];

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < this.segmentCount; i += 1) {
      const segment = document.createElement('div');
      segment.className = 'segment-range__segment';
      segment.dataset.index = String(i);
      fragment.appendChild(segment);
      this.segmentElements.push(segment);
    }

    this.segmentsContainer.appendChild(fragment);
    this.applyVariantStyling();
    this.updateSelection();
  }

  applyVariantStyling() {
    if (this.variant !== 'darkness') {
      this.segmentElements.forEach((segment) => {
        segment.style.removeProperty('--segment-range-selected-bg');
      });
      return;
    }

    const palette = buildDarknessPalette(this.segmentCount);
    this.segmentElements.forEach((segment, index) => {
      const colorVar = palette[index] || '--tomato-400';
      segment.style.setProperty('--segment-range-selected-bg', `var(${colorVar})`);
    });
  }

  applyStyleOptions(options, { updateState = true } = {}) {
    if (!options) return;
    Object.entries(options).forEach(([key, value]) => {
      const cssVariable = STYLE_VARIABLES[key];
      if (!cssVariable || value == null) return;
      this.root.style.setProperty(cssVariable, value);
      if (updateState) {
        this.styleOptions[key] = value;
      }
    });
  }

  setStyleOptions(options = {}) {
    if (!options || typeof options !== 'object') return;
    this.applyStyleOptions(options);
  }

  resetStyleOptions() {
    this.styleOptions = { ...this.defaultStyleOptions };
    this.applyStyleOptions(this.styleOptions, { updateState: false });
  }

  getStyleOptions() {
    return { ...this.styleOptions };
  }

  setExpanded(isExpanded) {
    this.isExpanded = Boolean(isExpanded);
    this.root.classList.toggle('segment-range--minimized', !this.isExpanded);
    this.root.setAttribute('aria-expanded', this.isExpanded ? 'true' : 'false');
  }

  setActive(isActive) {
    this.isActive = Boolean(isActive);
    this.root.classList.toggle('segment-range--inactive', !this.isActive);
    this.root.classList.toggle('segment-range--active', this.isActive);
  }

  increment() {
    if (this.value >= this.segmentCount) return;
    this.setValue(this.value + 1);
  }

  decrement() {
    if (this.value <= 1) return;
    this.setValue(this.value - 1);
  }

  setValue(value, { suppressEvent = false, forceUpdate = false } = {}) {
    const clamped = clamp(Math.round(value), 1, this.segmentCount);
    if (!forceUpdate && clamped === this.value) return;

    this.value = clamped;
    this.updateSelection();
    this.updateValueDisplay();

    if (!suppressEvent && this.onChange) {
      this.onChange(this.value, this);
    }
  }

  updateSelection() {
    if (!Array.isArray(this.segmentElements)) return;

    this.segmentElements.forEach((segment, index) => {
      segment.classList.toggle('segment-range__segment--selected', index < this.value);
    });
  }

  updateValueDisplay() {
    this.valueEl.textContent = this.formatValue(this.value);
  }

  formatValue(value) {
    if (this.valueFormatter) {
      return this.valueFormatter(value, this);
    }

    if (this.optionLabels && this.optionLabels[value - 1] != null) {
      return this.optionLabels[value - 1];
    }

    const digitCount = Math.max(2, String(this.segmentCount).length);
    return String(value).padStart(digitCount, '0');
  }

  getValue() {
    return this.value;
  }

  getSegmentCount() {
    return this.segmentCount;
  }

  getTitle() {
    return this.titleEl ? this.titleEl.textContent : '';
  }

  getOptionLabels() {
    return this.optionLabels ? [...this.optionLabels] : null;
  }
}

export default SegmentRange;
