'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Grid,
  List,
  MoreHorizontal,
  Edit,
  Copy,
  Trash2,
  Video,
  Clock,
  SortAsc,
  SortDesc,
  FolderOpen,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { formatRelativeTime } from '@/lib/utils';
import {
  Button,
  Card,
  CardContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';

// ===========================================
// Projects Page
// ===========================================

type ViewMode = 'grid' | 'list';
type SortField = 'name' | 'createdAt' | 'updatedAt';
type SortOrder = 'asc' | 'desc';

export default function ProjectsPage() {
  const router = useRouter();
  
  const [searchQuery, setSearchQuery] = React.useState('');
  const [viewMode, setViewMode] = React.useState<ViewMode>('grid');
  const [sortBy, setSortBy] = React.useState<SortField>('updatedAt');
  const [sortOrder, setSortOrder] = React.useState<SortOrder>('desc');

  // Fetch projects
  const { data: projects, isLoading, refetch } = trpc.projects.list.useQuery({
    search: searchQuery || undefined,
    sortBy,
    sortOrder,
  });

  // Mutations
  const createProject = trpc.projects.create.useMutation({
    onSuccess: (project) => {
      router.push(`/editor/${project.id}`);
    },
  });

  const duplicateProject = trpc.projects.duplicate.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const deleteProject = trpc.projects.delete.useMutation({
    onSuccess: () => {
      refetch();
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
    if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      deleteProject.mutate({ id });
    }
  };

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  return (
    <div className="container py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">
            Manage all your property clip projects
          </p>
        </div>
        <Button onClick={handleCreateProject} disabled={createProject.isPending}>
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortField)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updatedAt">Last modified</SelectItem>
              <SelectItem value="createdAt">Date created</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={toggleSortOrder}>
            {sortOrder === 'asc' ? (
              <SortAsc className="w-4 h-4" />
            ) : (
              <SortDesc className="w-4 h-4" />
            )}
          </Button>
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Projects Display */}
      {isLoading ? (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
              : 'space-y-3'
          }
        >
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className={`bg-muted animate-pulse rounded-lg ${
                viewMode === 'grid' ? 'h-48' : 'h-20'
              }`}
            />
          ))}
        </div>
      ) : projects && projects.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={() => router.push(`/editor/${project.id}`)}
                onDuplicate={() => handleDuplicateProject(project.id)}
                onDelete={() => handleDeleteProject(project.id)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => (
              <ProjectRow
                key={project.id}
                project={project}
                onEdit={() => router.push(`/editor/${project.id}`)}
                onDuplicate={() => handleDuplicateProject(project.id)}
                onDelete={() => handleDeleteProject(project.id)}
              />
            ))}
          </div>
        )
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FolderOpen className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No projects found</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              {searchQuery
                ? `No projects match "${searchQuery}". Try a different search term.`
                : 'Get started by creating your first property clip project.'}
            </p>
            {!searchQuery && (
              <Button onClick={handleCreateProject}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Project
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ===========================================
// Project Card Component (Grid View)
// ===========================================

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    thumbnailUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function ProjectCard({ project, onEdit, onDuplicate, onDelete }: ProjectCardProps) {
  return (
    <Card className="group overflow-hidden hover:shadow-md transition-shadow">
      <div className="aspect-video bg-muted relative">
        {project.thumbnailUrl ? (
          <img
            src={project.thumbnailUrl}
            alt={project.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Video className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <Button
            variant="secondary"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onEdit}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <Link
              href={`/editor/${project.id}`}
              className="font-medium hover:underline truncate block"
            >
              {project.name}
            </Link>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3" />
              {formatRelativeTime(new Date(project.updatedAt))}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

// ===========================================
// Project Row Component (List View)
// ===========================================

interface ProjectRowProps {
  project: {
    id: string;
    name: string;
    thumbnailUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function ProjectRow({ project, onEdit, onDuplicate, onDelete }: ProjectRowProps) {
  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="w-20 h-14 bg-muted rounded shrink-0 overflow-hidden">
          {project.thumbnailUrl ? (
            <img
              src={project.thumbnailUrl}
              alt={project.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Video className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <Link
            href={`/editor/${project.id}`}
            className="font-medium hover:underline truncate block"
          >
            {project.name}
          </Link>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Modified {formatRelativeTime(new Date(project.updatedAt))}
            </span>
            <span>
              Created {formatRelativeTime(new Date(project.createdAt))}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
