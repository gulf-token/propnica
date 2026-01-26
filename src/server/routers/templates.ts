import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { Prisma } from '@prisma/client';
import { createTRPCRouter, protectedProcedure } from '@/server/trpc';
import { ProjectConfig } from '@/types';

// ===========================================
// Templates Router
// ===========================================

export const templatesRouter = createTRPCRouter({
  // List templates (public and user's own)
  list: protectedProcedure
    .input(
      z.object({
        category: z.string().optional(),
        includeOwn: z.boolean().default(true),
        includePublic: z.boolean().default(true),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { category, includeOwn, includePublic, limit, cursor } = input;

      // Build where clause
      const conditions = [];
      
      if (includeOwn) {
        conditions.push({ userId: ctx.userId });
      }
      
      if (includePublic) {
        conditions.push({ isPublic: true });
      }

      if (conditions.length === 0) {
        return { items: [], nextCursor: null, hasMore: false };
      }

      const templates = await ctx.prisma.template.findMany({
        where: {
          OR: conditions,
          ...(category ? { category } : {}),
        },
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: [{ usageCount: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          userId: true,
          name: true,
          description: true,
          thumbnailUrl: true,
          category: true,
          isPublic: true,
          usageCount: true,
          createdAt: true,
        },
      });

      let nextCursor: string | undefined;
      if (templates.length > limit) {
        const nextItem = templates.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items: templates.map((template) => ({
          ...template,
          isOwn: template.userId === ctx.userId,
        })),
        nextCursor,
        hasMore: !!nextCursor,
      };
    }),

  // Get a single template with full config
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const template = await ctx.prisma.template.findFirst({
        where: {
          id: input.id,
          OR: [{ userId: ctx.userId }, { isPublic: true }],
        },
      });

      if (!template) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Template not found',
        });
      }

      return {
        ...template,
        config: template.config as unknown as ProjectConfig,
        isOwn: template.userId === ctx.userId,
      };
    }),

  // Create a template from a project
  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        name: z.string().min(1).max(200),
        description: z.string().max(1000).optional(),
        category: z.string().max(50).optional(),
        isPublic: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get the project
      const project = await ctx.prisma.project.findFirst({
        where: {
          id: input.projectId,
          userId: ctx.userId,
          deletedAt: null,
        },
      });

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      // Create template
      const template = await ctx.prisma.template.create({
        data: {
          userId: ctx.userId,
          name: input.name,
          description: input.description ?? null,
          config: project.config as unknown as Prisma.InputJsonValue,
          thumbnailUrl: project.thumbnailUrl,
          category: input.category ?? null,
          isPublic: input.isPublic,
        },
      });

      return {
        ...template,
        config: template.config as unknown as ProjectConfig,
      };
    }),

  // Update a template
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(200).optional(),
        description: z.string().max(1000).optional().nullable(),
        category: z.string().max(50).optional().nullable(),
        isPublic: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // Verify ownership
      const existing = await ctx.prisma.template.findFirst({
        where: {
          id,
          userId: ctx.userId,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Template not found',
        });
      }

      const template = await ctx.prisma.template.update({
        where: { id },
        data: updateData,
      });

      return {
        ...template,
        config: template.config as unknown as ProjectConfig,
      };
    }),

  // Delete a template
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const existing = await ctx.prisma.template.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Template not found',
        });
      }

      await ctx.prisma.template.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Get template categories
  categories: protectedProcedure.query(async ({ ctx }) => {
    const categories = await ctx.prisma.template.groupBy({
      by: ['category'],
      where: {
        OR: [{ userId: ctx.userId }, { isPublic: true }],
        category: { not: null },
      },
      _count: { category: true },
    });

    return categories
      .filter((c) => c.category !== null)
      .map((c) => ({
        name: c.category!,
        count: c._count.category,
      }));
  }),

  // Use a template to create a new project
  useTemplate: protectedProcedure
    .input(z.object({ templateId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Get the template
      const template = await ctx.prisma.template.findFirst({
        where: {
          id: input.templateId,
          OR: [{ userId: ctx.userId }, { isPublic: true }],
        },
      });

      if (!template) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Template not found',
        });
      }

      // Create a new project from the template
      const project = await ctx.prisma.project.create({
        data: {
          userId: ctx.userId,
          name: `${template.name} (Copy)`,
          description: template.description,
          config: template.config as unknown as Prisma.InputJsonValue,
          thumbnailUrl: template.thumbnailUrl,
          duration: 30,
          isTemplate: false,
        },
      });

      // Increment template usage count
      await ctx.prisma.template.update({
        where: { id: input.templateId },
        data: { usageCount: { increment: 1 } },
      });

      return project;
    }),

  // Get popular templates
  popular: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(20).default(10) }))
    .query(async ({ ctx, input }) => {
      const templates = await ctx.prisma.template.findMany({
        where: { isPublic: true },
        take: input.limit,
        orderBy: { usageCount: 'desc' },
        select: {
          id: true,
          name: true,
          description: true,
          thumbnailUrl: true,
          category: true,
          usageCount: true,
        },
      });

      return templates;
    }),
});
