'use client'

import { useEffect, useRef } from 'react'
import type { EChartsOption } from 'echarts'
import type { EChartsType } from 'echarts/core'
import { echarts } from './echarts'

/**
 * ECharts 图表通用 hook
 *
 * 封装 echarts.init / setOption / dispose / resize，
 * 调用方只需传入 option 和依赖数组，获取 ref 绑定到容器元素即可。
 *
 * 运行时从 echarts/core 取（按需注册，见 ./echarts.ts），
 * 只有 EChartsOption 类型来自全量包——类型导入在编译期被抹除，不进产物。
 */
export function useChart<T extends HTMLElement>(
  option: EChartsOption | null,
  deps: unknown[],
) {
  const ref = useRef<T>(null)
  const chartRef = useRef<EChartsType | null>(null)

  useEffect(() => {
    if (!ref.current || !option) return
    if (!chartRef.current) {
      chartRef.current = echarts.init(ref.current)
    }
    chartRef.current.setOption(option, true)
  }, deps)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // 容器尺寸变化也要重排——画布高度、侧栏收放都会改绘图区，只听 window.resize 不够
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect
      // 隐藏/折叠中的容器量到 0，这时候 resize 会把图表压成一条线
      if (!box || !box.width || !box.height) return
      chartRef.current?.resize()
    })
    observer.observe(el)

    const handleResize = () => chartRef.current?.resize()
    window.addEventListener('resize', handleResize)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  useEffect(() => {
    return () => {
      chartRef.current?.dispose()
      chartRef.current = null
    }
  }, [])

  return ref
}
