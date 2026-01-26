import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, protectedProcedure } from '@/server/trpc';
import { renderVideo } from '@/lib/remotion';
import { getSignedDownloadUrl } from '@/lib/s3';

// ===========================================
// Resolution Mapping
// ===========================================

const resolutionMap = {
  '720p': 'HD_720P',
  '1080p': 'HD_1080P',
  '4k': 'UHD_4K',
} as const;

const reverseResolutionMap = {
  HD_720P: '720p',
  HD_1080P: '1080p',
  UHD_4K: '4k',
} as const;

// ===========================================
// Renders Router
// ===========================================

export const rendersRouter = createTRPCRouter({
  // List renders for a project
  list: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid().optional(),
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { projectId, limit, cursor } = input;

      const renders = await ctx.prisma.render.findMany({
        where: {
          userId: ctx.userId,
          ...(projectId ? { projectId } : {}),
        },
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: 'desc' },
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      let nextCursor: string | undefined;
      if (renders.length > limit) {
        const nextItem = renders.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items: renders.map((render) => ({
          ...render,
          resolution: reverseResolutionMap[render.resolution] as '720p' | '1080p' | '4k',
        })),
        nextCursor,
        hasMore: !!nextCursor,
      };
    }),

  // Get a single render
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const render = await ctx.prisma.render.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId,
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!render) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Render not found',
        });
      }

      return {
        ...render,
        resolution: reverseResolutionMap[render.resolution] as '720p' | '1080p' | '4k',
      };
    }),

  // Create a new render job
  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        resolution: z.enum(['720p', '1080p', '4k']).default('1080p'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify project ownership
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

      // Check for existing queued/processing renders
      const pendingRender = await ctx.prisma.render.findFirst({
        where: {
          projectId: input.projectId,
          userId: ctx.userId,
          status: { in: ['QUEUED', 'PROCESSING'] },
        },
      });

      if (pendingRender) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A render is already in progress for this project',
        });
      }

      // Create render record
      const render = await ctx.prisma.render.create({
        data: {
          projectId: input.projectId,
          userId: ctx.userId,
          status: 'QUEUED',
          resolution: resolutionMap[input.resolution],
          progress: 0,
        },
      });

      // Start async render process
      try {
        await renderVideo({
          renderId: render.id,
          projectId: input.projectId,
          config: project.config as Record<string, unknown>,
          resolution: input.resolution,
        });
      } catch (error) {
        // Update render status to failed
        await ctx.prisma.render.update({
          where: { id: render.id },
          data: {
            status: 'FAILED',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
        });

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to start render',
        });
      }

      return {
        ...render,
        resolution: input.resolution,
      };
    }),

  // Get download URL for completed render
  getDownloadUrl: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const render = await ctx.prisma.render.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId,
          status: 'COMPLETE',
        },
      });

      if (!render) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Completed render not found',
        });
      }

      if (!render.outputUrl) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Render output not available',
        });
      }

      // Generate signed URL (1 hour expiry)
      const signedUrl = await getSignedDownloadUrl(render.outputUrl, 3600);

      return {
        url: signedUrl,
        expiresAt: new Date(Date.now() + 3600 * 1000),
      };
    }),

  // Cancel a queued or processing render
  cancel: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const render = await ctx.prisma.render.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId,
          status: { in: ['QUEUED', 'PROCESSING'] },
        },
      });

      if (!render) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Active render not found',
        });
      }

      await ctx.prisma.render.update({
        where: { id: input.id },
        data: {
          status: 'FAILED',
          errorMessage: 'Cancelled by user',
        },
      });

      return { success: true };
    }),

  // Delete a render record
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const render = await ctx.prisma.render.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId,
        },
      });

      if (!render) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Render not found',
        });
      }

      // TODO: Delete from S3 if outputUrl exists

      await ctx.prisma.render.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Get render statistics
  stats: protectedProcedure.query(async ({ ctx }) => {
    const [total, completed, failed] = await Promise.all([
      ctx.prisma.render.count({
        where: { userId: ctx.userId },
      }),
      ctx.prisma.render.count({
        where: { userId: ctx.userId, status: 'COMPLETE' },
      }),
      ctx.prisma.render.count({
        where: { userId: ctx.userId, status: 'FAILED' },
      }),
    ]);

    return {
      total,
      completed,
      failed,
      pending: total - completed - failed,
    };
  }),
});
