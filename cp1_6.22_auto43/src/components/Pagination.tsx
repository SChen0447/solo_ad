interface Props {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function Pagination({ page, totalPages, onPageChange }: Props) {
  if (totalPages <= 1) return null;

  const getPageNumbers = (): (number | '...')[] => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    pages.push(1);
    if (page > 3) pages.push('...');

    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);

    for (let i = start; i <= end; i++) pages.push(i);

    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);

    return pages;
  };

  const pageNumbers = getPageNumbers();
  const isFirst = page === 1;
  const isLast = page === totalPages;

  return (
    <div style={styles.wrap}>
      <button
        style={{
          ...styles.navBtn,
          ...(isFirst ? styles.navBtnDisabled : {}),
        }}
        onClick={() => !isFirst && onPageChange(page - 1)}
        disabled={isFirst}
      >
        ‹ 上一页
      </button>

      <div style={styles.pages}>
        {pageNumbers.map((p, idx) =>
          p === '...' ? (
            <span key={`e${idx}`} style={styles.ellipsis}>
              …
            </span>
          ) : (
            <button
              key={p}
              style={{
                ...styles.pageBtn,
                ...(p === page ? styles.pageBtnActive : {}),
              }}
              onClick={() => onPageChange(p as number)}
            >
              {p}
            </button>
          )
        )}
      </div>

      <button
        style={{
          ...styles.navBtn,
          ...(isLast ? styles.navBtnDisabled : {}),
        }}
        onClick={() => !isLast && onPageChange(page + 1)}
        disabled={isLast}
      >
        下一页 ›
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 32,
    flexWrap: 'wrap',
  },
  pages: {
    display: 'flex',
    gap: 6,
    alignItems: 'center',
  },
  pageBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    color: '#4a5568',
    fontSize: 14,
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  pageBtnActive: {
    backgroundColor: '#3182ce',
    borderColor: '#3182ce',
    color: '#ffffff',
    boxShadow: '0 2px 8px rgba(49, 130, 206, 0.3)',
  },
  navBtn: {
    padding: '8px 16px',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    color: '#4a5568',
    fontSize: 14,
    fontWeight: 500,
    transition: 'all 0.2s ease',
  },
  navBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  ellipsis: {
    color: '#a0aec0',
    padding: '0 4px',
    fontSize: 14,
  },
};

export default Pagination;
