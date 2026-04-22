import type { ReactNode } from 'react'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type InspectorFieldGroupProps = {
  label?: ReactNode
  description?: ReactNode
  action?: ReactNode
  children?: ReactNode
  className?: string
  contentClassName?: string
  compact?: boolean
}

export const InspectorFieldGroup = ({
  label,
  description,
  action,
  children,
  className,
  contentClassName,
  compact = false,
}: InspectorFieldGroupProps) => (
  <Card
    size="sm"
    className={cn('border border-border/70 bg-background/70', className)}
  >
    <CardContent
      className={cn(
        compact ? 'py-0' : 'space-y-3',
        contentClassName,
      )}
    >
      {label || action ? (
        <div
          className={cn(
            'flex justify-between gap-3',
            compact ? 'min-h-14 items-center' : 'items-start',
          )}
        >
          <div className="min-w-0">
            {label}
            {description ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </CardContent>
  </Card>
)
