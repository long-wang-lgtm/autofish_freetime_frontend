'use client'

import { useAuth } from '@/stores/auth.store'

export default function DashboardPage() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">仪表板</h1>
        <p className="mt-2 text-gray-600">
          欢迎回来，{user?.username}！这里是您的闲鱼自动化管理后台。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 统计卡片 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900">账号数量</h3>
          <p className="mt-2 text-3xl font-bold text-blue-600">0</p>
          <p className="mt-1 text-sm text-gray-500">已关联的闲鱼账号</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900">在售商品</h3>
          <p className="mt-2 text-3xl font-bold text-green-600">0</p>
          <p className="mt-1 text-sm text-gray-500">所有账号在售商品总数</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900">待处理订单</h3>
          <p className="mt-2 text-3xl font-bold text-orange-600">0</p>
          <p className="mt-1 text-sm text-gray-500">需要处理的订单</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900">系统提示</h2>
        <p className="mt-2 text-gray-600">
          第一阶段已完成用户认证系统。接下来您可以：
        </p>
        <ul className="mt-2 list-disc list-inside text-gray-600 space-y-1">
          <li>在账号管理页面添加闲鱼账号</li>
          <li>配置商品的自动回复规则</li>
          <li>设置自动发货内容</li>
          <li>查看消息记录和订单状态</li>
        </ul>
        <p className="mt-4 text-sm text-gray-500">
          提示：这些功能将在后续版本中逐步上线。
        </p>
      </div>
    </div>
  )
}