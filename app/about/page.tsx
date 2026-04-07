export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-4xl font-bold mb-8">关于本站</h1>
      
      <div className="prose dark:prose-invert max-w-none">
        <h2>技术栈</h2>
        <p>
          本站基于以下技术构建：
        </p>
        <ul>
          <li><strong>Next.js</strong> - 使用 App Router 和 Server Components</li>
          <li><strong>TypeScript</strong> - 类型安全的开发体验</li>
          <li><strong>Tailwind CSS</strong> - 现代化的样式方案</li>
          <li><strong>MDX</strong> - 支持在 Markdown 中使用 React 组件</li>
          <li><strong>Framer Motion</strong> - 流畅的动画效果</li>
          <li><strong>Pagefind</strong> - 静态全文搜索</li>
        </ul>

        <h2>功能特性</h2>
        <ul>
          <li>🎨 精美的首页动画（渐变背景 + 视差滚动 + 打字效果 + 粒子特效）</li>
          <li>📝 支持 Markdown/MDX 文章撰写</li>
          <li>🔍 全文搜索功能</li>
          <li>🌓 暗黑模式切换</li>
          <li>📱 响应式设计，完美适配移动端</li>
          <li>👥 多作者支持</li>
          <li>🏷️ 文章分类和标签系统</li>
          <li>🎯 列表/卡片视图切换</li>
          <li>⚡ 静态生成，极致性能</li>
        </ul>

        <h2>联系方式</h2>
        <p>
          如有问题或建议，欢迎通过以下方式联系我：
        </p>
        <ul>
          <li>Email: your-email@example.com</li>
          <li>GitHub: https://github.com/your-username</li>
        </ul>

        <h2>版权说明</h2>
        <p>
          本站所有原创内容采用 <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-NC-SA 4.0</a> 许可协议。
        </p>
      </div>
    </div>
  );
}
