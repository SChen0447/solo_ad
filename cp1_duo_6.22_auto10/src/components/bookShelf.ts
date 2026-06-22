import type { Book, BookStatus } from '../utils/bookStorage';
import {
  getAllBooks,
  addBook,
  getBookCurrentPage,
  getBookTotalPagesRead
} from '../utils/bookStorage';

type FilterType = 'all' | BookStatus;

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'reading', label: '在读' },
  { key: 'finished', label: '已读完' },
  { key: 'shelved', label: '搁置' }
];

export function renderBookShelf(root: HTMLElement, onNavigate: (route: string) => void): void {
  let currentFilter: FilterType = 'all';

  function getFilteredBooks(): Book[] {
    const all = getAllBooks();
    if (currentFilter === 'all') return all;
    return all.filter(b => b.status === currentFilter);
  }

  function getStatusBadgeHTML(status: BookStatus): string {
    const map: Record<BookStatus, { cls: string; text: string }> = {
      reading: { cls: 'status-reading', text: '在读' },
      finished: { cls: 'status-finished', text: '已读完' },
      shelved: { cls: 'status-shelved', text: '搁置' }
    };
    const m = map[status];
    return `<span class="status-badge ${m.cls}">${m.text}</span>`;
  }

  function renderBookCard(book: Book): string {
    const currentPage = getBookCurrentPage(book);
    const totalRead = getBookTotalPagesRead(book);
    const progress = book.totalPages > 0 ? Math.min(100, Math.round((currentPage / book.totalPages) * 100)) : 0;
    const coverContent = book.coverUrl
      ? `<img src="${book.coverUrl}" alt="${book.title}" onerror="this.style.display='none';this.parentElement.innerHTML='${book.title.charAt(0)}';">`
      : book.title.charAt(0);

    return `
      <div class="book-card" data-book-id="${book.id}">
        <div class="book-cover">${coverContent}</div>
        <div class="book-title">${book.title}</div>
        <div class="book-author">${book.author}</div>
        <div class="book-progress">
          <div class="book-progress-bar" style="width: ${progress}%"></div>
        </div>
        <div class="book-meta">
          <span>${currentPage}/${book.totalPages}页</span>
          ${getStatusBadgeHTML(book.status)}
        </div>
        <div style="font-size:0.75rem;color:#795548;">累计: ${totalRead}页</div>
      </div>
    `;
  }

  function render(): void {
    const books = getFilteredBooks();

    const html = `
      <div class="page-header">
        <h1>📚 我的书架</h1>
      </div>
      <div class="filter-tabs">
        ${FILTERS.map(f => `
          <div class="filter-tab ${currentFilter === f.key ? 'active' : ''}" data-filter="${f.key}">
            ${f.label}
          </div>
        `).join('')}
      </div>
      <div class="book-grid">
        ${books.length === 0
          ? `<div class="empty-state" style="grid-column:1/-1;">
              <div class="empty-state-icon">📖</div>
              <p>还没有添加书籍</p>
              <p style="font-size:0.85rem;margin-top:0.5rem;">点击右下角按钮开始添加吧</p>
            </div>`
          : books.map(renderBookCard).join('')
        }
      </div>
      <button class="btn btn-fab" id="add-book-btn" aria-label="添加书籍">+</button>
      <div id="modal-container"></div>
    `;

    root.innerHTML = html;
    bindEvents();
  }

  function bindEvents(): void {
    root.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        currentFilter = tab.getAttribute('data-filter') as FilterType;
        render();
      });
    });

    root.querySelectorAll('.book-card').forEach(card => {
      card.addEventListener('click', () => {
        const bookId = card.getAttribute('data-book-id');
        if (bookId) onNavigate(`/book/${bookId}`);
      });
    });

    const addBtn = root.querySelector('#add-book-btn');
    if (addBtn) {
      addBtn.addEventListener('click', showAddBookModal);
    }
  }

  function showAddBookModal(): void {
    const container = root.querySelector('#modal-container') as HTMLElement;
    if (!container) return;

    container.innerHTML = `
      <div class="modal-overlay" id="modal-overlay">
        <div class="modal" id="add-book-modal">
          <h2>添加新书籍</h2>
          <div class="form-group">
            <label for="book-title">书名 *</label>
            <input type="text" id="book-title" placeholder="请输入书名" />
          </div>
          <div class="form-group">
            <label for="book-author">作者 *</label>
            <input type="text" id="book-author" placeholder="请输入作者" />
          </div>
          <div class="form-group">
            <label for="book-cover">封面图片URL（可选）</label>
            <input type="url" id="book-cover" placeholder="https://..." />
          </div>
          <div class="form-group">
            <label for="book-pages">总页数 *</label>
            <input type="number" id="book-pages" min="1" placeholder="100" />
          </div>
          <div class="form-group">
            <label for="book-status">状态</label>
            <select id="book-status">
              <option value="reading">在读</option>
              <option value="finished">已读完</option>
              <option value="shelved">搁置</option>
            </select>
          </div>
          <div class="form-actions">
            <button class="btn btn-secondary" id="modal-cancel">取消</button>
            <button class="btn btn-primary" id="modal-submit">添加</button>
          </div>
        </div>
      </div>
    `;

    const overlay = container.querySelector('#modal-overlay') as HTMLElement;
    const cancelBtn = container.querySelector('#modal-cancel') as HTMLButtonElement;
    const submitBtn = container.querySelector('#modal-submit') as HTMLButtonElement;

    function closeModal(): void {
      container.innerHTML = '';
    }

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
    cancelBtn.addEventListener('click', closeModal);

    submitBtn.addEventListener('click', () => {
      const title = (container.querySelector('#book-title') as HTMLInputElement).value.trim();
      const author = (container.querySelector('#book-author') as HTMLInputElement).value.trim();
      const coverUrl = (container.querySelector('#book-cover') as HTMLInputElement).value.trim();
      const pagesStr = (container.querySelector('#book-pages') as HTMLInputElement).value.trim();
      const status = (container.querySelector('#book-status') as HTMLSelectElement).value as BookStatus;

      if (!title || !author || !pagesStr) {
        alert('请填写必填项（书名、作者、总页数）');
        return;
      }

      const totalPages = parseInt(pagesStr, 10);
      if (isNaN(totalPages) || totalPages < 1) {
        alert('总页数必须是大于0的数字');
        return;
      }

      const newBook = addBook({ title, author, coverUrl, totalPages, status });
      closeModal();
      render();

      setTimeout(() => {
        onNavigate(`/book/${newBook.id}`);
      }, 200);
    });
  }

  render();
}
