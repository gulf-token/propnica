import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { Prisma, LibraryItemType } from '@prisma/client';
import { createTRPCRouter, protectedProcedure } from '@/server/trpc';
import { Zone, Route, TextMarker } from '@/types';

// ===========================================
// Library Router
// ===========================================

const libraryItemTypeSchema = z.enum(['ZONE', 'ROUTE', 'TEXT_MARKER']);

export const libraryRouter = createTRPCRouter({
  // List user's library items
  list: protectedProcedure
    .input(
      z.object({
        type: libraryItemTypeSchema.optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { type, search, limit, cursor } = input;

      const items = await ctx.prisma.libraryItem.findMany({
        where: {
          userId: ctx.userId,
          ...(type ? { type } : {}),
          ...(search
            ? {
                OR: [
                  { name: { contains: search, mode: 'insensitive' } },
                  { description: { contains: search, mode: 'insensitive' } },
                  { tags: { hasSome: [search] } },
                ],
              }
            : {}),
        },
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: [{ updatedAt: 'desc' }],
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          tags: true,
          usageCount: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      let nextCursor: string | undefined;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items,
        nextCursor,
        hasMore: !!nextCursor,
      };
    }),

  // Get a single library item with full config
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const item = await ctx.prisma.libraryItem.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId,
        },
      });

      if (!item) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Library item not found',
        });
      }

      return {
        ...item,
        config: item.config as unknown as Zone | Route | TextMarker,
      };
    }),

  // Archive (create) a library item from an element
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        description: z.string().max(1000).optional(),
        type: libraryItemTypeSchema,
        config: z.any(), // Zone, Route, or TextMarker config
        tags: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.prisma.libraryItem.create({
        data: {
          userId: ctx.userId,
          name: input.name,
          description: input.description ?? null,
          type: input.type as LibraryItemType,
          config: input.config as Prisma.InputJsonValue,
          tags: input.tags,
        },
      });

      return {
        ...item,
        config: item.config as unknown as Zone | Route | TextMarker,
      };
    }),

  // Update a library item
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(200).optional(),
        description: z.string().max(1000).optional().nullable(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // Verify ownership
      const existing = await ctx.prisma.libraryItem.findFirst({
        where: {
          id,
          userId: ctx.userId,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Library item not found',
        });
      }

      const item = await ctx.prisma.libraryItem.update({
        where: { id },
        data: updateData,
      });

      return {
        ...item,
        config: item.config as unknown as Zone | Route | TextMarker,
      };
    }),

  // Delete a library item
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const existing = await ctx.prisma.libraryItem.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Library item not found',
        });
      }

      await ctx.prisma.libraryItem.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Import a library item (get config and increment usage count)
  import: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.prisma.libraryItem.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId,
        },
      });

      if (!item) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Library item not found',
        });
      }

      // Increment usage count
      await ctx.prisma.libraryItem.update({
        where: { id: input.id },
        data: { usageCount: { increment: 1 } },
      });

      return {
        type: item.type,
        config: item.config as unknown as Zone | Route | TextMarker,
      };
    }),

  // Get library stats
  stats: protectedProcedure.query(async ({ ctx }) => {
    const counts = await ctx.prisma.libraryItem.groupBy({
      by: ['type'],
      where: { userId: ctx.userId },
      _count: { type: true },
    });

    const total = counts.reduce((acc, c) => acc + c._count.type, 0);

    return {
      total,
      byType: {
        zones: counts.find((c) => c.type === 'ZONE')?._count.type ?? 0,
        routes: counts.find((c) => c.type === 'ROUTE')?._count.type ?? 0,
        textMarkers: counts.find((c) => c.type === 'TEXT_MARKER')?._count.type ?? 0,
      },
    };
  }),
});
