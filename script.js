'use strict';

class DogWidget extends HTMLElement {
  static get observedAttributes() {
    return ['mode', 'refresh'];
  }
  constructor(options = {}) {
    super();
    this._mode = 'basic';
    this._refreshSeconds = 10;
    this._timerId = null;

    const shadow = this.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: inline-block;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .dog-widget {
        box-sizing: border-box;
        max-width: 420px;
        background: var(--dog-widget-bg, #ffffff);
        color: var(--dog-widget-color, #222222);
        font-size: var(--dog-widget-font-size, 16px);
        border-radius: var(--dog-widget-border-radius, 12px);
        border: 1px solid rgba(0, 0, 0, 0.08);
        padding: 1rem 1.25rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
        position: relative;
        overflow: hidden;
      }

      /* Сложный селектор + псевдоэлемент */
      .dog-widget .fact::before {
        content: "🐾 ";
        opacity: 0.7;
      }

      .dog-widget .fact::after {
        content: " 🐾";
        opacity: 0.7;
      }

      .title {
        margin: 0 0 0.5rem;
        font-size: 1.1em;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 0.4rem;
      }

      .title span.emoji {
        font-size: 1.3em;
      }

      .fact {
        margin: 0 0 0.75rem;
        line-height: 1.4;
      }

      .footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        font-size: 0.85em;
      }

      .status {
        opacity: 0.7;
        flex: 1;
      }

      .refresh-button {
        flex-shrink: 0;
        border: none;
        border-radius: 999px;
        padding: 0.45rem 0.8rem;
        font-size: 0.9em;
        cursor: pointer;
        background: var(--dog-widget-button-bg, #ff8c42);
        color: var(--dog-widget-button-color, #ffffff);
        box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        transition: transform 0.08s ease, box-shadow 0.08s ease, opacity 0.2s ease;
      }

      .refresh-button:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 10px rgba(0,0,0,0.2);
      }

      .refresh-button:active {
        transform: translateY(0);
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      }

      .refresh-button:disabled {
        cursor: default;
        opacity: 0.6;
        box-shadow: none;
        transform: none;
      }

      /* Пример сложного селектора: кнопка внутри ховера хоста */
      :host(:hover) .dog-widget {
        box-shadow: 0 6px 16px rgba(0,0,0,0.09);
      }
    `;

    const wrapper = document.createElement('div');
    wrapper.className = 'dog-widget';

    const title = document.createElement('h2');
    title.className = 'title';
    title.innerHTML = `<span class="emoji">🐶</span><span>Dog fact</span>`;

    const fact = document.createElement('p');
    fact.className = 'fact';
    fact.textContent = 'Загружаем факт о собачке...';

    const footer = document.createElement('div');
    footer.className = 'footer';

    const status = document.createElement('span');
    status.className = 'status';
    status.textContent = 'Ожидание запроса к API';

    const button = document.createElement('button');
    button.className = 'refresh-button';
    button.type = 'button';
    button.textContent = 'Новый факт';

    footer.append(status, button);
    wrapper.append(title, fact, footer);
    shadow.append(style, wrapper);

    this._els = { wrapper, title, fact, footer, status, button };

    button.addEventListener('click', () => {
      this._fetchFact();
    });

    if (typeof options === 'object' && options !== null) {
      if (options.mode) {
        this.mode = options.mode;
      }
      if (options.refresh != null) {
        this.refresh = options.refresh;
      }
    }
  }


  connectedCallback() {
    if (!this.hasAttribute('mode')) {
      this.mode = this._mode;
    }
    if (!this.hasAttribute('refresh')) {
      this.refresh = this._refreshSeconds;
    }

    this._fetchFact();

    if (this._mode === 'auto') {
      this._startTimer();
      this._updateButtonVisibility();
    }
  }

  disconnectedCallback() {
    this._stopTimer();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    if (name === 'mode') {
      this._mode = newValue === 'auto' ? 'auto' : 'basic';
      this._handleModeChange();
    }

    if (name === 'refresh') {
      const seconds = Number(newValue);
      this._refreshSeconds = Number.isFinite(seconds) && seconds > 0 ? seconds : 10;
      if (this._mode === 'auto') {
        this._restartTimer();
      }
    }
  }


  get mode() {
    return this._mode;
  }

  set mode(value) {
    const normalized = (value === 'auto') ? 'auto' : 'basic';
    this.setAttribute('mode', normalized);
  }


  get refresh() {
    return this._refreshSeconds;
  }

  set refresh(value) {
    const seconds = Number(value);
    const finalValue = Number.isFinite(seconds) && seconds > 0 ? seconds : 10;
    this.setAttribute('refresh', String(finalValue));
  }


  _handleModeChange() {
    if (this._mode === 'auto') {
      this._startTimer();
    } else {
      this._stopTimer();
    }
    this._updateButtonVisibility();
  }

  _updateButtonVisibility() {
    if (!this._els?.button) return;
    if (this._mode === 'auto') {
      this._els.button.style.display = 'none';
    } else {
      this._els.button.style.display = '';
    }
  }

  _startTimer() {
    this._stopTimer();
    const intervalMs = this._refreshSeconds * 1000;
    this._timerId = setInterval(() => this._fetchFact(), intervalMs);
  }

  _stopTimer() {
    if (this._timerId != null) {
      clearInterval(this._timerId);
      this._timerId = null;
    }
  }

  _restartTimer() {
    if (this._mode === 'auto') {
      this._startTimer();
    }
  }

  async _fetchFact() {
    if (!this._els) return;

    const { fact, status, button } = this._els;

    status.textContent = 'Загружаем факт о собачке...';
    button.disabled = true;

    try {
      const response = await fetch('https://dogapi.dog/api/v2/facts?limit=1');
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      const body = data?.data?.[0]?.attributes?.body;

      if (!body) {
        throw new Error('Неверный формат ответа API');
      }

      fact.textContent = body;
      status.textContent = this._mode === 'auto'
        ? `Авто-обновление каждые ${this._refreshSeconds} сек`
        : 'Нажми "Новый факт", чтобы обновить';

    } catch (err) {
      console.error(err);
      status.textContent = 'Ошибка загрузки факта';
      fact.textContent = 'Не удалось загрузить факт о собачке. Попробуй ещё раз.';
    } finally {
      button.disabled = (this._mode === 'auto');
    }
  }
}

customElements.define('dog-widget', DogWidget);
