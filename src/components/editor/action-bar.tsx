import { Download } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

type ActionBarProps = {
  isBusy: boolean
  onGenerateVideo: () => void
}

export const ActionBar = ({
  isBusy,
  onGenerateVideo,
}: ActionBarProps) => (
  <Card className="border-border/70 bg-card/75 shadow-lg shadow-black/20 backdrop-blur-md">
    <CardContent className="p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={onGenerateVideo} disabled={isBusy}>
          <Download className="size-4" />
          Generate Video
        </Button>
      </div>
    </CardContent>
  </Card>
)
