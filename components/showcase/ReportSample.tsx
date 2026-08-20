'use client'

import { useState } from 'react'
import { NativeTable } from '@/components/ui/data/NativeTable'
import { Info } from 'lucide-react'
import {
  overviewRows,
  accountDetails,
  actionRows,
  anomalies,
  dataNotice,
  type AccountOverview,
  type ActionRow,
} from './data'

function FocusBadge({ focus }: { focus: AccountOverview['focus'] }) {
  const active = focus === '重点运营'
  return (
    <span
      className={
        active
          ? 'inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
          : 'inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400'
      }
    >
      {focus}
    </span>
  )
}

function PhaseText({ phase }: { phase: string }) {
  const warn = phase === '数据不足'
  return (
    <span className={warn ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-gray-700 dark:text-gray-300'}>
      {phase}
    </span>
  )
}

function ActionBadge({ action }: { action: ActionRow['action'] }) {
  const style =
    action === '下架'
      ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400'
      : action === '调价'
        ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
        : 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400'
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {action}
    </span>
  )
}

export function ReportSample() {
  const [activeIdx, setActiveIdx] = useState(0)
  const detail = accountDetails[activeIdx]

  return (
    <div className="space-y-4">
      {/* 数据模糊化特殊标记 */}
      <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/70 dark:bg-amber-950/40 p-3.5 flex items-start gap-2.5">
        <Info size={16} className="mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{dataNotice}</p>
      </div>

      {/* 数据概览 */}
      <div className="rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">数据概览（近 7 天）</p>
        <NativeTable<AccountOverview>
          columns={[
            { key: 'name', header: '账号', width: '12%', render: (row) => row.name },
            { key: 'type', header: '类型', width: '10%', render: (row) => row.type },
            {
              key: 'totalSales',
              header: '总销量',
              width: '10%',
              align: 'right',
              render: (row) => (
                <span className="font-medium text-gray-900 dark:text-gray-100 tabular-nums">{row.totalSales}</span>
              ),
            },
            {
              key: 'sellThrough',
              header: '动销率',
              width: '10%',
              align: 'right',
              render: (row) => <span className="tabular-nums">{row.sellThrough}</span>,
            },
            {
              key: 'onShelf',
              header: '在售/上限',
              width: '12%',
              align: 'right',
              render: (row) => <span className="tabular-nums">{row.onShelf}</span>,
            },
            {
              key: 'phase',
              header: '阶段',
              width: '10%',
              align: 'center',
              render: (row) => <PhaseText phase={row.phase} />,
            },
            {
              key: 'focus',
              header: '运营重心',
              width: '12%',
              align: 'center',
              render: (row) => <FocusBadge focus={row.focus} />,
            },
          ]}
          data={overviewRows}
          keyExtractor={(row) => row.name}
        />
      </div>

      {/* 账号详情 Tab */}
      <div className="rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">各账号分析（点击切换）</p>
        <div className="flex gap-2 flex-wrap mb-4">
          {accountDetails.map((acc, i) => (
            <button
              key={acc.name}
              type="button"
              onClick={() => setActiveIdx(i)}
              className={
                i === activeIdx
                  ? 'inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-medium bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 transition-colors'
                  : 'inline-flex items-center px-2.5 py-1 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
              }
            >
              {acc.name}
              <span className="ml-1.5 text-xs text-gray-400 dark:text-gray-500">{acc.type}</span>
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-base font-semibold text-gray-900 dark:text-gray-100">{detail.name}</span>
            <PhaseText phase={detail.phase} />
            <FocusBadge focus={detail.focus} />
          </div>

          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <span className="text-gray-400 dark:text-gray-500">阶段判断：</span>
              <span className="text-gray-700 dark:text-gray-300">{detail.phaseReason}</span>
            </div>
            <div>
              <span className="text-gray-400 dark:text-gray-500">爆单：</span>
              <span className="text-gray-700 dark:text-gray-300">{detail.burst}</span>
            </div>
            <div>
              <span className="text-gray-400 dark:text-gray-500">衰退：</span>
              <span className="text-gray-700 dark:text-gray-300">{detail.decline}</span>
            </div>
            <div>
              <span className="text-gray-400 dark:text-gray-500">运营重心：</span>
              <span className="text-gray-700 dark:text-gray-300">{detail.focusReason}</span>
            </div>
          </div>

          <div className="pt-2">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">主力商品（窗口内总销量 TOP）</p>
            <NativeTable
              columns={[
                { key: 'title', header: '商品标题', width: '55%', render: (row) => row.title },
                {
                  key: 'sales',
                  header: '窗口总销量',
                  width: '15%',
                  align: 'right',
                  render: (row) => <span className="tabular-nums font-medium">{row.sales}</span>,
                },
                {
                  key: 'days',
                  header: '出单天数',
                  width: '15%',
                  align: 'right',
                  render: (row) => <span className="tabular-nums">{row.days}</span>,
                },
                {
                  key: 'daily',
                  header: '日均',
                  width: '15%',
                  align: 'right',
                  render: (row) => <span className="tabular-nums">{row.daily}</span>,
                },
              ]}
              data={detail.topItems}
              keyExtractor={(row) => row.title}
            />
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              建议下架（{detail.candidates.length} 个，按本周剩余配额截断）
            </p>
            <ul className="space-y-1.5">
              {detail.candidates.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  <span className="leading-snug">{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* 动作清单 */}
      <div className="rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">动作清单（人工确认后执行）</p>
        <NativeTable<ActionRow>
          columns={[
            { key: 'account', header: '账号', width: '12%', render: (row) => row.account },
            {
              key: 'action',
              header: '动作',
              width: '10%',
              align: 'center',
              render: (row) => <ActionBadge action={row.action} />,
            },
            { key: 'target', header: '对象', width: '30%', render: (row) => row.target },
            { key: 'note', header: '说明', width: '48%', render: (row) => row.note },
          ]}
          data={actionRows}
          keyExtractor={(row) => row.account + row.action + row.target}
        />
      </div>

      {/* 异常汇总 */}
      <div className="rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">异常汇总（完整留痕）</p>
        <ul className="space-y-1.5">
          {anomalies.map((a, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
              <span className="leading-snug">{a}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
