import type { ReactNode } from 'react'

import { CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type EditorCardHeaderProps = {
  eyebrow?: string
  title: string
  action?: ReactNode
  className?: string
  titleRowClassName?: string
  titleClassName?: string
  withDivider?: boolean
}

export const EditorCardHeader = ({
  eyebrow,
  title,
  action,
  className,
  titleRowClassName,
  titleClassName,
  withDivider = true,
}: EditorCardHeaderProps) => (
  <CardHeader className={cn('gap-2 pb-4', withDivider && 'border-b border-border/70', className)}>
    {eyebrow ? (
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
        {eyebrow}
      </p>
    ) : null}
    <div className={cn('flex items-center justify-between gap-3', titleRowClassName)}>
      <CardTitle className={cn('font-heading text-2xl', titleClassName)}>
        {title}
      </CardTitle>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  </CardHeader>
)
