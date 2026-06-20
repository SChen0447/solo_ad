import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import ePub, { Book, Rendition } from 'epubjs';
import apiClient from '../apiClient';
import NoteModal from '../components/NoteModal';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

interface BookInfo {
  id: number;
  title: string;
  author: string;
  file_type: string;
  file_url: string;
  total_pages: number;
}

type BgColor = 'white' | 'beige' | 'night';

const bgColors: Record<BgColor, string> = {
  white: '#ffffff',
  beige: '#f5f0e8',
  night: '#2c2c2c'
};

const textColors: Record<BgColor, string> = {
  white: '#1e1e2e',
  beige: '#3a3a3a',
  night: '#e0e0e0'
};

interface SelectionInfo {
  text: string;
  page: number;
  x: number;
  y: number;
}

const Reader: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<BookInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [fontSize, setFontSize] = useState(16);
  const [bgColor, setBgColor] = useState<BgColor>('beige');
  const [brightness, setBrightness] = useState(100);

  const [selection, setSelection] = useState<SelectionInfo | null>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteSelection, setNoteSelection] = useState<{ text: string; page: number } | null>(null);
  const [highlights, setHighlights] = useState<Array<{ id: number; page: number; text: string }>>([]);

  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<any>(null);
  const epubBookRef = useRef<Book | null>(null);
  const epubRenditionRef = useRef<Rendition | null>(null);
  const epubContainerRef = useRef<HTMLDivElement>(null);
  const readerContainerRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const saveProgress = useCallback(async (page: number, total: number) => {
    if (!id || total === 0) return;
    const progress = (page / total) * 100;
    try {
      await apiClient.put(`/books/${id}/read-progress`, {
        page,
        progress
      });
    } catch (err) {
      console.error('Failed to save progress');
    }
  }, [id]);

  useEffect(() => {
    const fetchBook = async () => {
      try {
        const response = await apiClient.get(`/books/${id}`);
        setBook(response.data);
        setTotalPages(response.data.total_pages || 0);

        try {
          const progressResp = await apiClient.get(`/books/${id}/read-progress`);
          if (progressResp.data && progressResp.data.last_read_page) {
            setCurrentPage(progressResp.data.last_read_page);
          }
        } catch (e) {
          // ignore
        }
      } catch (err) {
        alert('加载书籍失败');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    fetchBook();
  }, [id, navigate]);

  const renderPdfPage = useCallback(async (pageNum: number) => {
    if (!pdfDocRef.current || !pdfCanvasRef.current) return;
    try {
      const page = await pdfDocRef.current.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = pdfCanvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: context, viewport }).promise;
    } catch (err) {
      console.error('Failed to render PDF page');
    }
  }, []);

  useEffect(() => {
    if (!book || book.file_type !== 'pdf') return;

    const loadPdf = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument(book.file_url);
        const pdfDoc = await loadingTask.promise;
        pdfDocRef.current = pdfDoc;
        setTotalPages(pdfDoc.numPages);
        await renderPdfPage(currentPage);
      } catch (err) {
        console.error('Failed to load PDF:', err);
      }
    };
    loadPdf();
  }, [book]);

  useEffect(() => {
    if (book?.file_type === 'pdf' && pdfDocRef.current) {
      renderPdfPage(currentPage);
      saveProgress(currentPage, totalPages);
    }
  }, [currentPage, book, totalPages, renderPdfPage, saveProgress]);

  useEffect(() => {
    if (!book || book.file_type !== 'epub' || !epubContainerRef.current) return;
    const containerEl = epubContainerRef.current;

    const cleanup = () => {
      if (epubRenditionRef.current) {
        epubRenditionRef.current.destroy();
        epubRenditionRef.current = null;
      }
    };

    cleanup();

    const loadEpub = async () => {
      try {
        const epubBook = ePub(book.file_url);
        epubBookRef.current = epubBook;

        const rendition = epubBook.renderTo(containerEl, {
          width: '100%',
          height: '100%',
          spread: 'none'
        });

        epubRenditionRef.current = rendition;

        rendition.themes.default({
          body: {
            background: bgColors[bgColor],
            color: textColors[bgColor],
            'font-size': `${fontSize}px`,
            padding: '20px',
            filter: `brightness(${brightness}%)`,
            transition: 'background-color 0.5s ease, color 0.5s ease'
          }
        });

        const loc = await epubBook.locations.generate(1024);
        const total = epubBook.locations.length();
        setTotalPages(total);

        if (currentPage > 1 && currentPage <= total) {
          const cfi = epubBook.locations.cfiFromPercentage((currentPage - 1) / total);
          await rendition.display(cfi);
        } else {
          await rendition.display();
        }

        rendition.on('relocated', (location: any) => {
          if (location && location.start) {
            const percentage = epubBook.locations.percentageFromCfi(location.start.cfi);
            const page = Math.round(percentage * total) + 1;
            setCurrentPage(page);
            saveProgress(page, total);
          }
        });
      } catch (err) {
        console.error('Failed to load EPUB:', err);
      }
    };

    loadEpub();

    return cleanup;
  }, [book, fontSize, bgColor, brightness, currentPage, saveProgress]);

  useEffect(() => {
    if (!book || book.file_type !== 'epub' || !epubRenditionRef.current) return;

    const rendition = epubRenditionRef.current;
    rendition.themes.override('font-size', `${fontSize}px`);
    rendition.themes.override('background', bgColors[bgColor]);
    rendition.themes.override('color', textColors[bgColor]);
    rendition.themes.override('filter', `brightness(${brightness}%)`);
  }, [fontSize, bgColor, brightness, book]);

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    if (book?.file_type === 'epub' && epubBookRef.current && epubRenditionRef.current) {
      const percentage = (page - 1) / totalPages;
      const cfi = epubBookRef.current.locations.cfiFromPercentage(percentage);
      epubRenditionRef.current.display(cfi);
    }
    setCurrentPage(page);
  };

  const handleTextSelection = useCallback((e: React.MouseEvent) => {
    const sel = window.getSelection();
    const text = sel?.toString().trim();
    if (!text || text.length === 0) {
      setSelection(null);
      return;
    }

    const range = sel?.getRangeAt(0);
    if (!range) return;

    const rect = range.getBoundingClientRect();
    const containerRect = readerContainerRef.current?.getBoundingClientRect();

    setSelection({
      text,
      page: currentPage,
      x: rect.left - (containerRect?.left || 0) + rect.width / 2,
      y: rect.top - (containerRect?.top || 0) - 40
    });
  }, [currentPage]);

  const clearSelection = () => {
    window.getSelection()?.removeAllRanges();
    setSelection(null);
  };

  const handleHighlight = () => {
    if (!selection) return;
    setHighlights((prev) => [
      ...prev,
      { id: Date.now(), page: selection.page, text: selection.text }
    ]);
    clearSelection();
  };

  const handleNote = () => {
    if (!selection) return;
    setNoteSelection({ text: selection.text, page: selection.page });
    setShowNoteModal(true);
    clearSelection();
  };

  const handleNoteSaved = () => {
    setShowNoteModal(false);
    setNoteSelection(null);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-text-light">加载中...</div>;
  }

  if (!book) {
    return <div className="min-h-screen flex items-center justify-center text-text-light">书籍不存在</div>;
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundColor: '#1e1e2e',
        transition: 'background-color 0.5s ease'
      }}
    >
      <div
        ref={toolbarRef}
        className="glass-card px-6 py-4 flex items-center justify-between flex-wrap gap-4"
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="text-text-light/70 hover:text-text-light flex items-center gap-2 text-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回书架
          </button>
          <div>
            <h2 className="text-text-light font-medium">{book.title}</h2>
            <p className="text-xs text-text-light/60">{book.author}</p>
          </div>
        </div>

        <div className="flex items-center gap-5 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-light/60">字号</span>
            <button
              onClick={() => setFontSize((s) => Math.max(12, s - 2))}
              className="w-8 h-8 rounded-lg bg-white/10 text-text-light hover:bg-white/20 text-sm"
            >
              A-
            </button>
            <span className="text-xs text-text-light w-10 text-center">{fontSize}px</span>
            <button
              onClick={() => setFontSize((s) => Math.min(28, s + 2))}
              className="w-8 h-8 rounded-lg bg-white/10 text-text-light hover:bg-white/20 text-sm"
            >
              A+
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-text-light/60">背景</span>
            <div className="flex gap-1.5">
              {(Object.keys(bgColors) as BgColor[]).map((color) => (
                <button
                  key={color}
                  onClick={() => setBgColor(color)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    bgColor === color ? 'border-primary scale-110' : 'border-stroke'
                  }`}
                  style={{ backgroundColor: bgColors[color] }}
                  title={color}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-text-light/60">亮度</span>
            <input
              type="range"
              min="30"
              max="150"
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="w-24 accent-primary"
            />
          </div>
        </div>
      </div>

      <div
        ref={readerContainerRef}
        className="flex-1 relative overflow-hidden fade-transition"
        style={{
          backgroundColor: bgColors[bgColor],
          filter: `brightness(${brightness}%)`
        }}
        onMouseUp={handleTextSelection}
        onClick={() => {
          if (selection) clearSelection();
        }}
      >
        {book.file_type === 'pdf' && (
          <div className="h-full overflow-y-auto flex items-start justify-center p-6">
            <canvas
              ref={pdfCanvasRef}
              className="max-w-full shadow-2xl"
              style={{
                backgroundColor: bgColors[bgColor],
                filter: `brightness(${brightness}%)`
              }}
            />
          </div>
        )}

        {book.file_type === 'epub' && (
          <div ref={epubContainerRef} className="w-full h-full" />
        )}

        {selection && (
          <div
            className="absolute z-20 flex gap-1 glass-card rounded-lg p-1 shadow-lg"
            style={{
              left: selection.x,
              top: selection.y,
              transform: 'translateX(-50%)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleHighlight}
              className="px-3 py-1.5 text-xs rounded-md hover:bg-white/10 text-text-light"
              style={{ backgroundColor: 'rgba(241, 196, 15, 0.3)' }}
            >
              高亮
            </button>
            <button
              onClick={handleNote}
              className="px-3 py-1.5 text-xs rounded-md hover:bg-white/10 text-text-light"
            >
              笔记
            </button>
          </div>
        )}
      </div>

      <div className="glass-card px-6 py-3 flex items-center justify-center gap-4">
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1}
          className="px-4 py-2 rounded-lg bg-white/10 text-text-light hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
        >
          上一页
        </button>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={totalPages}
            value={currentPage}
            onChange={(e) => goToPage(Number(e.target.value))}
            className="w-16 px-3 py-1.5 rounded-lg bg-white/5 border border-stroke text-text-light text-center text-sm focus:outline-none focus:border-primary"
          />
          <span className="text-text-light/60 text-sm">/ {totalPages || '...'}</span>
        </div>
        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="px-4 py-2 rounded-lg bg-white/10 text-text-light hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
        >
          下一页
        </button>
      </div>

      {showNoteModal && noteSelection && book && (
        <NoteModal
          bookId={book.id}
          selectedText={noteSelection.text}
          pageNumber={noteSelection.page}
          onClose={() => setShowNoteModal(false)}
          onSaved={handleNoteSaved}
        />
      )}
    </div>
  );
};

export default Reader;
