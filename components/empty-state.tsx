import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LucideIcon } from 'lucide-react'

interface EmptyStateAction {
  label: string
  href?: string
  onClick?: () => void
  variant?: 'default' | 'outline' | 'ghost'
}

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: EmptyStateAction
  secondaryAction?: EmptyStateAction
  hint?: string
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  hint,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`text-center py-10 ${className}`}>
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/70 empty-state-icon">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>

      <h3 className="text-xl font-semibold tracking-tight mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6 leading-relaxed">{description}</p>

      {hint && (
        <p className="text-xs text-muted-foreground/80 mb-6 max-w-xs mx-auto">{hint}</p>
      )}

      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {action && (
            action.href ? (
              <Button asChild variant={action.variant || 'default'}>
                <Link href={action.href}>{action.label}</Link>
              </Button>
            ) : (
              <Button variant={action.variant || 'default'} onClick={action.onClick}>
                {action.label}
              </Button>
            )
          )}
          {secondaryAction && (
            secondaryAction.href ? (
              <Button asChild variant={secondaryAction.variant || 'outline'}>
                <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
              </Button>
            ) : (
              <Button variant={secondaryAction.variant || 'outline'} onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            )
          )}
        </div>
      )}
    </div>
  )
}
