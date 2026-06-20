import { Poem } from "./poemData";
import { createCardElement, showCard, hideCard, createSkeletonCard } from "../ui/card";
import { filterPoems, FilterCriteria } from "../utils/filter";

export class WaterfallEngine {
  private container: HTMLElement;
  private grid: HTMLElement;
  private currentPoems: Poem[];
  private allPoems: Poem[];
  private cardElements: Map<number, HTMLDivElement>;
  private columnCount: number;
  private columnHeights: number[];
  private GAP: number = 16;
  private observer: IntersectionObserver;
  private modalCallback: (poem: Poem) => void;
  private resizeObserver: ResizeObserver;

  constructor(
    container: HTMLElement,
    grid: HTMLElement,
    poems: Poem[],
    onCardClick: (poem: Poem) => void
  ) {
    this.container = container;
    this.grid = grid;
    this.allPoems = poems;
    this.currentPoems = poems;
    this.modalCallback = onCardClick;
    this.cardElements = new Map();
    this.columnHeights = [];
    this.columnCount = this.calcColumnCount(container.clientWidth);

    this.resizeObserver = new ResizeObserver(() => {
      this.columnCount = this.calcColumnCount(this.container.clientWidth);
      this.renderCards();
    });
    this.resizeObserver.observe(this.container);

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLDivElement;
            const id = Number(el.dataset.poemId);
            const card = this.cardElements.get(id);
            if (card) {
              showCard(card, 0);
            }
            this.observer.unobserve(el);
          }
        });
      },
      { root: this.container, threshold: 0.1 }
    );

    this.showSkeletons();

    setTimeout(() => {
      this.renderCards();
    }, 100);
  }

  filter(criteria: FilterCriteria): void {
    this.grid.classList.add("filtering");

    setTimeout(() => {
      this.currentPoems = filterPoems(this.allPoems, criteria);
      requestAnimationFrame(() => {
        this.renderCards();
        this.grid.classList.remove("filtering");
      });
    }, 300);
  }

  private renderCards(): void {
    this.grid.innerHTML = "";
    this.cardElements.clear();
    this.columnHeights = new Array(this.columnCount).fill(0);

    const fragment = document.createDocumentFragment();

    this.currentPoems.forEach((poem, index) => {
      const card = createCardElement(poem);
      const layout = this.calculateLayout(poem);

      card.style.left = `${layout.left}px`;
      card.style.top = `${layout.top}px`;
      card.style.width = `${layout.width}px`;
      card.dataset.poemId = String(index);

      card.addEventListener("click", () => {
        this.modalCallback(poem);
      });

      this.cardElements.set(index, card);
      fragment.appendChild(card);
    });

    this.grid.appendChild(fragment);

    const maxHeight = Math.max(...this.columnHeights, 0);
    this.grid.style.height = `${maxHeight}px`;

    this.currentPoems.forEach((_, index) => {
      const card = this.cardElements.get(index);
      if (card) {
        showCard(card, index * 30);
      }
    });
  }

  private calculateLayout(poem: Poem): { left: number; top: number; width: number } {
    const containerWidth = this.container.clientWidth;
    const cardWidth =
      (containerWidth - (this.columnCount + 1) * this.GAP) / this.columnCount;

    const shortestColIndex = this.columnHeights.indexOf(
      Math.min(...this.columnHeights)
    );

    const left = shortestColIndex * (cardWidth + this.GAP) + this.GAP;
    const top =
      this.columnHeights[shortestColIndex] === 0
        ? this.GAP
        : this.columnHeights[shortestColIndex] + this.GAP;

    const excerptLength = poem.excerpt ? poem.excerpt.length : 0;
    const cardHeight = 200 + excerptLength * 1.5;

    this.columnHeights[shortestColIndex] += cardHeight + this.GAP;

    return { left, top, width: cardWidth };
  }

  private showSkeletons(): void {
    this.columnHeights = new Array(this.columnCount).fill(0);
    const containerWidth = this.container.clientWidth;
    const cardWidth =
      (containerWidth - (this.columnCount + 1) * this.GAP) / this.columnCount;
    const cardHeight = 250;

    const fragment = document.createDocumentFragment();

    for (let i = 0; i < 12; i++) {
      const shortestColIndex = this.columnHeights.indexOf(
        Math.min(...this.columnHeights)
      );

      const left = shortestColIndex * (cardWidth + this.GAP) + this.GAP;
      const top =
        this.columnHeights[shortestColIndex] === 0
          ? this.GAP
          : this.columnHeights[shortestColIndex] + this.GAP;

      this.columnHeights[shortestColIndex] += cardHeight + this.GAP;

      const skeleton = createSkeletonCard(cardWidth, cardHeight);
      skeleton.style.left = `${left}px`;
      skeleton.style.top = `${top}px`;
      fragment.appendChild(skeleton);
    }

    this.grid.appendChild(fragment);

    const maxHeight = Math.max(...this.columnHeights, 0);
    this.grid.style.height = `${maxHeight}px`;
  }

  private calcColumnCount(width: number): number {
    if (width >= 1024) return 3;
    if (width >= 768) return 2;
    return 1;
  }

  destroy(): void {
    this.resizeObserver.disconnect();
    this.observer.disconnect();
  }
}
