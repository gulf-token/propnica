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
  Progress,
  Separator,
} from '@/components/ui';

// ===========================================
// Dashboard Page
// ===========================================

export default function DashboardPage() {
  const router = useRouter();
  
  // Fetch recent projects
  const { data: projects, isLoading: projectsLoading } = trpc.projects.list.useQuery({
    limit: 6,
    sortBy: 'updatedAt',
    sortOrder: 'desc',
  });

  // Fetch recent renders
  const { data: renders, isLoading: rendersLoading } = trpc.renders.list.useQuery({
    limit: 5,
  });

  // Fetch usage stats
  const { data: usage } = trpc.user.getUsage.useQuery();

  // Mutations
  const createProject = trpc.projects.create.useMutation({
    onSuccess: (project) => {
      router.push(`/editor/${project.id}`);
    },
  });

  const duplicateProject = trpc.projects.duplicate.useMutation({
    onSuccess: () => {
      // Refetch projects list
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

  return (
    <div className="container py-8 max-w-7xl">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage your property clips
          </p>
        </div>
        <Button onClick={handleCreateProject} disabled={createProject.isPending}>
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Projects
            </CardTitle>
            <FolderOpen className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {projects?.length ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Videos Rendered
            </CardTitle>
            <Video className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {renders?.filter((r) => r.status === 'COMPLETED').length ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Minutes Used
            </CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usage?.renderMinutesUsed ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              of {usage?.renderMinutesLimit ?? 60} minutes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Storage Used
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((usage?.storageUsedMb ?? 0) / 1024).toFixed(1)} GB
            </div>
            <Progress 
              value={((usage?.storageUsedMb ?? 0) / (usage?.storageLimitMb ?? 5120)) * 100} 
              className="mt-2 h-1"
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Projects */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Projects</CardTitle>
                <Link href="/projects">
                  <Button variant="ghost" size="sm">
                    View all
                  </Button>
                </Link>
              </div>
              <CardDescription>
                Your most recently updated projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              {projectsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-20 bg-muted animate-pulse rounded-lg"
                    />
                  ))}
                </div>
              ) : projects && projects.length > 0 ? (
                <div className="space-y-4">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-12 bg-muted rounded flex items-center justify-center">
                          {project.thumbnailUrl ? (
                            <img
                              src={project.thumbnailUrl}
                              alt={project.name}
                              className="w-full h-full object-cover rounded"
                            />
                          ) : (
                            <Video className="w-6 h-6 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <Link
                            href={`/editor/${project.id}`}
                            className="font-medium hover:underline"
                          >
                            {project.name}
                          </Link>
                          <p className="text-sm text-muted-foreground">
                            Updated {formatRelativeTime(new Date(project.updatedAt))}
                          </p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => router.push(`/editor/${project.id}`)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDuplicateProject(project.id)}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteProject(project.id)}
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
                <div className="text-center py-12">
                  <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No projects yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first project to get started
                  </p>
                  <Button onClick={handleCreateProject}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Project
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleCreateProject}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
              <Link href="/templates" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <FolderOpen className="w-4 h-4 mr-2" />
                  Browse Templates
                </Button>
              </Link>
              <Link href="/renders" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Video className="w-4 h-4 mr-2" />
                  View Renders
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Recent Renders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlayCircle className="w-4 h-4" />
                Recent Renders
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rendersLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-12 bg-muted animate-pulse rounded"
                    />
                  ))}
                </div>
              ) : renders && renders.length > 0 ? (
                <div className="space-y-3">
                  {renders.slice(0, 5).map((render) => (
                    <div
                      key={render.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            render.status === 'COMPLETED'
                              ? 'bg-green-500'
                              : render.status === 'FAILED'
                              ? 'bg-red-500'
                              : render.status === 'PROCESSING'
                              ? 'bg-yellow-500'
                              : 'bg-muted-foreground'
                          }`}
                        />
                        <div>
                          <p className="text-sm font-medium truncate max-w-[160px]">
                            {render.project?.name || 'Unknown Project'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {render.status.toLowerCase()}
                          </p>
                        </div>
                      </div>
                      {render.status === 'COMPLETED' && render.outputUrl && (
                        <Button variant="ghost" size="icon" asChild>
                          <a
                            href={render.outputUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <PlayCircle className="w-4 h-4" />
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
    </div>
  );
}
