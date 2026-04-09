// 注意:纯 CSS 入场动画(见 globals.css 里的 @keyframes page-fade-in)。
// 不再使用 framer-motion,避免把每篇文章页都拉进客户端 bundle。
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-fade-in">{children}</div>;
}
