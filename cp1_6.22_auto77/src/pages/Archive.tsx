import { useStore } from '@/store'

export default function Archive() {
  const archives = useStore((s) => s.archives)

  const sorted = [...archives].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#2d3748] mb-6">归档数据</h1>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#718096]">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4 text-2xl">
            📦
          </div>
          <p className="text-base mb-1">暂无归档数据</p>
          <p className="text-sm">旧数据归档后将在此显示</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-auto max-h-[calc(100vh-200px)]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 z-10">
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-medium text-[#2d3748]">项目名</th>
                  <th className="text-left px-4 py-3 font-medium text-[#2d3748]">日期</th>
                  <th className="text-left px-4 py-3 font-medium text-[#2d3748]">子任务</th>
                  <th className="text-left px-4 py-3 font-medium text-[#2d3748]">耗时</th>
                  <th className="text-left px-4 py-3 font-medium text-[#2d3748]">标签</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((entry, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-[#2d3748]">{entry.projectName}</td>
                    <td className="px-4 py-3 text-[#718096]">{entry.date}</td>
                    <td className="px-4 py-3 text-[#2d3748]">{entry.subtaskName}</td>
                    <td className="px-4 py-3 text-[#718096]">
                      {(entry.duration / 60).toFixed(1)}h ({entry.duration}min)
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {entry.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-[#718096]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
