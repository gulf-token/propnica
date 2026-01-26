// @ts-nocheck
// TODO: Fix tRPC v11 + React Query v5 query options typing
'use client';

import * as React from 'react';
import { trpc } from '@/lib/trpc';
import { useProjectStore } from '@/stores';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Progress,
  Separator,
} from '@/components/ui';

// ===========================================
// Icons
// ===========================================

function DownloadIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  );
}

function CheckCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function AlertCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}

function LoaderIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="18" x2="6" y1="6" y2="18" />
      <line x1="6" x2="18" y1="6" y2="18" />
    </svg>
  );
}

// ===========================================
// Types
// ===========================================

type Resolution = '720p' | '1080p' | '4k';
type Format = 'mp4' | 'webm' | 'gif';
type RenderStatus = 'idle' | 'queued' | 'processing' | 'completed' | 'failed';

interface RenderSettings {
  resolution: Resolution;
  format: Format;
  fps: number;
  quality: number;
}

// ===========================================
// Render Modal Props
// ===========================================

interface RenderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

// ===========================================
// Resolution Options
// ===========================================

const RESOLUTIONS: { value: Resolution; label: string; width: number; height: number }[] = [
  { value: '720p', label: '720p (HD)', width: 1280, height: 720 },
  { value: '1080p', label: '1080p (Full HD)', width: 1920, height: 1080 },
  { value: '4k', label: '4K (Ultra HD)', width: 3840, height: 2160 },
];

const FORMATS: { value: Format; label: string; description: string }[] = [
  { value: 'mp4', label: 'MP4', description: 'Best compatibility' },
  { value: 'webm', label: 'WebM', description: 'Web optimised' },
  { value: 'gif', label: 'GIF', description: 'Animated image' },
];

const FPS_OPTIONS = [24, 30, 60];

// ===========================================
// Render Modal Component
// ===========================================

export function RenderModal({ open, onOpenChange, projectId }: RenderModalProps) {
  const config = useProjectStore((state) => state.config);

  // Settings state
  const [settings, setSettings] = React.useState<RenderSettings>({
    resolution: '1080p',
    format: 'mp4',
    fps: 30,
    quality: 80,
  });

  // Render state
  const [status, setStatus] = React.useState<RenderStatus>('idle');
  const [progress, setProgress] = React.useState(0);
  const [renderId, setRenderId] = React.useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // tRPC mutations
  const startRender = trpc.renders.create.useMutation({
    onSuccess: (data) => {
      setRenderId(data.id);
      setStatus('queued');
    },
    onError: (err) => {
      setError(err.message);
      setStatus('failed');
    },
  });

  const cancelRender = trpc.renders.cancel.useMutation({
    onSuccess: () => {
      setStatus('failed');
      setError('Cancelled by user');
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  // Poll for render status
  const shouldPoll = !!renderId && (status === 'queued' || status === 'processing');
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - tRPC v11 + React Query v5 typing issue with query options
  const { data: renderStatus } = trpc.renders.get.useQuery(
    { id: renderId ?? '' },
    {
      enabled: shouldPoll,
      refetchInterval: shouldPoll ? 2000 : false,
    }
  );

  // Update status when polling
  React.useEffect(() => {
    if (renderStatus) {
      if (renderStatus.status === 'PROCESSING') {
        setStatus('processing');
        setProgress(renderStatus.progress || 0);
      } else if (renderStatus.status === 'COMPLETE') {
        setStatus('completed');
        setProgress(100);
        setDownloadUrl(renderStatus.outputUrl || null);
      } else if (renderStatus.status === 'FAILED') {
        setStatus('failed');
        setError(renderStatus.errorMessage || 'Render failed');
      }
    }
  }, [renderStatus]);

  // Reset state when modal closes
  React.useEffect(() => {
    if (!open) {
      setStatus('idle');
      setProgress(0);
      setRenderId(null);
      setDownloadUrl(null);
      setError(null);
    }
  }, [open]);

  const handleStartRender = () => {
    startRender.mutate({
      projectId,
      resolution: settings.resolution,
    });
  };

  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
    }
  };

  const handleCancelRender = () => {
    if (renderId) {
      cancelRender.mutate({ id: renderId });
    }
  };

  const estimatedTime = React.useMemo(() => {
    if (!config?.keyframes || config.keyframes.length === 0) return '~1 minute';

    const duration = Math.max(
      ...config.keyframes.map((kf: { time: number; duration?: number }) => kf.time + (kf.duration || 0))
    );
    const durationSeconds = duration / 1000;
    const multiplier = settings.resolution === '4k' ? 3 : settings.resolution === '1080p' ? 1.5 : 1;
    const estimatedMinutes = Math.ceil((durationSeconds * multiplier) / 60);

    return `~${estimatedMinutes} minute${estimatedMinutes > 1 ? 's' : ''}`;
  }, [config, settings.resolution]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export Video</DialogTitle>
          <DialogDescription>
            Configure your video settings and start rendering.
          </DialogDescription>
        </DialogHeader>

        {status === 'idle' ? (
          <>
            <div className="space-y-4 py-4">
              {/* Resolution */}
              <div className="space-y-2">
                <Label>Resolution</Label>
                <Select
                  value={settings.resolution}
                  onValueChange={(value: Resolution) =>
                    setSettings({ ...settings, resolution: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOLUTIONS.map((res) => (
                      <SelectItem key={res.value} value={res.value}>
                        {res.label} ({res.width}x{res.height})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Format */}
              <div className="space-y-2">
                <Label>Format</Label>
                <Select
                  value={settings.format}
                  onValueChange={(value: Format) =>
                    setSettings({ ...settings, format: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMATS.map((fmt) => (
                      <SelectItem key={fmt.value} value={fmt.value}>
                        <div className="flex flex-col">
                          <span>{fmt.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {fmt.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Frame Rate */}
              <div className="space-y-2">
                <Label>Frame Rate</Label>
                <Select
                  value={settings.fps.toString()}
                  onValueChange={(value) =>
                    setSettings({ ...settings, fps: parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FPS_OPTIONS.map((fps) => (
                      <SelectItem key={fps} value={fps.toString()}>
                        {fps} fps
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Estimated time */}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Estimated render time</span>
                <span className="font-medium">{estimatedTime}</span>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleStartRender} disabled={startRender.isPending}>
                {startRender.isPending ? (
                  <>
                    <LoaderIcon className="h-4 w-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  'Start Render'
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="py-8">
            {/* Render Progress */}
            {(status === 'queued' || status === 'processing') && (
              <div className="space-y-4 text-center">
                <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <LoaderIcon className="h-8 w-8 text-primary animate-spin" />
                </div>
                <div>
                  <h3 className="font-medium">
                    {status === 'queued' ? 'Queued' : 'Rendering...'}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {status === 'queued'
                      ? 'Your video is in the queue'
                      : `${Math.round(progress)}% complete`}
                  </p>
                </div>
                {status === 'processing' && (
                  <Progress value={progress} className="w-full" />
                )}
                <Button
                  variant="outline"
                  onClick={handleCancelRender}
                  disabled={cancelRender.isPending}
                  className="w-full"
                >
                  {cancelRender.isPending ? (
                    <>
                      <LoaderIcon className="h-4 w-4 mr-2 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    <>
                      <XIcon className="h-4 w-4 mr-2" />
                      Cancel Render
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Render Complete */}
            {status === 'completed' && (
              <div className="space-y-4 text-center">
                <div className="h-16 w-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircleIcon className="h-8 w-8 text-green-500" />
                </div>
                <div>
                  <h3 className="font-medium">Render Complete</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your video is ready to download
                  </p>
                </div>
                <Button onClick={handleDownload} className="w-full">
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  Download Video
                </Button>
              </div>
            )}

            {/* Render Failed */}
            {status === 'failed' && (
              <div className="space-y-4 text-center">
                <div className="h-16 w-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertCircleIcon className="h-8 w-8 text-destructive" />
                </div>
                <div>
                  <h3 className="font-medium">Render Failed</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {error || 'An error occurred during rendering'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setStatus('idle')}
                    className="flex-1"
                  >
                    Try Again
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="flex-1"
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default RenderModal;
