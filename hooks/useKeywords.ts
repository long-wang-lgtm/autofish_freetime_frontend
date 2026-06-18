"use client"

import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import { listKeywordRules } from "@/lib/api/keywords"

export interface KeywordStats {
  total: number
  enabled: number
  disabled: number
  linkedItems: number
  linkedGroups: number
}

export function useKeywords() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["keywords"],
    queryFn: listKeywordRules,
    refetchInterval: 30000,
  })

  const rules = data?.rules ?? []

  const stats = useMemo<KeywordStats>(() => ({
    total: rules.length,
    enabled: rules.filter((r) => r.enabled).length,
    disabled: rules.filter((r) => !r.enabled).length,
    linkedItems: rules.reduce((sum, r) => sum + r.linked_items, 0),
    linkedGroups: rules.reduce((sum, r) => sum + r.linked_groups, 0),
  }), [rules])

  const itemKeywordCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const rule of rules) {
      for (const item of rule.linked_item_list) {
        counts[item.item_id] = (counts[item.item_id] || 0) + 1
      }
    }
    return counts
  }, [rules])

  return { rules, isLoading, error, stats, itemKeywordCounts }
}
