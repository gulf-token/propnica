import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, protectedProcedure } from '@/server/trpc';
import { ProjectConfig, DEFAULT_PROJECT_CONFIG } from '@/types';

// ===========================================
// Input Validation Schemas
// ===========================================

const projectConfigSchema = z.object({
  version: z.string(),
  settings: z.object({
    duration: z.number().min(5).max(300),
    fps: z.number().min(24).max(60),
    resolution: z.enum(['720p', '1080p', '4k']),
  }),
  mapSettings: z.object({
    style: z.enum(['satellite', 'satellite-streets', 'streets', 'light', 'dark']),
    accessToken: z.string().optional(),
  }),
  keyframes: z.array(z.any()),
  zones: z.array(z.any()),
  routes: z.array(z.any()),
  textMarkers: z.array(z.any()),
  branding: z.any(),
});

// ===========================================
// Projects Router
// ===========================================

export const projectsRouter = createTRPCRouter({
  // List all projects for current user
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor } = input;

      const projects = await ctx.prisma.project.findMany({
        where: {
          userId: ctx.userId,
          deletedAt: null,
        },
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          description: true,
          thumbnailUrl: true,
          duration: true,
          updatedAt: true,
        },
      });

      let nextCursor: string | undefined;
      if (projects.length > limit) {
        const nextItem = projects.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items: projects,
        nextCursor,
        hasMore: !!nextCursor,
      };
    }),

  // Get a single project by ID
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findFirst({
        where: {
          id: input.id,
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

      return {
        ...project,
        config: project.config as ProjectConfig,
      };
    }),

  // Create a new project
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        description: z.string().max(1000).optional(),
        templateId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let config: ProjectConfig = DEFAULT_PROJECT_CONFIG;

      // If template is provided, copy its config
      if (input.templateId) {
        const template = await ctx.prisma.template.findFirst({
          where: {
            id: input.templateId,
            OR: [{ userId: ctx.userId }, { isPublic: true }],
          },
        });

        if (template) {
          config = template.config as ProjectConfig;
          // Increment template usage count
          await ctx.prisma.template.update({
            where: { id: input.templateId },
            data: { usageCount: { increment: 1 } },
          });
        }
      }

      const project = await ctx.prisma.project.create({
        data: {
          userId: ctx.userId,
          name: input.name,
          description: input.description ?? null,
          config: config as unknown as Record<string, unknown>,
          duration: config.settings.duration,
        },
      });

      return {
        ...project,
        config: project.config as ProjectConfig,
      };
    }),

  // Update an existing project
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(200).optional(),
        description: z.string().max(1000).optional().nullable(),
        config: projectConfigSchema.optional(),
        thumbnailUrl: z.string().url().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // Verify ownership
      const existing = await ctx.prisma.project.findFirst({
        where: {
          id,
          userId: ctx.userId,
          deletedAt: null,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      const project = await ctx.prisma.project.update({
        where: { id },
        data: {
          ...updateData,
          config: updateData.config as unknown as Record<string, unknown>,
          duration: updateData.config?.settings.duration,
        },
      });

      return {
        ...project,
        config: project.config as ProjectConfig,
      };
    }),

  // Soft delete a project
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const existing = await ctx.prisma.project.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId,
          deletedAt: null,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      await ctx.prisma.project.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });

      return { success: true };
    }),

  // Duplicate a project
  duplicate: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(200).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Find the original project
      const original = await ctx.prisma.project.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId,
          deletedAt: null,
        },
      });

      if (!original) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      // Create duplicate
      const project = await ctx.prisma.project.create({
        data: {
          userId: ctx.userId,
          name: input.name ?? `${original.name} (copy)`,
          description: original.description,
          config: original.config as Record<string, unknown>,
          duration: original.duration,
        },
      });

      return {
        ...project,
        config: project.config as ProjectConfig,
      };
    }),

  // Get recent projects (for dashboard)
  recent: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(10).default(5) }))
    .query(async ({ ctx, input }) => {
      const projects = await ctx.prisma.project.findMany({
        where: {
          userId: ctx.userId,
          deletedAt: null,
        },
        take: input.limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          thumbnailUrl: true,
          updatedAt: true,
        },
      });

      return projects;
    }),

  // Get project count for current user
  count: protectedProcedure.query(async ({ ctx }) => {
    const count = await ctx.prisma.project.count({
      where: {
        userId: ctx.userId,
        deletedAt: null,
      },
    });

    return { count };
  }),
});
