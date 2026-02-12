export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="flex gap-6">
        {/* 左侧文件树骨架 */}
        <aside className="hidden lg:block w-64 flex-shrink-0 animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-4" />
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-1">
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            ))}
          </div>
        </aside>

        {/* 主内容区骨架 */}
        <div className="flex-1 min-w-0 animate-pulse">
          {/* 头部操作栏 */}
          <div className="flex justify-between items-center mb-8">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32" />
            <div className="flex gap-2">
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32" />
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24" />
            </div>
          </div>

          {/* 文章列表骨架 */}
          <div className="space-y-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                {/* 标题 */}
                <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
                
                {/* 元信息 */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
                </div>

                {/* 描述 */}
                <div className="space-y-2 mb-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
                </div>

                {/* 标签 */}
                <div className="flex gap-2">
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16" />
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20" />
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
