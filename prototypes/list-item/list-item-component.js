const VALID_STATES = new Set(['default', 'focused', 'disabled', 'reordered']);

class ListItemElement extends HTMLElement {
  static get observedAttributes() {
    return ['state'];
  }

  constructor() {
    super();
    this._initialized = false;
    this._trailingContainer = null;
  }

  connectedCallback() {
    this._upgradeProperty('state');

    if (!this._initialized) {
      this._initializeStructure();
      this._initialized = true;
    }

    this._syncState();
  }

  attributeChangedCallback(name, _oldValue, newValue) {
    if (name === 'state') {
      if (newValue && !VALID_STATES.has(newValue)) {
        this.removeAttribute('state');
        return;
      }
      this._syncState();
    }
  }

  get state() {
    return this.getAttribute('state') || 'default';
  }

  set state(value) {
    if (!value || value === 'default') {
      this.removeAttribute('state');
    } else if (VALID_STATES.has(value)) {
      this.setAttribute('state', value);
    } else {
      console.warn(
        `list-item: attempted to set unsupported state "${value}". ` +
          `Valid states are: ${Array.from(VALID_STATES).join(', ')}.`,
      );
    }
  }

  _initializeStructure() {
    const leadingNodes = [];
    const labelNodes = [];
    const trailingNodes = [];

    const otherTextFragments = [];

    this.childNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        switch (node.getAttribute('slot')) {
          case 'leading':
            leadingNodes.push(node);
            break;
          case 'label':
            labelNodes.push(node);
            break;
          case 'trailing':
            trailingNodes.push(node);
            break;
          default:
            otherTextFragments.push(node);
            break;
        }
      } else if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        otherTextFragments.push(node);
      }
    });

    const contentContainer = document.createElement('div');
    contentContainer.className = 'list-item-content';

    leadingNodes.forEach((node) => {
      node.removeAttribute('slot');
      contentContainer.appendChild(node);
    });

    if (labelNodes.length > 0) {
      labelNodes.forEach((node) => {
        node.removeAttribute('slot');
        contentContainer.appendChild(node);
      });
    } else if (this.hasAttribute('label')) {
      const span = document.createElement('span');
      span.textContent = this.getAttribute('label');
      span.setAttribute('slot-generated', 'label');
      contentContainer.appendChild(span);
    } else if (otherTextFragments.length > 0) {
      const combined = otherTextFragments
        .map((node) => node.textContent || '')
        .join(' ')
        .trim();
      if (combined.length > 0) {
        const span = document.createElement('span');
        span.textContent = combined;
        span.setAttribute('slot-generated', 'label');
        contentContainer.appendChild(span);
      }
    }

    const trailingContainer = document.createElement('div');
    trailingContainer.className = 'trailing-element';

    trailingNodes.forEach((node) => {
      node.removeAttribute('slot');
      trailingContainer.appendChild(node);
    });

    this.textContent = '';

    this.appendChild(contentContainer);

    if (trailingContainer.childNodes.length > 0) {
      let trailingAttached = false;

      if (this.classList.contains('detail-metrics')) {
        const detailContainer =
          contentContainer.querySelector('.detail-label-container');
        if (detailContainer) {
          let headerRow =
            detailContainer.querySelector('.detail-header-row');
          if (!headerRow) {
            const header = detailContainer.querySelector('.detail-header');
            if (header) {
              headerRow = document.createElement('div');
              headerRow.className = 'detail-header-row';
              header.parentNode.insertBefore(headerRow, header);
              headerRow.appendChild(header);
            }
          }

          if (headerRow) {
            headerRow.appendChild(trailingContainer);
            trailingAttached = true;
          }
        }
      }

      if (!trailingAttached) {
        this.appendChild(trailingContainer);
      }

      this._trailingContainer = trailingContainer;
    } else {
      this._trailingContainer = null;
    }
  }

  _syncState() {
    this.classList.remove('focused', 'disabled', 'reordered');

    const state = this.getAttribute('state');

    if (state && state !== 'default') {
      this.classList.add(state);
    }

    if (state === 'disabled') {
      this.setAttribute('aria-disabled', 'true');
    } else {
      this.removeAttribute('aria-disabled');
    }
  }

  _upgradeProperty(prop) {
    if (Object.prototype.hasOwnProperty.call(this, prop)) {
      const value = this[prop];
      delete this[prop];
      this[prop] = value;
    }
  }
}

customElements.define('list-item', ListItemElement);
