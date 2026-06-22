import type { Book, BookStatus, Note } from '../utils/bookStorage';
import {
  getBookById,
  updateBook,
  addReadingRecord,
  deleteReadingRecord,
  addNote,
  updateNote,
  deleteNote,
  getBookCurrentPage,
  getBookTotalPagesRead
} from '../utils/bookStorage';
import { sortRecordsByDate, todayDateString } from '../utils/statsCalculator';

export function renderReadingDetail(
  root: HTMLElement,
  bookId: string,
  onNavigate: (route: string) => void
): void {
  let activeTab: 'reading' | 'notes' = 'reading';
  let editingNoteId: string | null = null;

  function getBook(): Book | undefined {
    return getBookById(bookId);
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

  function formatDateTime(timestamp: number): string {
    const d = new Date(timestamp);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${h}:${min}`;
  }

  function render(): void {
    const book = getBook();
    if (!book) {
      root.innerHTML = `
        <div class="page-header">
          <h1>书籍不存在</h1>
        </div>
        <div style="padding:2rem;text-align:center;">
          <p>该书籍可能已被删除</p>
          <button class="btn btn-primary" style="margin-top:1rem;" id="back-to-shelf">返回书架</button>
        </div>
      `;
      root.querySelector('#back-to-shelf')?.addEventListener('click', () => onNavigate('/shelf'));
      return;
    }

    const currentPage = getBookCurrentPage(book);
    const totalRead = getBookTotalPagesRead(book);
    const progress = book.totalPages > 0 ? Math.min(100, Math.round((currentPage / book.totalPages) * 100)) : 0;
    const sortedRecords = sortRecordsByDate(book.records);
    const sortedNotes = [...book.notes].sort((a, b) => b.createdAt - a.createdAt);

    const initial = book.title.charAt(0) || '📖';
    const safeTitle = book.title.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    const placeholderHTML = `
      <div class="book-cover-placeholder">
        <span class="placeholder-icon">📖</span>
        <span class="placeholder-initial">${initial}</span>
        <span class="placeholder-title">${safeTitle}</span>
      </div>
    `;
    const coverOnError = `
      if (!this.dataset.failed) {
        this.dataset.failed = '1';
        this.style.display = 'none';
        var ph = this.nextElementSibling;
        if (ph) ph.style.display = 'flex';
      }
    `.replace(/\s+/g, ' ').trim();
    const coverContent = book.coverUrl && book.coverUrl.trim()
      ? `<img src="${book.coverUrl}" alt="${safeTitle}" onerror="${coverOnError}" />${placeholderHTML.replace(`class="book-cover-placeholder"`, `class="book-cover-placeholder" style="display:none;"`)}`
      : placeholderHTML;

    const html = `
      <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:0.5rem;">
          <button class="back-btn" id="back-btn" aria-label="返回">← 返回</button>
        </div>
        <select id="status-select" style="padding:0.4rem 0.6rem;border-radius:8px;border:1px solid #BCAAA4;background:#FDF8EC;color:#4E342E;font-size:0.85rem;">
          <option value="reading" ${book.status === 'reading' ? 'selected' : ''}>在读</option>
          <option value="finished" ${book.status === 'finished' ? 'selected' : ''}>已读完</option>
          <option value="shelved" ${book.status === 'shelved' ? 'selected' : ''}>搁置</option>
        </select>
      </div>

      <div class="detail-layout">
        <aside class="detail-sidebar">
          <div class="detail-cover">${coverContent}</div>
          <h2 class="detail-title">${book.title}</h2>
          <p class="detail-author">${book.author}</p>
          <div style="text-align:center;margin-bottom:1rem;">
            ${getStatusBadgeHTML(book.status)}
          </div>
          <div class="detail-stats">
            <div class="stat-item">
              <div class="stat-value">${progress}%</div>
              <div class="stat-label">阅读进度</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${currentPage}</div>
              <div class="stat-label">当前页</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${totalRead}</div>
              <div class="stat-label">累计页</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${book.notes.length}</div>
              <div class="stat-label">笔记数</div>
            </div>
          </div>
          <div class="book-progress" style="height:8px;">
            <div class="book-progress-bar" style="width:${progress}%"></div>
          </div>
          <div style="margin-top:0.4rem;font-size:0.75rem;color:#795548;text-align:center;">
            ${currentPage} / ${book.totalPages} 页
          </div>
          <button class="btn btn-secondary" style="width:100%;margin-top:1rem;color:#EF5350;border-color:#EF5350;background:transparent;" id="delete-book-btn">
            删除此书
          </button>
        </aside>

        <main class="detail-main">
          <div class="tab-switcher">
            <div class="tab-indicator ${activeTab === 'notes' ? 'right' : ''}" id="tab-indicator"></div>
            <button class="tab-btn ${activeTab === 'reading' ? 'active' : ''}" data-tab="reading">
              📖 阅读记录
            </button>
            <button class="tab-btn ${activeTab === 'notes' ? 'active' : ''}" data-tab="notes">
              ✏️ 笔记
            </button>
          </div>

          <div class="tab-content ${activeTab === 'reading' ? 'active' : ''}" id="tab-reading">
            <div class="record-form">
              <h3 style="font-size:1rem;margin-bottom:0.8rem;">添加阅读记录</h3>
              <div class="record-form-row">
                <div class="form-group" style="margin-bottom:0;">
                  <label>日期</label>
                  <input type="date" id="record-date" value="${todayDateString()}" />
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <label>当前已读到</label>
                  <input type="number" id="record-current" placeholder="${currentPage > 0 ? currentPage : '起始页'}" min="0" max="${book.totalPages}" />
                </div>
              </div>
              <div class="record-form-row">
                <div class="form-group" style="margin-bottom:0;">
                  <label>起始页</label>
                  <input type="number" id="record-start" placeholder="${currentPage > 0 ? currentPage : '1'}" min="0" max="${book.totalPages}" />
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <label>终止页</label>
                  <input type="number" id="record-end" placeholder="比如 50" min="0" max="${book.totalPages}" />
                </div>
              </div>
              <div id="pages-preview" style="font-size:0.85rem;color:#795548;margin-bottom:0.6rem;min-height:1.2rem;"></div>
              <button class="btn btn-primary" style="width:100%;" id="submit-record">
                保存记录
              </button>
            </div>

            <div style="margin-bottom:0.8rem;font-size:0.9rem;color:#795548;font-weight:600;">
              历史记录 (${sortedRecords.length})
            </div>
            <div class="record-list" id="record-list">
              ${sortedRecords.length === 0
                ? `<div class="empty-state" style="padding:2rem 1rem;">
                    <div style="font-size:2rem;margin-bottom:0.5rem;">📝</div>
                    <p style="font-size:0.85rem;">还没有阅读记录，开始记录你的阅读吧！</p>
                  </div>`
                : sortedRecords.map(r => `
                    <div class="record-item" data-record-id="${r.id}">
                      <div class="record-info">
                        <span class="record-date">${r.date}</span>
                        <span class="record-pages">第 ${r.startPage} - ${r.endPage} 页</span>
                      </div>
                      <div style="display:flex;align-items:center;gap:0.8rem;">
                        <span class="record-count">+${r.pagesRead}</span>
                        <button class="note-action-btn" data-delete-record="${r.id}" title="删除" style="color:#EF5350;">✕</button>
                      </div>
                    </div>
                  `).join('')
              }
            </div>
          </div>

          <div class="tab-content ${activeTab === 'notes' ? 'active' : ''}" id="tab-notes">
            <div class="note-editor" id="note-editor-container">
              <h3 style="font-size:1rem;margin-bottom:0.8rem;" id="note-editor-title">新建笔记</h3>
              <div class="rte-toolbar">
                <button class="rte-btn" data-rte="bold" title="粗体"><strong>B</strong></button>
                <button class="rte-btn" data-rte="italic" title="斜体"><em>I</em></button>
                <button class="rte-btn" data-rte="underline" title="下划线"><u>U</u></button>
                <div style="width:1px;background:#BCAAA4;margin:0.3rem 0.2rem;"></div>
                <button class="rte-btn" data-rte="insertUnorderedList" title="无序列表">•</button>
                <button class="rte-btn" data-rte="insertOrderedList" title="有序列表">1.</button>
              </div>
              <div class="rte-content" id="note-content" contenteditable="true" data-placeholder="在这里写下你的读书笔记..."></div>
              <div style="display:flex;gap:0.6rem;margin-top:0.8rem;">
                <button class="btn btn-primary" style="flex:1;" id="save-note-btn">
                  ${editingNoteId ? '保存修改' : '保存笔记'}
                </button>
                ${editingNoteId ? `<button class="btn btn-secondary" id="cancel-edit-note">取消</button>` : ''}
              </div>
            </div>

            <div style="margin-bottom:0.8rem;font-size:0.9rem;color:#795548;font-weight:600;">
              我的笔记 (${sortedNotes.length})
            </div>
            <div class="notes-list" id="notes-list">
              ${sortedNotes.length === 0
                ? `<div class="empty-state" style="padding:2rem 1rem;">
                    <div style="font-size:2rem;margin-bottom:0.5rem;">💭</div>
                    <p style="font-size:0.85rem;">还没有笔记，记录一下你的想法吧！</p>
                  </div>`
                : sortedNotes.map((n: Note) => `
                    <div class="note-card" data-note-id="${n.id}">
                      <div class="note-header">
                        <div>
                          <div class="note-date">
                            ${formatDateTime(n.createdAt)}
                            ${n.updatedAt > n.createdAt ? ` · 已编辑` : ''}
                          </div>
                        </div>
                        <div class="note-actions">
                          <button class="note-action-btn" data-edit-note="${n.id}">编辑</button>
                          <button class="note-action-btn" data-delete-note="${n.id}" style="color:#EF5350;">删除</button>
                        </div>
                      </div>
                      <div class="note-content">${n.content}</div>
                    </div>
                  `).join('')
              }
            </div>
          </div>
        </main>
      </div>

      <div id="detail-modal-container"></div>
    `;

    root.innerHTML = html;
    bindEvents(book);
  }

  function bindEvents(book: Book): void {
    root.querySelector('#back-btn')?.addEventListener('click', () => onNavigate('/shelf'));

    const statusSelect = root.querySelector('#status-select') as HTMLSelectElement;
    statusSelect?.addEventListener('change', () => {
      const newStatus = statusSelect.value as BookStatus;
      updateBook(book.id, { status: newStatus });
      render();
    });

    root.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.getAttribute('data-tab') as 'reading' | 'notes';
        editingNoteId = null;
        render();
      });
    });

    root.querySelector('#delete-book-btn')?.addEventListener('click', () => {
      if (confirm(`确定要删除《${book.title}》吗？\n相关的阅读记录和笔记都会被删除。`)) {
        import('../utils/bookStorage').then(({ deleteBook }) => {
          deleteBook(book.id);
          onNavigate('/shelf');
        });
      }
    });

    if (activeTab === 'reading') {
      bindReadingEvents(book);
    } else {
      bindNotesEvents(book);
    }
  }

  function bindReadingEvents(book: Book): void {
    const startInput = root.querySelector('#record-start') as HTMLInputElement;
    const endInput = root.querySelector('#record-end') as HTMLInputElement;
    const currentInput = root.querySelector('#record-current') as HTMLInputElement;
    const preview = root.querySelector('#pages-preview') as HTMLElement;
    const dateInput = root.querySelector('#record-date') as HTMLInputElement;

    function updatePreview(): void {
      const s = parseInt(startInput.value || '0', 10);
      const e = parseInt(endInput.value || '0', 10);
      if (e > s) {
        preview.textContent = `本次阅读 ${e - s} 页 🎉`;
      } else if (s || e) {
        preview.textContent = '请检查起止页，终止页需大于起始页';
      } else {
        preview.textContent = '';
      }
    }

    startInput.addEventListener('input', updatePreview);
    endInput.addEventListener('input', updatePreview);

    currentInput.addEventListener('input', () => {
      if (!startInput.value) startInput.value = currentInput.value;
    });

    startInput.addEventListener('blur', () => {
      if (!currentInput.value) currentInput.value = startInput.value;
    });

    root.querySelector('#submit-record')?.addEventListener('click', () => {
      const s = parseInt(startInput.value || '0', 10);
      const e = parseInt(endInput.value || '0', 10);
      const date = dateInput.value || todayDateString();

      if (!s || !e) {
        alert('请填写起始页和终止页');
        return;
      }
      if (e <= s) {
        alert('终止页必须大于起始页');
        return;
      }
      if (e > book.totalPages) {
        alert(`终止页不能超过总页数 ${book.totalPages}`);
        return;
      }

      addReadingRecord(book.id, {
        date,
        startPage: s,
        endPage: e,
        pagesRead: e - s
      });

      render();
    });

    root.querySelectorAll('[data-delete-record]').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const recordId = (btn as HTMLElement).getAttribute('data-delete-record');
        if (recordId && confirm('确定要删除这条阅读记录吗？')) {
          deleteReadingRecord(book.id, recordId);
          render();
        }
      });
    });
  }

  function bindNotesEvents(book: Book): void {
    const editor = root.querySelector('#note-content') as HTMLElement;
    const saveBtn = root.querySelector('#save-note-btn') as HTMLButtonElement;
    const cancelBtn = root.querySelector('#cancel-edit-note') as HTMLButtonElement;

    if (editingNoteId) {
      const note = book.notes.find(n => n.id === editingNoteId);
      if (note && editor) {
        editor.innerHTML = note.content;
      }
    }

    root.querySelectorAll('.rte-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const cmd = (btn as HTMLElement).getAttribute('data-rte');
        if (cmd) {
          document.execCommand(cmd, false);
          editor?.focus();
        }
      });
    });

    saveBtn?.addEventListener('click', () => {
      const content = editor?.innerHTML || '';
      const textOnly = content.replace(/<[^>]*>/g, '').trim();
      if (!textOnly) {
        alert('笔记内容不能为空');
        return;
      }

      if (editingNoteId) {
        updateNote(book.id, editingNoteId, content);
        editingNoteId = null;
      } else {
        addNote(book.id, content);
      }
      render();
    });

    cancelBtn?.addEventListener('click', () => {
      editingNoteId = null;
      render();
    });

    root.querySelectorAll('[data-edit-note]').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        editingNoteId = (btn as HTMLElement).getAttribute('data-edit-note');
        render();
        setTimeout(() => {
          const ed = root.querySelector('#note-content') as HTMLElement;
          ed?.focus();
          const range = document.createRange();
          const sel = window.getSelection();
          if (ed && sel) {
            range.selectNodeContents(ed);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }, 50);
      });
    });

    root.querySelectorAll('[data-delete-note]').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const noteId = (btn as HTMLElement).getAttribute('data-delete-note');
        const card = root.querySelector(`[data-note-id="${noteId}"]`) as HTMLElement;

        if (noteId && confirm('确定要删除这条笔记吗？')) {
          if (card) {
            card.classList.add('fade-out');
            setTimeout(() => {
              deleteNote(book.id, noteId);
              render();
            }, 300);
          } else {
            deleteNote(book.id, noteId);
            render();
          }
        }
      });
    });
  }

  render();
}
