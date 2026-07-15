'use client'

function buildPages(page: number, totalPages: number): (number | '...')[] {
  const pages: (number | '...')[] = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...')
    }
  }
  return pages
}

export function Pagination({
  page,
  total,
  pageSize,
  onChange,
}: {
  page: number
  total: number
  pageSize: number
  onChange: (p: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (totalPages <= 1) return null

  const pages = buildPages(page, totalPages)
  const prevDisabled = page <= 1
  const nextDisabled = page >= totalPages

  // 共享按钮基础样式
  const btnBase =
    'rounded-lg border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors'
  const activeBtn = 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'

  return (
    <div className="@container border-t border-gray-100">

      {/* ====== < 256px — 纯箭头 + 页码（默认，不依赖断点） ====== */}
      <div className="flex @xs:hidden items-center justify-center gap-1.5 px-2 py-2">
        <button
          onClick={() => onChange(page - 1)}
          disabled={prevDisabled}
          className={`px-2 py-1 text-xs ${btnBase}`}
          aria-label="上一页"
        >
          ←
        </button>
        <span className="text-xs text-gray-600 tabular-nums whitespace-nowrap">
          第 {page}/{totalPages} 页
        </span>
        <button
          onClick={() => onChange(page + 1)}
          disabled={nextDisabled}
          className={`px-2 py-1 text-xs ${btnBase}`}
          aria-label="下一页"
        >
          →
        </button>
      </div>

      {/* ====== 256–383px (@xs) — 文字按钮 + 页码 ====== */}
      <div className="hidden @xs:flex @sm:hidden items-center justify-center gap-1.5 px-3 py-2">
        <button
          onClick={() => onChange(page - 1)}
          disabled={prevDisabled}
          className={`px-3 py-1 text-sm ${btnBase}`}
        >
          上一页
        </button>
        <span className="text-sm text-gray-600 tabular-nums whitespace-nowrap">
          第 {page}/{totalPages} 页
        </span>
        <button
          onClick={() => onChange(page + 1)}
          disabled={nextDisabled}
          className={`px-3 py-1 text-sm ${btnBase}`}
        >
          下一页
        </button>
      </div>

      {/* ====== 384–511px (@sm) — 简化页码 + 总数缩写 ====== */}
      <div className="hidden @sm:flex @lg:hidden items-center justify-end gap-1 px-4 py-2">
        <button
          onClick={() => onChange(page - 1)}
          disabled={prevDisabled}
          className={`px-2.5 py-1 text-sm ${btnBase}`}
        >
          上一页
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`sm-dot-${i}`} className="px-1.5 text-gray-400 text-sm">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p as number)}
              className={`px-2 py-1 text-sm rounded-lg border ${
                p === page ? activeBtn : btnBase
              }`}
            >
              {p}
            </button>
          ),
        )}
        <button
          onClick={() => onChange(page + 1)}
          disabled={nextDisabled}
          className={`px-2.5 py-1 text-sm ${btnBase}`}
        >
          下一页
        </button>
        <span className="ml-2 text-xs text-gray-500 tabular-nums whitespace-nowrap">
          {total}条
        </span>
      </div>

      {/* ====== @lg+: ≥ 512px — 完整分页（当前行为） ====== */}
      <div className="hidden @lg:flex items-center justify-end gap-1 px-4 py-3">
        <button
          onClick={() => onChange(page - 1)}
          disabled={prevDisabled}
          className={`px-3 py-1 text-sm ${btnBase}`}
        >
          上一页
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`lg-dot-${i}`} className="px-3 text-gray-400">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p as number)}
              className={`px-3 py-1 text-sm rounded-lg border ${
                p === page ? activeBtn : btnBase
              }`}
            >
              {p}
            </button>
          ),
        )}
        <button
          onClick={() => onChange(page + 1)}
          disabled={nextDisabled}
          className={`px-3 py-1 text-sm ${btnBase}`}
        >
          下一页
        </button>
        <span className="ml-3 text-xs text-gray-500 tabular-nums whitespace-nowrap">
          共 {total} 条
        </span>
      </div>

    </div>
  )
}
