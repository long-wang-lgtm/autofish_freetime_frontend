'use client'

import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'

/**
 * ECharts 图表通用 hook
 *
 * 封装 echarts.init / setOption / dispose / resize，
 * 调用方只需传入 option 和依赖数组，获取 ref 绑定到容器元素即可。
 */
export function useChart<T extends HTMLElement>(
  option: echarts.EChartsOption | null,
  deps: unknown[],
) {
  const ref = useRef<T>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!ref.current || !option) return
    if (!chartRef.current) {
      chartRef.current = echarts.init(ref.current)
    }
    chartRef.current.setOption(option, true)
  }, deps)

  useEffect(() => {
    const chart = chartRef.current
    return () => {
      if (chart) {
        chartRef.current = null
        chart.dispose()
      }
    }
  }, [])

  useEffect(() => {
    const handleResize = () => chartRef.current?.resize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return ref
}
