'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  FolderOpen,
  Clock,
  Video,
  TrendingUp,
  Zap,
  PlayCircle,
  MoreHorizontal,
  Edit,
  Copy,
  Trash2,
  Sparkles,
  Film,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Layout,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { formatRelativeTime } from '@/lib/utils';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui';
import { AIProjectGenerator } from '@/components/ai';

// ===========================================
// Dashboard Page
// ===========================================

export default function DashboardPage() {
  const router = useRouter();
  const [showAIGenerator, setShowAIGenerator] = React.useState(false);

  // Fetch recent projects
  const { data: projectsData, isLoading: projectsLoading } = trpc.projects.list.useQuery({
    limit: 6,
  });
  const projects = projectsData?.items;

  // Fetch recent renders
  const { data: rendersData, isLoading: rendersLoading } = trpc.renders.list.useQuery({
    limit: 5,
  });
  const renders = rendersData?.items;

  // Mutations
  const createProject = trpc.projects.create.useMutation({
    onSuccess: (project) => {
      router.push(`/editor/${project.id}`);
    },
  });

  const duplicateProject = trpc.projects.duplicate.useMutation({
    onSuccess: () => {
      window.location.reload();
    },
  });

  const deleteProject = trpc.projects.delete.useMutation({
    onSuccess: () => {
      window.location.reload();
    },
  });

  const handleCreateProject = () => {
    createProject.mutate({
      name: 'Untitled Project',
    });
  };

  const handleDuplicateProject = (id: string) => {
    duplicateProject.mutate({ id });
  };

  const handleDeleteProject = (id: string) => {
    if (confirm('Are you sure you want to delete this project?')) {
      deleteProject.mutate({ id });
    }
  };

  // Stats calculations
  const completedRenders = renders?.filter((r) => r.status === 'COMPLETE').length ?? 0;
  const inProgressRenders = renders?.filter((r) => r.status === 'PROCESSING' || r.status === 'QUEUED').length ?? 0;

  return (
    <div className="container py-6 max-w-7xl">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-8 mb-6">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,white)]" />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome back!
            </h1>
            <p className="text-purple-100 text-lg">
              Create stunning property flyovers in minutes
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              size="lg"
              onClick={() => setShowAIGenerator(true)}
              className="bg-white text-purple-700 hover:bg-purple-50 shadow-lg"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              AI Generator
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={handleCreateProject}
              disabled={createProject.isPending}
              className="bg-white/20 text-white hover:bg-white/30 border-white/30"
            >
              {createProject.isPending ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Plus className="w-5 h-5 mr-2" />
              )}
              Blank Project
            </Button>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute -right-8 -top-8 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -left-8 -bottom-8 w-48 h-48 bg-purple-500/20 rounded-full blur-2xl" />
      </div>

      {/* Compact Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30 border border-blue-200/50 dark:border-blue-800/50">
          <div className="p-2 rounded-lg bg-blue-500 text-white">
            <FolderOpen className="w-4 h-4" />
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{projects?.length ?? 0}</p>
            <p className="text-xs text-blue-600/70 dark:text-blue-400/70">Projects</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/50 dark:to-emerald-900/30 border border-emerald-200/50 dark:border-emerald-800/50">
          <div className="p-2 rounded-lg bg-emerald-500 text-white">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{completedRenders}</p>
            <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">Completed</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/50 dark:to-amber-900/30 border border-amber-200/50 dark:border-amber-800/50">
          <div className="p-2 rounded-lg bg-amber-500 text-white">
            <Loader2 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{inProgressRenders}</p>
            <p className="text-xs text-amber-600/70 dark:text-amber-400/70">In Progress</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950/50 dark:to-rose-900/30 border border-rose-200/50 dark:border-rose-800/50">
          <div className="p-2 rounded-lg bg-rose-500 text-white">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">{renders?.length ?? 0}</p>
            <p className="text-xs text-rose-600/70 dark:text-rose-400/70">Total Renders</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Projects - Takes 2 columns */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-purple-500" />
              Recent Projects
            </h2>
            <Link href="/projects">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                View all
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>

          {projectsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
              ))}
            </div>
          ) : projects && projects.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {projects.map((project, index) => (
                <div
                  key={project.id}
                  onClick={() => router.push(`/editor/${project.id}`)}
                  className="group relative flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-accent/50 hover:border-purple-300 dark:hover:border-purple-700 transition-all cursor-pointer"
                >
                  {/* Thumbnail */}
                  <div className="relative w-14 h-14 rounded-lg bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/50 dark:to-indigo-900/50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {project.thumbnailUrl ? (
                      <img
                        src={project.thumbnailUrl}
                        alt={project.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Video className="w-6 h-6 text-purple-500" />
                    )}
                    {/* Play overlay on hover */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <PlayCircle className="w-6 h-6 text-white" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      {project.name}
                    </h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatRelativeTime(new Date(project.updatedAt))}
                    </p>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/editor/${project.id}`);
                        }}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateProject(project.id);
                        }}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(project.id);
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border rounded-xl bg-muted/30">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <FolderOpen className="w-8 h-8 text-purple-500" />
              </div>
              <h3 className="text-lg font-medium mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-4 text-sm">
                Create your first property clip to get started
              </p>
              <Button onClick={handleCreateProject} className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Project
              </Button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="justify-start h-auto py-3 flex-col items-center gap-1 col-span-2 border-purple-200 bg-purple-50/50 hover:bg-purple-100/50 dark:border-purple-800 dark:bg-purple-950/30"
                onClick={() => setShowAIGenerator(true)}
              >
                <Sparkles className="w-5 h-5 text-purple-500" />
                <span className="text-xs font-medium text-purple-700 dark:text-purple-300">AI Project Generator</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start h-auto py-3 flex-col items-center gap-1"
                onClick={handleCreateProject}
                disabled={createProject.isPending}
              >
                <Plus className="w-5 h-5 text-blue-500" />
                <span className="text-xs">Blank Project</span>
              </Button>
              <Link href="/templates" className="block">
                <Button variant="outline" size="sm" className="w-full justify-start h-auto py-3 flex-col items-center gap-1">
                  <Layout className="w-5 h-5 text-emerald-500" />
                  <span className="text-xs">Templates</span>
                </Button>
              </Link>
              <Link href="/renders" className="block col-span-2">
                <Button variant="outline" size="sm" className="w-full justify-start h-auto py-3 flex-col items-center gap-1">
                  <Film className="w-5 h-5 text-rose-500" />
                  <span className="text-xs">View All Renders</span>
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Recent Renders */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <PlayCircle className="w-4 h-4 text-emerald-500" />
                Recent Renders
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rendersLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : renders && renders.length > 0 ? (
                <div className="space-y-2">
                  {renders.slice(0, 4).map((render) => (
                    <div
                      key={render.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            render.status === 'COMPLETE'
                              ? 'bg-emerald-500'
                              : render.status === 'FAILED'
                              ? 'bg-red-500'
                              : render.status === 'PROCESSING'
                              ? 'bg-amber-500 animate-pulse'
                              : 'bg-muted-foreground'
                          }`}
                        />
                        <span className="text-sm truncate">
                          {render.project?.name || 'Unknown'}
                        </span>
                      </div>
                      {render.status === 'COMPLETE' && render.outputUrl && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 flex-shrink-0"
                          asChild
                        >
                          <a
                            href={render.outputUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <PlayCircle className="w-4 h-4 text-emerald-500" />
                          </a>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No renders yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI Project Generator Dialog */}
      <AIProjectGenerator
        open={showAIGenerator}
        onOpenChange={setShowAIGenerator}
        onProjectCreated={(projectId) => {
          router.push(`/editor/${projectId}`);
        }}
      />

      {/* Version Indicator */}
      <div className="mt-8 pt-4 border-t border-muted text-center">
        <p className="text-xs text-muted-foreground/60">
          Build: {process.env.NEXT_PUBLIC_BUILD_TIME || 'dev'}
          {process.env.NEXT_PUBLIC_BUILD_TIMESTAMP && (
            <span className="ml-2 font-mono">
              ({process.env.NEXT_PUBLIC_BUILD_TIMESTAMP.slice(0, 10)})
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
