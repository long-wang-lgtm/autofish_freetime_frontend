'use client'

import { Sheet } from '@/components/ui/Sheet'
import { AccountsConfig } from '@/components/selection/config/AccountsConfig'
import { AIConfig } from '@/components/selection/config/AIConfig'
import { CollectionConfig } from '@/components/selection/config/CollectionConfig'

interface SettingsDrawerProps {
  open: boolean
  onClose: () => void
}

export function SettingsDrawer({ open, onClose }: SettingsDrawerProps) {
  return (
    <Sheet open={open} onClose={onClose} title="选品监控设置" width="480px">
      <div className="p-4 space-y-6 overflow-y-auto h-full">
        <section>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">对标账号</h4>
          <AccountsConfig />
        </section>

        <section>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">AI 分析配置</h4>
          <AIConfig />
        </section>

        <section>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">采集设置</h4>
          <CollectionConfig />
        </section>
      </div>
    </Sheet>
  )
}
