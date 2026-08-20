'use client'

import {
  BarChart3,
  Target,
  Tags,
  AlertTriangle,
  Wrench,
  Send,
  ShieldCheck,
  Lock,
  UserCheck,
  XCircle,
  HelpCircle,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'
import { NativeTable } from '@/components/ui/data/NativeTable'
import { capabilities, quotas, redLines, limitations, manualInterventions, disclaimer, dataNotice } from './data'

const ICONS: Record<string, React.ReactNode> = {
  chart: <BarChart3 size={18} />,
  target: <Target size={18} />,
  tag: <Tags size={18} />,
  alert: <AlertTriangle size={18} />,
  tool: <Wrench size={18} />,
  send: <Send size={18} />,
}

export function ShowcaseHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 dark:border-gray-800 bg-white/85 dark:bg-gray-950/85 backdrop-blur">
      <div className="mx-auto max-w-5xl px-4 lg:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white">
            <BarChart3 size={16} />
          </span>
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            闲逸通数据运营 Agent
          </span>
        </div>
        <div className="flex items-center gap-3">
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400 mr-2">
            <a href="#chat" className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors">体验</a>
            <a href="#capabilities" className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors">能力</a>
            <a href="#workflow" className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors">工作流</a>
            <a href="#report" className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors">日报样例</a>
            <a href="#rules" className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors">规范与边界</a>
          </nav>
          <div className="flex items-center gap-2">
            <a
              href="/login"
              title="登录闲逸通自动发货系统（独立项目）"
              className="hidden sm:inline-flex h-8 items-center px-3 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:border-blue-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              登录闲逸通
            </a>
            <a
              href="/register"
              title="注册闲逸通自动发货系统（独立项目）"
              className="inline-flex h-8 items-center px-3 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              注册闲逸通
            </a>
          </div>
        </div>
      </div>
    </header>
  )
}

export function ShowcaseHero() {
  return (
    <section className="pt-14 pb-10 text-center">
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 mb-5">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
        每日自动运营分析 · 报告推送飞书
      </div>
      <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 dark:text-gray-100 leading-tight tracking-tight">
        闲鱼多店铺数据运营 Agent
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-base text-gray-500 dark:text-gray-400 leading-relaxed">
        自动拉取名下全部店铺经营数据，判断阶段 / 分配运营重心 / 制定商品策略 / 监测衰退迹象，
        每天产出一份「带可执行动作清单」的运营日报 —— 每个结论都有数据支撑，每条建议都能直接执行。
      </p>
      <div className="mt-7 flex items-center justify-center gap-3 flex-wrap">
        <a
          href="#chat"
          className="inline-flex items-center gap-1.5 h-10 px-5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          体验模拟对话
        </a>
        <a
          href="#report"
          className="inline-flex items-center gap-1.5 h-10 px-5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:border-blue-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          查看日报样例
        </a>
        <a
          href="/register"
          className="inline-flex items-center gap-1.5 h-10 px-5 rounded-lg border border-blue-200 dark:border-blue-900 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
        >
          注册闲逸通自动发货系统
          <ArrowRight size={15} />
        </a>
      </div>
      <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
        演示环境 · 数据为脱敏样例 · 不连接真实系统
      </p>
      <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
        <RefreshCw size={12} className="shrink-0" />
        Agent 持续演进中：当前为初级阶段示例，能力与规范将随运营实践不断迭代
      </p>
      <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
        <ArrowRight size={12} className="shrink-0" />
        注册 / 登录入口均指向独立项目「闲逸通自动发货系统」，本页数据运营 Agent 不开放注册
      </p>
    </section>
  )
}

export function CapabilityGrid() {
  return (
    <section id="capabilities" className="scroll-mt-20">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">核心能力</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {capabilities.map((cap) => (
          <div
            key={cap.title}
            className="rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4"
          >
            <div className="flex items-center gap-2.5 mb-2.5">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                {ICONS[cap.icon]}
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{cap.title}</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{cap.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export function RulesBoundaries() {
  return (
    <section id="rules" className="scroll-mt-20 grid lg:grid-cols-2 gap-4">
      {/* 规范与红线 */}
      <div className="rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">操作规范与红线</h3>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">操作配额（config.yaml 可调）</p>
        <NativeTable
          columns={[
            { key: 'item', header: '操作', width: '25%', render: (row) => row.item },
            { key: 'value', header: '配额', width: '32%', render: (row) => row.value },
            { key: 'note', header: '说明', width: '43%', render: (row) => row.note },
          ]}
          data={quotas}
          keyExtractor={(row) => row.item}
        />
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-4 mb-2">红线（MUST NOT）</p>
        <ul className="space-y-1.5">
          {redLines.map((line) => (
            <li key={line} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
              <Lock size={14} className="mt-0.5 text-red-400 shrink-0" />
              <span className="leading-snug">{line}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 能力边界 */}
      <div className="rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">能力边界</h3>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">它做不了什么</p>
        <ul className="space-y-1.5 mb-4">
          {limitations.map((line) => (
            <li key={line} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
              <XCircle size={14} className="mt-0.5 text-gray-400 shrink-0" />
              <span className="leading-snug">{line}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">什么情况需要人工介入</p>
        <ul className="space-y-1.5">
          {manualInterventions.map((line) => (
            <li key={line} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
              <UserCheck size={14} className="mt-0.5 text-amber-500 shrink-0" />
              <span className="leading-snug">{line}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 安全保障条 */}
      <div className="lg:col-span-2 rounded-xl border border-blue-100 dark:border-blue-950 bg-blue-50/60 dark:bg-blue-950/40 p-4 flex items-start gap-3">
        <ShieldCheck size={18} className="mt-0.5 text-blue-600 dark:text-blue-400 shrink-0" />
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">安全设计</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            所有写操作（调价 / 下架 / 上架 / 刷单）均需人工分步授权并受配额拦截，全程落库留痕；
            分析过程只读，不删除任何数据；异常时降级为可用结论并标注，绝不报错完事。
          </p>
        </div>
      </div>
    </section>
  )
}

export function ShowcaseFooter() {
  return (
    <footer className="border-t border-gray-100 dark:border-gray-800 mt-10">
      <div className="mx-auto max-w-5xl px-4 lg:px-6 py-6 flex items-start gap-2">
        <HelpCircle size={14} className="mt-0.5 text-gray-400 shrink-0" />
        <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">{disclaimer}</p>
      </div>
    </footer>
  )
}
