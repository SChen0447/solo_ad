import { Poem } from "../core/poemData";

export function createCardElement(poem: Poem): HTMLDivElement {
  const wrapper = document.createElement("div");
  wrapper.className = "card-wrapper entering";

  const inner = document.createElement("div");
  inner.className = "card-inner";

  const front = document.createElement("div");
  front.className = "card-front";

  const excerpt = document.createElement("div");
  excerpt.className = "card-excerpt";
  excerpt.textContent = poem.excerpt;

  const meta = document.createElement("div");
  meta.className = "card-meta";

  const author = document.createElement("span");
  author.className = "card-author";
  author.textContent = `${poem.author} · ${poem.dynasty}`;

  const dynasty = document.createElement("span");
  dynasty.className = "card-dynasty";
  dynasty.textContent = poem.dynasty;

  meta.appendChild(author);
  meta.appendChild(dynasty);
  front.appendChild(excerpt);
  front.appendChild(meta);

  const back = document.createElement("div");
  back.className = "card-back";

  const backTitle = document.createElement("div");
  backTitle.className = "card-back-title";
  backTitle.textContent = poem.title;

  const backLines = document.createElement("div");
  backLines.className = "card-lines";
  backLines.textContent = poem.lines.join("\n");

  back.appendChild(backTitle);
  back.appendChild(backLines);

  inner.appendChild(front);
  inner.appendChild(back);
  wrapper.appendChild(inner);

  return wrapper;
}

export function showCard(card: HTMLDivElement, delay: number): void {
  setTimeout(() => {
    card.classList.remove("entering");
    card.classList.add("visible");
  }, delay);
}

export function hideCard(card: HTMLDivElement): Promise<void> {
  card.classList.add("exiting");
  return new Promise((resolve) => {
    setTimeout(resolve, 400);
  });
}

export function createSkeletonCard(width: number, height: number): HTMLDivElement {
  const skeleton = document.createElement("div");
  skeleton.className = "skeleton-card";
  skeleton.style.width = `${width}px`;
  skeleton.style.height = `${height}px`;
  return skeleton;
}
