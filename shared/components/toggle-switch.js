const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
  <style>
    :host {
      display: inline-flex;
      width: var(--toggle-width, 45px);
      height: var(--toggle-height, 28px);
      cursor: pointer;
    }

    :host([disabled]) {
      cursor: not-allowed;
    }

    button {
      all: unset;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      border-radius: 999px;
      background: var(--toggle-off-background, #333);
      position: relative;
      transition: background 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      padding: 0;
      cursor: inherit;
    }

    .thumb {
      position: absolute;
      top: 2px;
      left: 2px;
      width: calc(var(--toggle-height, 28px) - 6px);
      height: calc(var(--toggle-height, 28px) - 6px);
      border-radius: 50%;
      background: var(--toggle-thumb-background, #fff);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
      transition: transform 0.3s ease;
    }

    :host([checked]) button {
      background: var(--toggle-on-background, #2BB671);
    }

    :host([checked]) .thumb {
      transform: translateX(calc(var(--toggle-width, 45px) - var(--toggle-height, 28px)));
    }

    :host([disabled]) button {
      background: var(--toggle-disabled-background, #979797);
    }

    :host([disabled]) .thumb {
      background: var(--toggle-disabled-thumb-background, #d5d5d5);
      box-shadow: none;
    }

    button:focus-visible {
      outline: var(--toggle-focus-outline, 2px solid rgba(255, 255, 255, 0.75));
      outline-offset: var(--toggle-focus-outline-offset, 2px);
    }
  </style>
  <button type="button" role="switch" aria-checked="false">
    <span class="thumb" part="thumb"></span>
  </button>
`;

class ToggleSwitchElement extends HTMLElement {
  static get observedAttributes() {
    return ['checked', 'disabled'];
  }

  constructor() {
    super();
    this._shadowRoot = this.attachShadow({ mode: 'open' });
    this._shadowRoot.appendChild(TEMPLATE.content.cloneNode(true));
    this._button = this._shadowRoot.querySelector('button');

    this._onClick = this._onClick.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
  }

  connectedCallback() {
    this._upgradeProperty('checked');
    this._upgradeProperty('disabled');

    this._button.addEventListener('click', this._onClick);
    this._button.addEventListener('keydown', this._onKeyDown);

    this._syncState();
  }

  disconnectedCallback() {
    this._button.removeEventListener('click', this._onClick);
    this._button.removeEventListener('keydown', this._onKeyDown);
  }

  attributeChangedCallback() {
    this._syncState();
  }

  get checked() {
    return this.hasAttribute('checked');
  }

  set checked(value) {
    const isChecked = Boolean(value);
    if (isChecked) {
      this.setAttribute('checked', '');
    } else {
      this.removeAttribute('checked');
    }
  }

  get disabled() {
    return this.hasAttribute('disabled');
  }

  set disabled(value) {
    if (Boolean(value)) {
      this.setAttribute('disabled', '');
    } else {
      this.removeAttribute('disabled');
    }
  }

  toggle(force) {
    if (this.disabled) return;

    const newState = typeof force === 'boolean' ? force : !this.checked;
    if (newState !== this.checked) {
      this.checked = newState;
      this.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  _onClick(event) {
    event.preventDefault();
    this.toggle();
  }

  _onKeyDown(event) {
    if (event.key === ' ' || event.key === 'Spacebar' || event.key === 'Enter') {
      event.preventDefault();
      this.toggle();
    }
  }

  _syncState() {
    const isChecked = this.checked;
    const isDisabled = this.disabled;

    this._button.setAttribute('aria-checked', isChecked ? 'true' : 'false');
    this._button.toggleAttribute('disabled', isDisabled);
    this._button.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');

    if (isDisabled) {
      this._button.tabIndex = -1;
    } else {
      this._button.removeAttribute('tabindex');
    }
  }

  _upgradeProperty(prop) {
    if (Object.prototype.hasOwnProperty.call(this, prop)) {
      const value = this[prop];
      delete this[prop];
      this[prop] = value;
      return true;
    }
    return false;
  }
}

if (!customElements.get('toggle-switch')) {
  customElements.define('toggle-switch', ToggleSwitchElement);
}

export { ToggleSwitchElement as ToggleSwitch };
