import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('nav-bar')
export class NavBar extends LitElement {
  @property({ type: String, attribute: 'active-section' })
  activeSection: 'about' | 'works' | 'contact' = 'works';

  @property({ type: String, attribute: 'theme-mode' })
  themeMode: 'light' | 'dark' = 'light';

  @state()
  private scrolled = false;

  @state()
  private mobileMenuOpen = false;

  private rafId: number | null = null;

  private handleScroll = () => {
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.scrolled = window.scrollY > 20;
      this.rafId = null;
    });
  };

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('scroll', this.handleScroll, { passive: true });
    this.handleScroll();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('scroll', this.handleScroll);
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
  }

  private handleNavigate(section: 'about' | 'works' | 'contact') {
    this.activeSection = section;
    this.mobileMenuOpen = false;
    document.dispatchEvent(new CustomEvent('navigate', { detail: { section } }));
  }

  private handleToggleTheme() {
    document.dispatchEvent(new CustomEvent('toggle-theme'));
  }

  private handleOpenPanel() {
    document.dispatchEvent(new CustomEvent('open-panel'));
  }

  private toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  static styles = css`
    :host {
      display: block;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 100;
      height: var(--nav-height);
      transition: height var(--transition-standard), background-color var(--transition-standard),
        backdrop-filter var(--transition-standard), box-shadow var(--transition-standard),
        border-color var(--transition-standard);
      background-color: transparent;
      backdrop-filter: blur(0);
      -webkit-backdrop-filter: blur(0);
      border-bottom: 1px solid transparent;
    }

    :host([scrolled]) {
      height: var(--nav-height-collapsed);
    }

    :host([scrolled-light]) {
      background-color: rgba(250, 250, 247, 0.85);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-bottom-color: var(--border);
    }

    :host([scrolled-dark]) {
      background-color: rgba(15, 15, 20, 0.85);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-bottom-color: var(--border);
    }

    .nav-inner {
      max-width: 1280px;
      height: 100%;
      margin: 0 auto;
      padding: 0 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .logo {
      font-family: var(--font-heading);
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--text-primary);
      cursor: pointer;
      user-select: none;
      transition: transform var(--transition-fast);
    }

    .logo:hover {
      transform: scale(1.02);
    }

    .logo span {
      color: var(--primary);
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 8px;
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
    }

    .nav-link {
      position: relative;
      padding: 10px 20px;
      font-size: 15px;
      font-weight: 500;
      color: var(--text-secondary);
      background: none;
      border: none;
      cursor: pointer;
      border-radius: 999px;
      transition: color var(--transition-fast), background-color var(--transition-fast);
      font-family: inherit;
    }

    .nav-link:hover {
      color: var(--text-primary);
      background-color: var(--bg-secondary);
    }

    .nav-link.active {
      color: var(--text-primary);
    }

    .nav-link.active::after {
      content: '';
      position: absolute;
      bottom: 4px;
      left: 50%;
      transform: translateX(-50%);
      width: 20px;
      height: 2px;
      background-color: var(--primary);
      border-radius: 2px;
    }

    .nav-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .icon-btn {
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: none;
      cursor: pointer;
      border-radius: 999px;
      color: var(--text-secondary);
      transition: background-color var(--transition-fast), color var(--transition-fast),
        transform var(--transition-fast);
    }

    .icon-btn:hover {
      background-color: var(--bg-secondary);
      color: var(--text-primary);
      transform: scale(1.05);
    }

    .icon-btn svg {
      width: 20px;
      height: 20px;
    }

    .hamburger {
      display: none;
      width: 44px;
      height: 44px;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 5px;
      border: none;
      background: none;
      cursor: pointer;
      border-radius: 999px;
      transition: background-color var(--transition-fast);
    }

    .hamburger:hover {
      background-color: var(--bg-secondary);
    }

    .hamburger span {
      display: block;
      width: 22px;
      height: 2px;
      background-color: var(--text-primary);
      border-radius: 2px;
      transition: transform 400ms var(--ease-spring), opacity 300ms var(--ease-standard);
      transform-origin: center;
    }

    .hamburger.open span:nth-child(1) {
      transform: translateY(7px) rotate(45deg);
    }

    .hamburger.open span:nth-child(2) {
      opacity: 0;
      transform: scaleX(0);
    }

    .hamburger.open span:nth-child(3) {
      transform: translateY(-7px) rotate(-45deg);
    }

    .mobile-menu {
      display: none;
      position: fixed;
      top: var(--nav-height-collapsed);
      left: 0;
      right: 0;
      background-color: var(--surface);
      border-bottom: 1px solid var(--border);
      padding: 16px 20px 24px;
      transform-origin: top center;
      transform: scaleY(0);
      opacity: 0;
      transition: transform 450ms var(--ease-spring), opacity 300ms var(--ease-standard);
      pointer-events: none;
    }

    .mobile-menu.open {
      transform: scaleY(1);
      opacity: 1;
      pointer-events: auto;
    }

    .mobile-nav-link {
      display: block;
      width: 100%;
      padding: 16px 20px;
      text-align: left;
      font-size: 18px;
      font-weight: 500;
      color: var(--text-secondary);
      background: none;
      border: none;
      cursor: pointer;
      border-radius: 12px;
      transition: color var(--transition-fast), background-color var(--transition-fast);
      font-family: inherit;
      opacity: 0;
      transform: translateY(-8px);
    }

    .mobile-menu.open .mobile-nav-link {
      opacity: 1;
      transform: translateY(0);
    }

    .mobile-menu.open .mobile-nav-link:nth-child(1) { transition-delay: 80ms; }
    .mobile-menu.open .mobile-nav-link:nth-child(2) { transition-delay: 140ms; }
    .mobile-menu.open .mobile-nav-link:nth-child(3) { transition-delay: 200ms; }
    .mobile-menu.open .mobile-nav-link:nth-child(4) { transition-delay: 260ms; }

    .mobile-nav-link:hover {
      color: var(--text-primary);
      background-color: var(--bg-secondary);
    }

    .mobile-nav-link.active {
      color: var(--primary);
      background-color: rgba(var(--primary-rgb), 0.08);
    }

    @media (max-width: 768px) {
      .nav-inner {
        padding: 0 20px;
      }

      .nav-links {
        display: none;
      }

      .hamburger {
        display: flex;
      }

      .mobile-menu {
        display: block;
      }

      .logo {
        font-size: 20px;
      }
    }
  `;

  protected updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('scrolled') || changedProperties.has('themeMode')) {
      if (this.scrolled) {
        if (this.themeMode === 'light') {
          this.setAttribute('scrolled-light', '');
          this.removeAttribute('scrolled-dark');
        } else {
          this.setAttribute('scrolled-dark', '');
          this.removeAttribute('scrolled-light');
        }
        this.setAttribute('scrolled', '');
      } else {
        this.removeAttribute('scrolled');
        this.removeAttribute('scrolled-light');
        this.removeAttribute('scrolled-dark');
      }
    }
  }

  render() {
    return html`
      <nav class="nav-inner">
        <div class="logo" @click=${() => this.handleNavigate('works')}>
          Port<span>.</span>folio
        </div>

        <div class="nav-links">
          <button
            class="nav-link ${this.activeSection === 'about' ? 'active' : ''}"
            @click=${() => this.handleNavigate('about')}
          >
            关于我
          </button>
          <button
            class="nav-link ${this.activeSection === 'works' ? 'active' : ''}"
            @click=${() => this.handleNavigate('works')}
          >
            作品
          </button>
          <button
            class="nav-link ${this.activeSection === 'contact' ? 'active' : ''}"
            @click=${() => this.handleNavigate('contact')}
          >
            联系
          </button>
        </div>

        <div class="nav-actions">
          <button class="icon-btn" @click=${this.handleToggleTheme} aria-label="切换主题">
            ${this.themeMode === 'light'
              ? html`
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                  </svg>
                `
              : html`
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="5"></circle>
                    <line x1="12" y1="1" x2="12" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="23"></line>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                    <line x1="1" y1="12" x2="3" y2="12"></line>
                    <line x1="21" y1="12" x2="23" y2="12"></line>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                  </svg>
                `}
          </button>
          <button class="icon-btn" @click=${this.handleOpenPanel} aria-label="自定义主题">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="13.5" cy="6.5" r="2.5"></circle>
              <circle cx="17.5" cy="10.5" r="2.5"></circle>
              <circle cx="8.5" cy="7.5" r="2.5"></circle>
              <circle cx="6.5" cy="12.5" r="2.5"></circle>
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.8 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.8.7-1.5 1.5-1.5H16c3.3 0 6-2.7 6-6 0-5-4.5-8.8-10-8.8z"></path>
            </svg>
          </button>
          <button
            class="hamburger ${this.mobileMenuOpen ? 'open' : ''}"
            @click=${this.toggleMobileMenu}
            aria-label="菜单"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </nav>

      <div class="mobile-menu ${this.mobileMenuOpen ? 'open' : ''}">
        <button
          class="mobile-nav-link ${this.activeSection === 'about' ? 'active' : ''}"
          @click=${() => this.handleNavigate('about')}
        >
          关于我
        </button>
        <button
          class="mobile-nav-link ${this.activeSection === 'works' ? 'active' : ''}"
          @click=${() => this.handleNavigate('works')}
        >
          作品
        </button>
        <button
          class="mobile-nav-link ${this.activeSection === 'contact' ? 'active' : ''}"
          @click=${() => this.handleNavigate('contact')}
        >
          联系
        </button>
      </div>
    `;
  }
}
