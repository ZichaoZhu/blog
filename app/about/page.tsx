import { PageHero } from '@/components/PageHero';

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About"
        title="关于本站"
        subtitle="一个关于代码、学习和生活的角落"
      />

      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid gap-6 md:grid-cols-2">
          {/* 技术栈 */}
          <div className="glass-card p-7">
            <h3 className="micro-label mb-3">Stack</h3>
            <h4 className="text-xl font-bold mb-4">技术栈</h4>
            <ul className="space-y-2 text-sm text-foreground/80">
              <li>
                <strong className="font-semibold">Next.js 16</strong> · App
                Router + Server Components
              </li>
              <li>
                <strong className="font-semibold">TypeScript 5</strong> · 类型安全
              </li>
              <li>
                <strong className="font-semibold">Tailwind CSS v4</strong> + shadcn/ui
              </li>
              <li>
                <strong className="font-semibold">MDX</strong> · Markdown
                + React 组件
              </li>
              <li>
                <strong className="font-semibold">Framer Motion</strong> · 动效
              </li>
              <li>
                <strong className="font-semibold">Shiki + KaTeX</strong> ·
                代码高亮与公式
              </li>
            </ul>
          </div>

          {/* 功能特性 */}
          <div className="glass-card p-7">
            <h3 className="micro-label mb-3">Features</h3>
            <h4 className="text-xl font-bold mb-4">功能特性</h4>
            <ul className="space-y-2 text-sm text-foreground/80">
              <li>🎬 视频 Hero + 楷体装饰字</li>
              <li>📝 Typora 友好的 MDX 渲染</li>
              <li>🌓 明暗色模式 + LaTeX 论文风阅读主题</li>
              <li>📐 数学公式 · 流程图 · 代码高亮</li>
              <li>🗂️ 嵌套文件树导航 · 侧边 TOC</li>
              <li>✨ 全站点击涟漪 · 3D 玻璃卡片</li>
            </ul>
          </div>

          {/* 联系方式 */}
          <div className="glass-card p-7 md:col-span-2">
            <h3 className="micro-label mb-3">Contact</h3>
            <h4 className="text-xl font-bold mb-4">联系方式</h4>
            <p className="text-sm text-foreground/80 mb-4">
              如有问题、建议或合作,欢迎通过以下方式找到我:
            </p>
            <div className="flex flex-wrap gap-3 text-sm">
              <a
                href="https://github.com/ZichaoZhu"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-full border border-border hover:border-foreground/30 transition-colors"
              >
                GitHub
              </a>
              <a
                href="mailto:zichaozhu@example.com"
                className="px-4 py-2 rounded-full border border-border hover:border-foreground/30 transition-colors"
              >
                Email
              </a>
            </div>
          </div>

          {/* 版权 */}
          <div className="glass-card p-7 md:col-span-2">
            <h3 className="micro-label mb-3">License</h3>
            <p className="text-sm text-foreground/80">
              本站所有原创内容采用{' '}
              <a
                href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline underline-offset-2 hover:text-foreground"
              >
                CC BY-NC-SA 4.0
              </a>{' '}
              许可协议。转载请保留署名,并以相同协议共享。
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
