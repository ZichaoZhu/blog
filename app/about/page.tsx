import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { PageHero } from '@/components/PageHero';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '关于',
  description: '关于世界は優しい：一处持续整理研究、阅读与学习过程的个人笔记空间。',
  alternates: { canonical: '/about' },
  openGraph: {
    title: '关于',
    description: '一处持续整理研究、阅读与学习过程的个人笔记空间。',
    url: '/about',
  },
};

const NOTE_SECTIONS = [
  { href: '/blog?folder=Reaserch_Note', label: '科研日志' },
  { href: '/blog?folder=Paper-Reading', label: '论文阅读' },
  { href: '/blog?folder=Coure-Notebook', label: '课程笔记' },
  { href: '/blog?folder=Language', label: '语言学习' },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About"
        title="关于这个网站"
        subtitle="一处持续整理研究、阅读与学习过程的个人笔记空间。"
      />

      <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
        <section className="grid gap-5 border-b border-border pb-12 md:grid-cols-[10rem_minmax(0,1fr)] md:gap-10">
          <h2 className="text-lg font-semibold">本站内容</h2>
          <div className="space-y-5 text-[1.02rem] leading-8 text-foreground/82">
            <p>
              这里主要收录科研过程记录、论文阅读摘要、大学课程笔记，以及语言学习材料。文章保留笔记本身的结构，方便日后检索、修订和相互参照。
            </p>
            <p>
              内容按真实目录持续更新；本站不将学习笔记包装成正式论文，也不展示尚不存在的出版物、机构或职位信息。
            </p>
            <Link
              href="/authors/zhuzichao"
              className="academic-text-link inline-flex items-center gap-1.5 text-sm"
            >
              查看作者与全部文章
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          </div>
        </section>

        <section className="grid gap-5 border-b border-border py-12 md:grid-cols-[10rem_minmax(0,1fr)] md:gap-10">
          <h2 className="text-lg font-semibold">笔记目录</h2>
          <ul className="grid border-t border-border sm:grid-cols-2">
            {NOTE_SECTIONS.map((section) => (
              <li key={section.href}>
                <Link
                  href={section.href}
                  className="flex items-center justify-between border-b border-border py-4 text-sm font-medium hover:text-[var(--academic-link)] sm:pr-6"
                >
                  {section.label}
                  <ArrowUpRight className="size-4 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="grid gap-5 border-b border-border py-12 md:grid-cols-[10rem_minmax(0,1fr)] md:gap-10">
          <h2 className="text-lg font-semibold">写作与呈现</h2>
          <div className="space-y-4 text-sm leading-7 text-foreground/78">
            <p>
              内容使用 Markdown 管理，并尽量兼容 Typora 的日常写作方式。公式、代码、表格、流程图、脚注与提示块均以服务阅读为首要目标。
            </p>
            <p className="text-muted-foreground">
              网站由 Next.js 构建；技术实现保持在背景中，页面重点始终是笔记本身。
            </p>
          </div>
        </section>

        <section className="grid gap-5 py-12 md:grid-cols-[10rem_minmax(0,1fr)] md:gap-10">
          <h2 className="text-lg font-semibold">联系与许可</h2>
          <div className="space-y-5 text-sm leading-7 text-foreground/78">
            <p>
              可以通过{' '}
              <a
                href="https://github.com/ZichaoZhu"
                target="_blank"
                rel="noopener noreferrer"
                className="academic-text-link"
              >
                GitHub
              </a>{' '}
              查看相关项目或提出建议。未配置公开邮箱，因此本站不展示占位联系方式。
            </p>
            <p>
              原创内容采用{' '}
              <a
                href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
                target="_blank"
                rel="noopener noreferrer"
                className="academic-text-link"
              >
                CC BY-NC-SA 4.0
              </a>{' '}
              许可；转载时请保留署名，并以相同协议共享。
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
