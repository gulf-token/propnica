'use client';

import * as React from 'react';
import { useProjectStore, useEditorStore } from '@/stores';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Slider,
} from '@/components/ui';

// ===========================================
// Icons
// ===========================================

function PlayIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
    >
      <path d="M8 5.14v14l11-7-11-7z" />
    </svg>
  );
}

function PauseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
    >
      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
    </svg>
  );
}

function SkipBackIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <polygon points="19 20 9 12 19 4 19 20" />
      <line x1="5" x2="5" y1="19" y2="5" />
    </svg>
  );
}

function SkipForwardIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <polygon points="5 4 15 12 5 20 5 4" />
      <line x1="19" x2="19" y1="5" y2="19" />
    </svg>
  );
}

function MaximiseIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

function VolumeIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

// ===========================================
// Preview Modal Props
// ===========================================

interface PreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ===========================================
// Preview Modal Component
// ===========================================

export function PreviewModal({ open, onOpenChange }: PreviewModalProps) {
  const config = useProjectStore((state) => state.config);
  const projectName = useProjectStore((state) => state.projectName);
  const isPlaying = useEditorStore((state) => state.isPlaying);
  const play = useEditorStore((state) => state.play);
  const pause = useEditorStore((state) => state.pause);
  const currentTime = useEditorStore((state) => state.currentTime);
  const setCurrentTime = useEditorStore((state) => state.setCurrentTime);

  const [volume, setVolume] = React.useState(80);
  const [duration, setDuration] = React.useState(0);
  const animationRef = React.useRef<number | null>(null);
  const startTimeRef = React.useRef<number>(0);
  const pausedTimeRef = React.useRef<number>(0);

  // Calculate total duration from keyframes
  React.useEffect(() => {
    if (config?.keyframes && config.keyframes.length > 0) {
      const keyframes = config.keyframes;
      const maxTime = Math.max(...keyframes.map((kf: { time: number; duration?: number }) => kf.time + (kf.duration || 0)));
      setDuration(maxTime);
    }
  }, [config]);

  // Animation loop
  React.useEffect(() => {
    if (!isPlaying || !open) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    startTimeRef.current = performance.now() - pausedTimeRef.current;

    const animate = () => {
      const elapsed = performance.now() - startTimeRef.current;
      const newTime = Math.min(elapsed, duration);

      setCurrentTime(newTime);

      if (newTime >= duration) {
        pause();
        pausedTimeRef.current = 0;
      } else {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, open, duration, setCurrentTime, pause]);

  // Reset when modal closes
  React.useEffect(() => {
    if (!open) {
      pause();
      setCurrentTime(0);
      pausedTimeRef.current = 0;
    }
  }, [open, pause, setCurrentTime]);

  const handlePlayPause = () => {
    if (isPlaying) {
      pausedTimeRef.current = performance.now() - startTimeRef.current;
      pause();
    } else {
      play();
    }
  };

  const handleSeek = (value: number[]) => {
    const newTime = value[0];
    setCurrentTime(newTime);
    pausedTimeRef.current = newTime;
    if (isPlaying) {
      startTimeRef.current = performance.now() - newTime;
    }
  };

  const handleSkipBack = () => {
    setCurrentTime(0);
    pausedTimeRef.current = 0;
    if (isPlaying) {
      startTimeRef.current = performance.now();
    }
  };

  const handleSkipForward = () => {
    setCurrentTime(duration);
    pausedTimeRef.current = duration;
    pause();
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>Preview: {projectName || 'Untitled Project'}</DialogTitle>
        </DialogHeader>

        <div className="p-4">
          {/* Preview Canvas */}
          <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
            {/* Map preview would be rendered here */}
            <div className="w-full h-full flex items-center justify-center text-white/50">
              <div className="text-center">
                <p className="text-lg mb-2">Map Preview</p>
                <p className="text-sm">
                  Current time: {formatTime(currentTime)}
                </p>
              </div>
            </div>

            {/* Play button overlay when paused */}
            {!isPlaying && (
              <button
                onClick={handlePlayPause}
                className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
              >
                <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center">
                  <PlayIcon className="h-10 w-10 text-black ml-1" />
                </div>
              </button>
            )}
          </div>

          {/* Controls */}
          <div className="mt-4 space-y-3">
            {/* Timeline scrubber */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground w-16">
                {formatTime(currentTime)}
              </span>
              <Slider
                value={[currentTime]}
                max={duration || 10000}
                step={10}
                onValueChange={handleSeek}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground w-16 text-right">
                {formatTime(duration)}
              </span>
            </div>

            {/* Transport controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSkipBack}
                >
                  <SkipBackIcon className="h-5 w-5" />
                </Button>

                <Button
                  variant="default"
                  size="icon"
                  className="h-12 w-12 rounded-full"
                  onClick={handlePlayPause}
                >
                  {isPlaying ? (
                    <PauseIcon className="h-6 w-6" />
                  ) : (
                    <PlayIcon className="h-6 w-6 ml-0.5" />
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSkipForward}
                >
                  <SkipForwardIcon className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex items-center gap-4">
                {/* Volume control */}
                <div className="flex items-center gap-2">
                  <VolumeIcon className="h-4 w-4 text-muted-foreground" />
                  <Slider
                    value={[volume]}
                    max={100}
                    step={1}
                    onValueChange={(v) => setVolume(v[0])}
                    className="w-24"
                  />
                </div>

                {/* Fullscreen button */}
                <Button variant="ghost" size="icon">
                  <MaximiseIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PreviewModal;
