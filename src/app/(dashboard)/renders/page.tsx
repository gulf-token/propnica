'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Download,
  Play,
  Trash2,
  Clock,
  Video,
  Loader2,
  AlertCircle,
  MoreHorizontal,
  RefreshCw,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { formatRelativeTime, formatDuration } from '@/lib/utils';
import {
  Button,
  Card,
  CardContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Progress,
} from '@/components/ui';

// ===========================================
// Renders Page
// ===========================================

export default function RendersPage() {
  // Fetch renders
  const {
    data: renders,
    isLoading,
    refetch,
  } = trpc.renders.list.useQuery({
    limit: 50,
  });

  // Delete mutation
  const deleteRender = trpc.renders.delete.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this render?')) {
      deleteRender.mutate({ id });
    }
  };

  // Group renders by status
  const inProgress = renders?.filter(
    (r) => r.status === 'PENDING' || r.status === 'PROCESSING'
  );
  const completed = renders?.filter((r) => r.status === 'COMPLETED');
  const failed = renders?.filter((r) => r.status === 'FAILED');

  return (
    <div className="container py-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Renders</h1>
          <p className="text-muted-foreground mt-1">
            View and manage your video renders
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-24 bg-muted animate-pulse rounded-lg"
            />
          ))}
        </div>
      ) : renders && renders.length > 0 ? (
        <div className="space-y-8">
          {/* In Progress */}
          {inProgress && inProgress.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-yellow-500" />
                In Progress ({inProgress.length})
              </h2>
              <div className="space-y-3">
                {inProgress.map((render) => (
                  <RenderCard
                    key={render.id}
                    render={render}
                    onDelete={() => handleDelete(render.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Completed */}
          {completed && completed.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Video className="w-5 h-5 text-green-500" />
                Completed ({completed.length})
              </h2>
              <div className="space-y-3">
                {completed.map((render) => (
                  <RenderCard
                    key={render.id}
                    render={render}
                    onDelete={() => handleDelete(render.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Failed */}
          {failed && failed.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-destructive" />
                Failed ({failed.length})
              </h2>
              <div className="space-y-3">
                {failed.map((render) => (
                  <RenderCard
                    key={render.id}
                    render={render}
                    onDelete={() => handleDelete(render.id)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Video className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No renders yet</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              Export a project to create your first video render.
            </p>
            <Link href="/projects">
              <Button>Go to Projects</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ===========================================
// Render Card Component
// ===========================================

interface RenderCardProps {
  render: {
    id: string;
    status: string;
    progress: number | null;
    resolution: string;
    format: string;
    outputUrl: string | null;
    errorMessage: string | null;
    fileSize: number | null;
    duration: number | null;
    createdAt: Date;
    completedAt: Date | null;
    project: {
      id: string;
      name: string;
    } | null;
  };
  onDelete: () => void;
}

function RenderCard({ render, onDelete }: RenderCardProps) {
  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-500',
    PROCESSING: 'bg-blue-500',
    COMPLETED: 'bg-green-500',
    FAILED: 'bg-red-500',
  };

  const statusLabels: Record<string, string> = {
    PENDING: 'Queued',
    PROCESSING: 'Rendering',
    COMPLETED: 'Complete',
    FAILED: 'Failed',
  };

  const isProcessing = render.status === 'PENDING' || render.status === 'PROCESSING';

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Thumbnail / Status Icon */}
          <div className="w-24 h-16 bg-muted rounded flex items-center justify-center shrink-0">
            {render.status === 'PROCESSING' ? (
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            ) : render.status === 'FAILED' ? (
              <AlertCircle className="w-6 h-6 text-destructive" />
            ) : render.status === 'COMPLETED' && render.outputUrl ? (
              <Play className="w-6 h-6 text-green-500" />
            ) : (
              <Clock className="w-6 h-6 text-muted-foreground" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium truncate">
                  {render.project?.name || 'Unknown Project'}
                </h3>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                      render.status === 'COMPLETED'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        : render.status === 'FAILED'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${statusColors[render.status]}`}
                    />
                    {statusLabels[render.status]}
                  </span>
                  <span>{render.resolution}</span>
                  <span>{render.format.toUpperCase()}</span>
                  {render.fileSize && (
                    <span>{formatFileSize(render.fileSize)}</span>
                  )}
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {render.outputUrl && (
                    <DropdownMenuItem asChild>
                      <a
                        href={render.outputUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </a>
                    </DropdownMenuItem>
                  )}
                  {render.project && (
                    <DropdownMenuItem asChild>
                      <Link href={`/editor/${render.project.id}`}>
                        <Video className="w-4 h-4 mr-2" />
                        Open Project
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onDelete} className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Progress Bar */}
            {isProcessing && (
              <div className="mt-3">
                <Progress value={render.progress || 0} className="h-1.5" />
                <p className="text-xs text-muted-foreground mt-1">
                  {render.progress || 0}% complete
                </p>
              </div>
            )}

            {/* Error Message */}
            {render.status === 'FAILED' && render.errorMessage && (
              <p className="text-sm text-destructive mt-2">
                Error: {render.errorMessage}
              </p>
            )}

            {/* Timestamps */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
              <span>Started {formatRelativeTime(new Date(render.createdAt))}</span>
              {render.completedAt && (
                <span>
                  Completed {formatRelativeTime(new Date(render.completedAt))}
                </span>
              )}
              {render.duration && (
                <span>Duration: {formatDuration(render.duration)}</span>
              )}
            </div>
          </div>

          {/* Download Button */}
          {render.status === 'COMPLETED' && render.outputUrl && (
            <Button asChild size="sm" className="shrink-0">
              <a
                href={render.outputUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ===========================================
// Helper Functions
// ===========================================

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
