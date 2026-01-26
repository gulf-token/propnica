'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search, Clock, Star, Loader2, Sparkles } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import {
  Button,
  Card,
  CardContent,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import { AIProjectGenerator } from '@/components/ai/ai-project-generator';

// ===========================================
// Templates Page
// ===========================================

interface Template {
  id: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  category: string | null;
  isPublic: boolean;
  usageCount: number;
  createdAt: Date;
}

export default function TemplatesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('all');
  const [showAIGenerator, setShowAIGenerator] = React.useState(false);

  // Fetch templates
  const { data: templatesData, isLoading } = trpc.templates.list.useQuery({
    category: selectedCategory === 'all' ? undefined : selectedCategory,
  });

  // Filter templates client-side by search query
  const templates = React.useMemo(() => {
    const items = templatesData?.items ?? [];
    if (!searchQuery) return items;
    const query = searchQuery.toLowerCase();
    return items.filter((t) =>
      t.name.toLowerCase().includes(query) ||
      t.description?.toLowerCase().includes(query)
    );
  }, [templatesData?.items, searchQuery]);

  // Create project from template
  const useTemplate = trpc.templates.useTemplate.useMutation({
    onSuccess: (project) => {
      router.push(`/editor/${project.id}`);
    },
  });

  const handleUseTemplate = (templateId: string) => {
    useTemplate.mutate({ templateId });
  };

  // Category tabs
  const categories = [
    { value: 'all', label: 'All Templates' },
    { value: 'residential', label: 'Residential' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'aerial', label: 'Aerial' },
    { value: 'neighbourhood', label: 'Neighbourhood' },
    { value: 'luxury', label: 'Luxury' },
  ];

  return (
    <div className="container py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
        <p className="text-muted-foreground mt-1">
          Start with a pre-built template to save time
        </p>
      </div>

      {/* AI Generator Card */}
      <Card className="mb-8 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 border-violet-500/20">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Start with AI</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Describe your property video in natural language and let AI generate the animation timeline for you
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowAIGenerator(true)}
              className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white shrink-0"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate with AI
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs
        value={selectedCategory}
        onValueChange={setSelectedCategory}
        className="space-y-6"
      >
        <TabsList className="w-full justify-start flex-wrap h-auto gap-2 bg-transparent p-0">
          {categories.map((category) => (
            <TabsTrigger
              key={category.value}
              value={category.value}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {category.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((category) => (
          <TabsContent key={category.value} value={category.value}>
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div
                    key={i}
                    className="h-64 bg-muted animate-pulse rounded-lg"
                  />
                ))}
              </div>
            ) : templates && templates.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {templates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onUse={() => handleUseTemplate(template.id)}
                    isLoading={useTemplate.isPending}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-lg font-medium mb-2">No templates found</p>
                <p className="text-muted-foreground">
                  {searchQuery
                    ? `No templates match "${searchQuery}"`
                    : 'No templates available in this category'}
                </p>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Featured Section */}
      <div className="mt-12">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500" />
          Featured Templates
        </h2>
        <p className="text-muted-foreground mb-6">
          Our most popular templates chosen by the community
        </p>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-80 bg-muted animate-pulse rounded-lg"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {templates?.slice(0, 3).map((template) => (
              <FeaturedTemplateCard
                key={template.id}
                template={template}
                onUse={() => handleUseTemplate(template.id)}
                isLoading={useTemplate.isPending}
              />
            ))}
          </div>
        )}
      </div>

      {/* AI Project Generator Modal */}
      <AIProjectGenerator
        open={showAIGenerator}
        onOpenChange={setShowAIGenerator}
      />
    </div>
  );
}

// ===========================================
// Template Card Component
// ===========================================

interface TemplateCardProps {
  template: Template;
  onUse: () => void;
  isLoading: boolean;
}

function TemplateCard({ template, onUse, isLoading }: TemplateCardProps) {
  return (
    <Card className="group overflow-hidden hover:shadow-md transition-shadow">
      <div className="aspect-video bg-muted relative">
        {template.thumbnailUrl ? (
          <img
            src={template.thumbnailUrl}
            alt={template.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <span className="text-4xl font-bold text-primary/30">
              {template.name.charAt(0)}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <Button
            variant="secondary"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onUse}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Use Template'
            )}
          </Button>
        </div>
      </div>
      <CardContent className="p-4">
        <h3 className="font-medium truncate">{template.name}</h3>
        {template.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {template.description}
          </p>
        )}
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span className="capitalize">{template.category}</span>
          <span>{template.usageCount} uses</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ===========================================
// Featured Template Card Component
// ===========================================

function FeaturedTemplateCard({ template, onUse, isLoading }: TemplateCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-[4/3] bg-muted relative">
        {template.thumbnailUrl ? (
          <img
            src={template.thumbnailUrl}
            alt={template.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <span className="text-6xl font-bold text-primary/30">
              {template.name.charAt(0)}
            </span>
          </div>
        )}
      </div>
      <CardContent className="p-5">
        <h3 className="text-lg font-semibold">{template.name}</h3>
        {template.description && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
            {template.description}
          </p>
        )}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="capitalize">{template.category}</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {template.usageCount} uses
            </span>
          </div>
          <Button onClick={onUse} disabled={isLoading} size="sm">
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Use'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
