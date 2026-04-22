import { Toaster as Sonner, type ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => (
  <Sonner
    position="bottom-center"
    expand
    richColors
    toastOptions={{
      classNames: {
        toast:
          'group border-border/70 bg-card text-card-foreground shadow-lg backdrop-blur-md',
        title: 'text-sm font-medium',
        description: 'text-sm text-muted-foreground',
        actionButton: 'bg-primary text-primary-foreground',
        cancelButton: 'bg-muted text-muted-foreground',
      },
    }}
    {...props}
  />
)

export { Toaster }
