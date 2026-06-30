'use client'

export function CollectionConfig() {
  return (
    <div className="bg-white rounded-xl p-4">
      <h3 className="font-semibold text-gray-900 mb-4">采集配置</h3>
      <div className="grid grid-cols-3 gap-6">
        {/* 每日采集次数 */}
        <div>
          <label className="block text-sm text-gray-500 mb-3">每日采集次数</label>
          <div className="flex gap-1.5 bg-gray-50 p-1 rounded-lg">
            {['1次', '2次', '3次'].map((opt) => (
              <button
                key={opt}
                className="flex-1 px-3 py-2 text-sm rounded-lg transition-colors bg-white shadow-sm text-blue-600 font-medium"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* 采集时间 */}
        <div>
          <label className="block text-sm text-gray-500 mb-3">采集时间</label>
          <div className="flex flex-wrap gap-1.5">
            {['08:00', '12:00', '18:00'].map((t) => (
              <button
                key={t}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
              >
                {t}
              </button>
            ))}
            <button className="px-3 py-2 text-sm border border-dashed border-gray-300 rounded-lg text-gray-400 hover:border-blue-400 hover:text-blue-600 transition-all">
              +自定义
            </button>
          </div>
        </div>

        {/* 数据保留 */}
        <div>
          <label className="block text-sm text-gray-500 mb-3">数据保留天数</label>
          <div className="flex gap-1.5 bg-gray-50 p-1 rounded-lg">
            {['30天', '60天', '90天'].map((opt) => (
              <button
                key={opt}
                className="flex-1 px-3 py-2 text-sm rounded-lg transition-colors bg-white shadow-sm text-blue-600 font-medium"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
