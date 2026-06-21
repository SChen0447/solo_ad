import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

export interface WorkItem {
  id: string;
  title: string;
  summary: string;
  coverImage: string;
}

@customElement('card-grid')
export class CardGrid extends LitElement {
  @state()
  private works: WorkItem[] = [];

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('set-works', this.handleSetWorks as EventListener);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('set-works', this.handleSetWorks as EventListener);
  }

  private handleSetWorks(e: CustomEvent) {
    this.works = e.detail.works || [];
  }

  static styles = css`
    :host {
      display: block;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--card-gap, 24px);
      transition: gap var(--transition-standard);
    }

    .card {
      position: relative;
      border-radius: 16px;
      overflow: hidden;
      background-color: var(--surface);
      border: 1px solid var(--border);
      will-change: transform;
      transform: translateY(0);
      transition: transform 400ms var(--ease-standard), box-shadow 400ms var(--ease-standard),
        border-color var(--transition-standard);
      box-shadow: var(--shadow-sm);
      animation: cardIn 700ms var(--ease-standard) both;
    }

    .card:nth-child(1) { animation-delay: 60ms; }
    .card:nth-child(2) { animation-delay: 120ms; }
    .card:nth-child(3) { animation-delay: 180ms; }
    .card:nth-child(4) { animation-delay: 240ms; }
    .card:nth-child(5) { animation-delay: 300ms; }
    .card:nth-child(6) { animation-delay: 360ms; }

    @keyframes cardIn {
      from {
        opacity: 0;
        transform: translateY(32px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .card:hover {
      transform: translateY(-6px);
      box-shadow: var(--shadow-hover);
      border-color: transparent;
      z-index: 1;
    }

    .card-image-wrapper {
      position: relative;
      width: 100%;
      aspect-ratio: 4 / 3;
      overflow: hidden;
    }

    .card-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 600ms var(--ease-standard);
    }

    .card:hover .card-image {
      transform: scale(1.06);
    }

    .card-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        180deg,
        rgba(var(--primary-rgb), 0) 0%,
        rgba(var(--primary-rgb), 0.6) 60%,
        rgba(var(--primary-rgb), 0.9) 100%
      );
      opacity: 0;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 28px;
      transition: opacity 400ms var(--ease-standard);
    }

    .card:hover .card-overlay {
      opacity: 1;
    }

    .view-btn {
      padding: 12px 28px;
      font-size: 14px;
      font-weight: 600;
      font-family: inherit;
      color: white;
      background-color: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 999px;
      cursor: pointer;
      transform: translateY(16px);
      opacity: 0;
      transition: transform 400ms var(--ease-spring), opacity 400ms var(--ease-standard),
        background-color var(--transition-fast);
    }

    .card:hover .view-btn {
      transform: translateY(0);
      opacity: 1;
    }

    .view-btn:hover {
      background-color: rgba(255, 255, 255, 0.28);
    }

    .card-body {
      padding: 24px;
    }

    .card-title {
      font-family: var(--font-heading);
      font-size: 20px;
      font-weight: 700;
      line-height: 1.3;
      letter-spacing: -0.01em;
      color: var(--text-primary);
      margin-bottom: 10px;
      transition: color var(--transition-fast);
    }

    .card:hover .card-title {
      color: var(--primary);
    }

    .card-summary {
      font-size: 14px;
      line-height: 1.65;
      color: var(--text-secondary);
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    @media (max-width: 1023px) {
      .grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 767px) {
      .grid {
        grid-template-columns: 1fr;
      }

      .card-body {
        padding: 20px;
      }

      .card-title {
        font-size: 18px;
      }
    }
  `;

  render() {
    if (this.works.length === 0) {
      return html`<div class="grid"></div>`;
    }

    return html`
      <div class="grid">
        ${this.works.map(
          (work) => html`
            <article class="card">
              <div class="card-image-wrapper">
                <img
                  class="card-image"
                  src=${work.coverImage}
                  alt=${work.title}
                  loading="lazy"
                />
                <div class="card-overlay">
                  <button class="view-btn">查看详情 →</button>
                </div>
              </div>
              <div class="card-body">
                <h3 class="card-title">${work.title}</h3>
                <p class="card-summary">${work.summary}</p>
              </div>
            </article>
          `
        )}
      </div>
    `;
  }
}
