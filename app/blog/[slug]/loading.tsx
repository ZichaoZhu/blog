export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="flex gap-6">
        {/* 左侧文件树骨架 */}
        <aside className="hidden xl:block w-64 shrink-0 animate-pulse">
          <div className="sticky top-20">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-4" />
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
              ))}
            </div>
          </div>
        </aside>

        {/* 主内容区骨架 */}
        <article className="flex-1 min-w-0 animate-pulse">
          {/* 面包屑 */}
          <div className="flex items-center gap-2 mb-6">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" />
          </div>

          {/* 文章头部 */}
          <header className="mb-8">
            {/* 元信息 */}
            <div className="flex items-center gap-2 mb-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
            </div>

            {/* 标题 */}
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-4/5 mb-6" />

            {/* 描述 */}
            <div className="space-y-2 mb-6">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            </div>

            {/* 作者信息 */}
            <div className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg mb-6">
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
              <div className="flex-1">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48" />
              </div>
            </div>

            {/* 标签 */}
            <div className="flex gap-2">
              <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-16" />
              <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-20" />
              <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-24" />
            </div>
          </header>

          {/* 文章内容骨架 */}
          <div className="space-y-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
              </div>
            ))}
          </div>
        </article>

        {/* 右侧目录骨架 */}
        <aside className="hidden xl:block w-64 shrink-0 animate-pulse">
          <div className="sticky top-20">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-12 mb-4" />
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-6 bg-gray-200 dark:bg-gray-700 rounded" />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
