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
  <Card className="border-white/60 bg-card/75 shadow-[0_20px_70px_-50px_rgba(15,23,42,0.8)] backdrop-blur-md">
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
