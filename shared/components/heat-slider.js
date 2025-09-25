/**
 * Heat Slider Component
 * Provides oven heat distribution visualization with interactive controls.
 *
 * Usage:
 * 1. Include shared/tokens.css (optional but recommended) and this stylesheet.
 * 2. Import the module: `import { createHeatSlider } from '../../shared/components/heat-slider.js';`
 * 3. Call `createHeatSlider(container, options)` with an element or element id.
 */

const clampPercentage = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

const resolveContainer = (containerOrId) => {
  if (typeof containerOrId === 'string') {
    return document.getElementById(containerOrId);
  }
  return containerOrId;
};

const defaultKeyboardMap = { left: 'o', right: 'p', reset: 'r', toggle: 'q' };

function buildMarkup({ showLabel }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'heat-slider';
  wrapper.innerHTML = `
    <div class="heat-slider-row" aria-label="Heat distribution" role="group">
      <div class="heat-slider-icon heat-slider-icon-bottom" aria-label="Bottom element" role="img">
        <svg width="25" height="24" viewBox="0 0 25 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="transform: rotate(180deg);">
          <path d="M21.6667 13.25C22.219 13.25 22.6667 13.6977 22.6667 14.25V18C22.6667 20.2091 20.8759 22 18.6667 22H6.66675C4.45761 22 2.66675 20.2091 2.66675 18V14.25C2.66675 13.6977 3.11446 13.25 3.66675 13.25C4.21903 13.25 4.66675 13.6977 4.66675 14.25V18C4.66675 19.1046 5.56218 20 6.66675 20H18.6667C19.7713 20 20.6667 19.1046 20.6667 18V14.25C20.6667 13.6977 21.1145 13.25 21.6667 13.25ZM18.6667 2C20.8759 2 22.6667 3.79086 22.6667 6V9.75C22.6667 10.3023 22.219 10.75 21.6667 10.75C21.1145 10.75 20.6667 10.3023 20.6667 9.75V6C20.6667 4.89543 19.7713 4 18.6667 4H6.66675C5.56218 4 4.66675 4.89543 4.66675 6V9.75C4.66675 10.3023 4.21903 10.75 3.66675 10.75C3.11446 10.75 2.66675 10.3023 2.66675 9.75V6C2.66675 3.79086 4.45761 2 6.66675 2H18.6667ZM16.7244 6C17.1213 6.00004 17.3933 6.207 17.53 6.34668L17.533 6.34961L19.3845 8.25684C19.7692 8.65308 19.7593 9.2862 19.363 9.6709C18.9668 10.0555 18.3337 10.0466 17.949 9.65039L16.7244 8.38867L15.4988 9.65039L15.4968 9.65332C15.3602 9.79299 15.0881 9.99993 14.6912 10C14.2943 9.99999 14.0222 9.79301 13.8855 9.65332L13.8826 9.65039L12.6501 8.37988L11.5291 9.50391C11.4847 9.57969 11.4308 9.65153 11.365 9.71582C10.9698 10.1013 10.3367 10.0932 9.95093 9.69824L8.66675 8.38281L7.38257 9.69824C6.99685 10.0933 6.36368 10.1013 5.96851 9.71582C5.57348 9.3301 5.56545 8.69693 5.95093 8.30176L7.85815 6.34863L7.86011 6.3457L7.98901 6.23242C8.14242 6.11535 8.3699 6 8.66675 6C9.06261 6.00001 9.33513 6.2052 9.47339 6.3457L9.47534 6.34863L10.6511 7.55273L11.8582 6.34082L11.8591 6.3418C11.9977 6.20225 12.2667 6.00001 12.658 6C13.0549 6.0001 13.327 6.20702 13.4636 6.34668L13.4656 6.34961L14.6912 7.61035L15.9158 6.34961L15.9187 6.34668L16.0466 6.23438C16.1993 6.11711 16.4265 6.00001 16.7244 6Z" fill="white"/>
        </svg>
      </div>

      <div class="heat-slider-heatbar" aria-hidden="true">
        <div class="overlay"></div>
      </div>

      <div class="heat-slider-icon heat-slider-icon-top" aria-label="Top element" role="img">
        <svg width="25" height="24" viewBox="0 0 25 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21.6667 13.25C22.219 13.25 22.6667 13.6977 22.6667 14.25V18C22.6667 20.2091 20.8759 22 18.6667 22H6.66675C4.45761 22 2.66675 20.2091 2.66675 18V14.25C2.66675 13.6977 3.11446 13.25 3.66675 13.25C4.21903 13.25 4.66675 13.6977 4.66675 14.25V18C4.66675 19.1046 5.56218 20 6.66675 20H18.6667C19.7713 20 20.6667 19.1046 20.6667 18V14.25C20.6667 13.6977 21.1145 13.25 21.6667 13.25ZM18.6667 2C20.8759 2 22.6667 3.79086 22.6667 6V9.75C22.6667 10.3023 22.219 10.75 21.6667 10.75C21.1145 10.75 20.6667 10.3023 20.6667 9.75V6C20.6667 4.89543 19.7713 4 18.6667 4H6.66675C5.56218 4 4.66675 4.89543 4.66675 6V9.75C4.66675 10.3023 4.21903 10.75 3.66675 10.75C3.11446 10.75 2.66675 10.3023 2.66675 9.75V6C2.66675 3.79086 4.45761 2 6.66675 2H18.6667ZM16.7244 6C17.1213 6.00004 17.3933 6.207 17.53 6.34668L17.533 6.34961L19.3845 8.25684C19.7692 8.65308 19.7593 9.2862 19.363 9.6709C18.9668 10.0555 18.3337 10.0466 17.949 9.65039L16.7244 8.38867L15.4988 9.65039L15.4968 9.65332C15.3602 9.79299 15.0881 9.99993 14.6912 10C14.2943 9.99999 14.0222 9.79301 13.8855 9.65332L13.8826 9.65039L12.6501 8.37988L11.5291 9.50391C11.4847 9.57969 11.4308 9.65153 11.365 9.71582C10.9698 10.1013 10.3367 10.0932 9.95093 9.69824L8.66675 8.38281L7.38257 9.69824C6.99685 10.0933 6.36368 10.1013 5.96851 9.71582C5.57348 9.3301 5.56545 8.69693 5.95093 8.30176L7.85815 6.34863L7.86011 6.3457L7.98901 6.23242C8.14242 6.11535 8.3699 6 8.66675 6C9.06261 6.00001 9.33513 6.2052 9.47339 6.3457L9.47534 6.34863L10.6511 7.55273L11.8582 6.34082L11.8591 6.3418C11.9977 6.20225 12.2667 6.00001 12.658 6C13.0549 6.0001 13.327 6.20702 13.4636 6.34668L13.4656 6.34961L14.6912 7.61035L15.9158 6.34961L15.9187 6.34668L16.0466 6.23438C16.1993 6.11711 16.4265 6.00001 16.7244 6Z" fill="white"/>
        </svg>
      </div>
    </div>
    <div class="heat-slider-distribution-label${showLabel ? '' : ' hidden'}" aria-live="polite"></div>
  `;
  return wrapper;
}

export function createHeatSlider(containerOrId, options = {}) {
  const container = resolveContainer(containerOrId);
  if (!container) {
    console.error('Heat slider container not found:', containerOrId);
    return null;
  }

  const config = {
    initialPosition: 50,
    showLabel: false,
    enableKeyboard: true,
    keyboardTarget: null,
    keyboardKeys: defaultKeyboardMap,
    stepMode: 'preset', // 'preset', '1', '5', '20'
    initiallyOn: true,
    ...options
  };

  const resolveKeyboardTarget = () => {
    if (!config.enableKeyboard) return null;

    if (!config.keyboardTarget) {
      return typeof document !== 'undefined' ? document : null;
    }

    if (config.keyboardTarget === 'container') {
      return container;
    }

    if (config.keyboardTarget === 'document' && typeof document !== 'undefined') {
      return document;
    }

    if (config.keyboardTarget === 'window' && typeof window !== 'undefined') {
      return window;
    }

    return config.keyboardTarget;
  };

  container.innerHTML = '';
  const sliderRoot = buildMarkup({ showLabel: config.showLabel });
  container.appendChild(sliderRoot);

  const iconTop = sliderRoot.querySelector('.heat-slider-icon-top');
  const iconBottom = sliderRoot.querySelector('.heat-slider-icon-bottom');
  const distributionLabel = sliderRoot.querySelector('.heat-slider-distribution-label');

  let isOn = Boolean(config.initiallyOn);
  let currentPosition = config.initialPosition;

  sliderRoot.classList.toggle('is-off', !isOn);

  const setVariables = (topPct) => {
    const clamped = clampPercentage(topPct);
    const bottomPct = 100 - clamped;
    currentPosition = clamped;

    sliderRoot.style.setProperty('--heat-slider-peak', String(clamped));

    const distanceFromCenter = Math.abs(clamped - 50) / 50;
    const dynamicWidth = 25 + (distanceFromCenter * 25);
    sliderRoot.style.setProperty('--heat-slider-width', String(dynamicWidth));

    let bottomOpacity;
    let topOpacity;

    if (clamped <= 50) {
      const progress = (50 - clamped) / 50;
      bottomOpacity = 0.5 + (progress * 0.5);
      topOpacity = 0.5 - (progress * 0.4);
    } else {
      const progress = (clamped - 50) / 50;
      bottomOpacity = 0.5 - (progress * 0.4);
      topOpacity = 0.5 + (progress * 0.5);
    }

    iconBottom.style.opacity = bottomOpacity.toFixed(2);
    iconTop.style.opacity = topOpacity.toFixed(2);

    if (distributionLabel) {
      distributionLabel.textContent = `${bottomPct}% Bottom / ${clamped}% Top`;
    }

    if (typeof config.onChange === 'function') {
      config.onChange({ topPct: clamped, bottomPct, isOn });
    }
  };

  const toggleOnOff = () => {
    isOn = !isOn;
    sliderRoot.classList.toggle('is-off', !isOn);
    if (typeof config.onToggle === 'function') {
      config.onToggle({ isOn, position: currentPosition });
    }
  };

  const getCurrentPosition = () => currentPosition;

  const keyHandler = (event) => {
    if (!config.enableKeyboard) return;

    const key = event.key.toLowerCase();
    if (key === config.keyboardKeys.toggle) {
      event.preventDefault();
      toggleOnOff();
      return;
    }

    if (key === config.keyboardKeys.reset) {
      event.preventDefault();
      setVariables(50);
      return;
    }

    if (!isOn) return;

    if (key === config.keyboardKeys.left || key === config.keyboardKeys.right) {
      event.preventDefault();
      const deltaSign = key === config.keyboardKeys.left ? -1 : 1;

      if (config.stepMode === 'preset') {
        const presets = [0, 25, 50, 75, 100];
        const currentIndex = presets.findIndex((preset) => Math.abs(preset - getCurrentPosition()) <= 2);

        if (currentIndex === -1) {
          const lowerPresets = presets.filter((preset) => preset < currentPosition);
          const higherPresets = presets.filter((preset) => preset > currentPosition);
          const nextValue = deltaSign === -1 ? lowerPresets.pop() : higherPresets.shift();
          if (typeof nextValue === 'number') {
            setVariables(nextValue);
          }
          return;
        }

        const nextIndex = currentIndex + deltaSign;
        if (nextIndex >= 0 && nextIndex < presets.length) {
          setVariables(presets[nextIndex]);
        }
      } else {
        const stepSize = parseInt(config.stepMode, 10) || 1;
        setVariables(getCurrentPosition() + (deltaSign * stepSize));
      }
    }
  };

  const keyboardTarget = resolveKeyboardTarget();
  if (config.enableKeyboard && keyboardTarget && typeof keyboardTarget.addEventListener === 'function') {
    keyboardTarget.addEventListener('keydown', keyHandler);

    if (keyboardTarget instanceof HTMLElement || keyboardTarget instanceof SVGElement) {
      if (!keyboardTarget.hasAttribute('tabindex')) {
        keyboardTarget.setAttribute('tabindex', '0');
      }
      if (!keyboardTarget.getAttribute('role')) {
        keyboardTarget.setAttribute('role', 'group');
      }
      if (!keyboardTarget.getAttribute('aria-label')) {
        keyboardTarget.setAttribute('aria-label', 'Heat distribution controls');
      }
    }
  } else if (config.enableKeyboard) {
    console.warn('Heat slider keyboard target does not support events:', keyboardTarget);
  }

  setVariables(currentPosition);

  return {
    root: sliderRoot,
    setPosition: setVariables,
    getPosition: getCurrentPosition,
    toggle: toggleOnOff,
    isOn: () => isOn,
    cleanup: () => {
      if (config.enableKeyboard && keyboardTarget && typeof keyboardTarget.removeEventListener === 'function') {
        keyboardTarget.removeEventListener('keydown', keyHandler);
      }
    },
    setStepMode: (mode) => {
      config.stepMode = mode;
    },
    showLabel: (show) => {
      if (distributionLabel) {
        distributionLabel.classList.toggle('hidden', !show);
      }
    }
  };
}

export const HeatSlider = { create: createHeatSlider };
export default HeatSlider;
