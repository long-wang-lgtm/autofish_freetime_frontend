/**
 * 量文字实际占宽（px）
 *
 * 图表按像素排版时要给文字留出精确的空间：留多了条就短，留少了字被裁。
 * 用 canvas 量——和 ECharts 画标签时用的是同一套字体度量，量出来的就是要占的宽度。
 * 字体串必须与图表标签的字体一致（ECharts 默认 sans-serif），否则量的不是一回事。
 *
 * 没有 DOM 时返回 0：服务端渲染阶段量不了，图表此时也不该排版（宽度同样是 0）。
 */
export function measureTextWidth(
  text: string,
  fontSize: number,
  weight = 400,
): number {
  const ctx = context()
  if (!ctx) return 0
  // 字重必须与标签用的数值完全一致：600 和 bold(700) 在有些字体里不是一套度量
  ctx.font = `${weight} ${fontSize}px sans-serif`
  return ctx.measureText(text).width
}

let cached: CanvasRenderingContext2D | null | undefined

function context(): CanvasRenderingContext2D | null {
  if (cached === undefined) {
    cached =
      typeof document === 'undefined'
        ? null
        : document.createElement('canvas').getContext('2d')
  }
  return cached
}
