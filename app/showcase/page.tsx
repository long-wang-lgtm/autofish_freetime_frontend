import type { Metadata } from 'next'
import { ChatConsole } from '@/components/showcase/ChatConsole'
import { WorkflowTimeline } from '@/components/showcase/WorkflowTimeline'
import { ReportSample } from '@/components/showcase/ReportSample'
import {
  ShowcaseHeader,
  ShowcaseHero,
  CapabilityGrid,
  RulesBoundaries,
  ShowcaseFooter,
} from '@/components/showcase/sections'

export const metadata: Metadata = {
  title: '闲逸通数据运营 Agent — 公开演示',
  description:
    '闲鱼多店铺数据运营 Agent：每日自动拉取经营数据，判断阶段、分配运营重心、制定商品策略、监测衰退迹象，产出带可执行动作清单的运营日报。本页为演示环境，数据为脱敏样例。',
}

export default function ShowcasePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <ShowcaseHeader />
      <main className="mx-auto max-w-5xl px-4 lg:px-6 space-y-5 pb-10">
        <ShowcaseHero />

        <section id="chat" className="scroll-mt-20">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            与 Agent 对话
            <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">（模拟演示）</span>
          </h2>
          <ChatConsole />
        </section>

        <CapabilityGrid />

        <section id="workflow" className="scroll-mt-20">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">每日工作流</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            每天一条命令，6 个环节自动完成（滚动到本区域触发回放）：
          </p>
          <WorkflowTimeline />
        </section>

        <section id="report" className="scroll-mt-20">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">真实日报样例</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            脱敏自实际运行输出，结构与真实日报一致：数据概览 → 各账号分析 → 动作清单 → 异常汇总
          </p>
          <ReportSample />
        </section>

        <RulesBoundaries />
      </main>
      <ShowcaseFooter />
    </div>
  )
}
