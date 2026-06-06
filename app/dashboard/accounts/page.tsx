"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { listAccounts, startAccountIm, stopAccountIm } from "@/lib/api/accounts"
import { AccountRow } from "@/components/accounts/AccountTable"
import { AccountForm } from "@/components/accounts/AccountForm"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import QrLoginModal from "@/components/accounts/QrLoginModal"
import LinkLoginModal from "@/components/accounts/LinkLoginModal"
import LinkManagement from "@/components/accounts/LinkManagement"
import { useToast } from "@/components/ui/toaster"

export default function AccountsPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [showAddForm, setShowAddForm] = useState(false)
  const [showQrModal, setShowQrModal] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [showLinkManage, setShowLinkManage] = useState(false)
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [reloginUid, setReloginUid] = useState<string | null>(null)
  const [bulkLoading, setBulkLoading] = useState<"start" | "stop" | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ["accounts"],
    queryFn: listAccounts,
    refetchInterval: 30000,
  })

  const handleFormSuccess = () => {
    setShowAddForm(false)
  }

  const handleFormClose = () => {
    setShowAddForm(false)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">账号管理</h1>
        <p className="text-sm text-gray-500 mt-1">
          管理您的闲鱼账号，配置自动回复和自动发货功能
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <button
            onClick={() => setAddMenuOpen(!addMenuOpen)}
            className="group flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            添加账号
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${addMenuOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {addMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setAddMenuOpen(false)}
              />
              <div className="absolute left-0 mt-2 w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-20 animate-in fade-in slide-in-from-top-1 duration-200">
                <button
                  onClick={() => {
                    setShowQrModal(true)
                    setAddMenuOpen(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 hover:text-green-700 transition-colors rounded-lg mx-1"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="font-medium">扫码登录</div>
                    <div className="text-xs text-gray-400">自动获取账号信息</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setShowLinkModal(true)
                    setAddMenuOpen(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-fuchsia-50 hover:text-purple-700 transition-colors rounded-lg mx-1"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="font-medium">链接登录</div>
                    <div className="text-xs text-gray-400">分享给他人扫码</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(true)
                    setAddMenuOpen(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-700 transition-colors rounded-lg mx-1"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="font-medium">手动输入</div>
                    <div className="text-xs text-gray-400">填写账号详细信息</div>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>

        {/* 链接管理按钮 */}
        <button
          onClick={() => setShowLinkManage(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white text-sm font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          链接管理
        </button>

      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          加载账号列表失败: {String(error)}
        </div>
      )}

      {!isLoading && !error && data?.accounts.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <svg
            className="w-12 h-12 mx-auto text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-1">暂无账号</h3>
          <p className="text-sm text-gray-500 mb-4">
            添加您的第一个闲鱼账号开始自动化管理
          </p>
          <button
            onClick={() => setAddMenuOpen(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
          >
            添加账号
          </button>
        </div>
      )}

      {!isLoading && !error && data && data.accounts.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-100 border-b border-gray-200 text-sm font-medium text-gray-600">
            <div className="col-span-1">账号信息</div>
            <div className="col-span-1 text-center">状态</div>
            {/* <div className="col-span-1 text-center">IM</div> */}
            <div className="col-span-1 text-center">商品数量</div>
            <div className="col-span-1 text-center">自动免拼</div>
            <div className="col-span-1 text-center">自动发货</div>
            <div className="col-span-1 text-center">自动回复</div>
            <div className="col-span-1 text-center">AI回复</div>
            <div className="col-span-1 text-center">自动评价</div>
            <div className="col-span-1 text-center">自动通知</div>
            <div className="col-span-1 text-center">AI提示词</div>
            <div className="col-span-1 text-center">默认回复</div>
            <div className="col-span-1 text-center">重新登录</div>
          </div>

          {data.accounts.map((account, index) => (
            <AccountRow
              key={account.uid}
              account={account}
              index={index}
              onRelogin={(uid) => setReloginUid(uid)}
            />
          ))}
        </div>
      )}

      {showAddForm && (
        <AccountForm
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}

      <QrLoginModal
        open={showQrModal || reloginUid !== null}
        onClose={() => {
          setShowQrModal(false)
          setReloginUid(null)
        }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["accounts"] })
          setReloginUid(null)
        }}
        uid={reloginUid || undefined}
      />

      <LinkLoginModal
        open={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["accounts"] })
        }}
      />

      <LinkManagement
        open={showLinkManage}
        onClose={() => setShowLinkManage(false)}
      />
    </div>
  )
}
