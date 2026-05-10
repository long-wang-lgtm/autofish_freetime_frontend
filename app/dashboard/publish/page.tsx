'use client'

import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { OpportunityLibrary } from './components/OpportunityLibrary'
import { PublishWorkspace } from './components/PublishWorkspace'
import { ResizableDivider } from './components/ResizableDivider'
import { MobileTabView } from './components/MobileTabView'
import { listOpportunities, type Opportunity } from '@/lib/api/opportunities'
import { listAccounts } from '@/lib/api/accounts'
import { useMediaQuery } from '@/hooks/useMediaQuery'

const LEFT_PANEL_DEFAULT_WIDTH = 280
const LEFT_PANEL_MIN_WIDTH = 200
const LEFT_PANEL_MAX_WIDTH = 480

export default function PublishPage() {
  const queryClient = useQueryClient()
  const isMobile = useMediaQuery('(max-width: 768px)')

  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null)

  const [leftWidth, setLeftWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('publish_panel_left_width')
      return stored ? parseInt(stored) : LEFT_PANEL_DEFAULT_WIDTH
    }
    return LEFT_PANEL_DEFAULT_WIDTH
  })

  const { data: opportunitiesData, isLoading: opportunitiesLoading } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => listOpportunities({ page_size: 100 }),
  })

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: listAccounts,
  })

  const handleLeftWidthChange = useCallback((delta: number) => {
    setLeftWidth(prev => {
      const next = Math.max(LEFT_PANEL_MIN_WIDTH, Math.min(LEFT_PANEL_MAX_WIDTH, prev + delta))
      localStorage.setItem('publish_panel_left_width', String(next))
      return next
    })
  }, [])

  if (isMobile) {
    return (
      <div className="h-full">
        <MobileTabView
          opportunities={opportunitiesData?.items || []}
          selectedOpportunity={selectedOpportunity}
          onSelectOpportunity={setSelectedOpportunity}
          accounts={accountsData?.accounts || []}
        />
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      <div style={{ width: leftWidth, flexShrink: 0 }} className="overflow-hidden h-full">
        <OpportunityLibrary
          opportunities={opportunitiesData?.items || []}
          isLoading={opportunitiesLoading}
          selectedOpportunity={selectedOpportunity}
          onSelectOpportunity={setSelectedOpportunity}
        />
      </div>

      <ResizableDivider
        direction="horizontal"
        onResize={handleLeftWidthChange}
      />

      <div className="flex-1 h-full overflow-hidden">
        <PublishWorkspace
          opportunity={selectedOpportunity}
          accounts={accountsData?.accounts || []}
          onRefreshOpportunities={() => queryClient.invalidateQueries({ queryKey: ['opportunities'] })}
        />
      </div>
    </div>
  )
}
