import type { ReactNode } from 'react';
import {
  Pencil,
  Lightbulb,
  Info,
  ClipboardList,
  CheckCircle2,
  HelpCircle,
  AlertTriangle,
  Zap,
  Bug,
  List,
  Quote,
  CheckSquare,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';

type CalloutType =
  | 'note'
  | 'tip'
  | 'info'
  | 'abstract'
  | 'success'
  | 'question'
  | 'warning'
  | 'danger'
  | 'bug'
  | 'example'
  | 'quote'
  | 'todo';

interface CalloutConfig {
  icon: LucideIcon;
  label: string;
}

// 类型别名 → 规范化类型
const TYPE_ALIASES: Record<string, CalloutType> = {
  note: 'note',
  tip: 'tip',
  hint: 'tip',
  info: 'info',
  abstract: 'abstract',
  summary: 'abstract',
  tldr: 'abstract',
  success: 'success',
  check: 'success',
  done: 'success',
  question: 'question',
  help: 'question',
  faq: 'question',
  warning: 'warning',
  attention: 'warning',
  caution: 'warning',
  danger: 'danger',
  error: 'danger',
  bug: 'bug',
  example: 'example',
  quote: 'quote',
  cite: 'quote',
  todo: 'todo',
};

const CALLOUT_CONFIG: Record<CalloutType, CalloutConfig> = {
  note: { icon: Pencil, label: 'Note' },
  tip: { icon: Lightbulb, label: 'Tip' },
  info: { icon: Info, label: 'Info' },
  abstract: { icon: ClipboardList, label: 'Abstract' },
  success: { icon: CheckCircle2, label: 'Success' },
  question: { icon: HelpCircle, label: 'Question' },
  warning: { icon: AlertTriangle, label: 'Warning' },
  danger: { icon: Zap, label: 'Danger' },
  bug: { icon: Bug, label: 'Bug' },
  example: { icon: List, label: 'Example' },
  quote: { icon: Quote, label: 'Quote' },
  todo: { icon: CheckSquare, label: 'Todo' },
};

export function resolveCalloutType(raw: string): CalloutType {
  return TYPE_ALIASES[raw.toLowerCase()] ?? 'note';
}

interface CalloutProps {
  type?: string;
  title?: string;
  collapsible?: boolean | string;
  defaultOpen?: boolean | string;
  children?: ReactNode;
}

/**
 * Obsidian 风格 callout / admonition 组件。
 * 可折叠版本使用原生 <details> 元素,免 JS 切换,SSR 和 a11y 友好。
 */
export function Callout({
  type = 'note',
  title,
  collapsible,
  defaultOpen,
  children,
}: CalloutProps) {
  const resolvedType = resolveCalloutType(type);
  const config = CALLOUT_CONFIG[resolvedType];
  const Icon = config.icon;
  const displayTitle = title?.trim() || config.label;

  // 字符串属性来自 remark AST,需要转 boolean
  const isCollapsible = collapsible === true || collapsible === 'true';
  const isDefaultOpen = defaultOpen === true || defaultOpen === 'true';

  const header = (
    <>
      <Icon className="callout-icon" aria-hidden="true" />
      <span className="callout-title">{displayTitle}</span>
      {isCollapsible && (
        <ChevronDown className="callout-chevron" aria-hidden="true" />
      )}
    </>
  );

  // `not-prose` 让 @tailwindcss/typography 完全不管 callout 内部,
  // 避免 prose 规则(比如 h2/h3/li 的巨大 margin)干扰头部布局。
  const wrapperClass = `not-prose callout callout-${resolvedType}`;

  if (isCollapsible) {
    return (
      <details className={wrapperClass} open={isDefaultOpen}>
        <summary className="callout-summary">
          <div className="callout-header">{header}</div>
        </summary>
        <div className="callout-body">{children}</div>
      </details>
    );
  }

  return (
    <div className={wrapperClass}>
      <div className="callout-header">{header}</div>
      <div className="callout-body">{children}</div>
    </div>
  );
}
