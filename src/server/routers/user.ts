import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, protectedProcedure } from '@/server/trpc';
import { UserPreferences, DEFAULT_USER_PREFERENCES } from '@/types';

// ===========================================
// User Router
// ===========================================

export const userRouter = createTRPCRouter({
  // Get current user's profile
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    let profile = await ctx.prisma.userProfile.findUnique({
      where: { userId: ctx.userId },
    });

    // Create profile if it doesn't exist
    if (!profile) {
      profile = await ctx.prisma.userProfile.create({
        data: {
          userId: ctx.userId,
          preferences: DEFAULT_USER_PREFERENCES as unknown as Record<string, unknown>,
        },
      });
    }

    return {
      ...profile,
      preferences: profile.preferences as UserPreferences,
      email: ctx.session?.user?.email ?? null,
    };
  }),

  // Update user profile
  updateProfile: protectedProcedure
    .input(
      z.object({
        displayName: z.string().max(100).optional().nullable(),
        company: z.string().max(200).optional().nullable(),
        avatarUrl: z.string().url().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.prisma.userProfile.upsert({
        where: { userId: ctx.userId },
        update: input,
        create: {
          userId: ctx.userId,
          ...input,
          preferences: DEFAULT_USER_PREFERENCES as unknown as Record<string, unknown>,
        },
      });

      return {
        ...profile,
        preferences: profile.preferences as UserPreferences,
      };
    }),

  // Update user preferences
  updatePreferences: protectedProcedure
    .input(
      z.object({
        defaultResolution: z.enum(['720p', '1080p', '4k']).optional(),
        defaultDuration: z.number().min(5).max(300).optional(),
        autoSave: z.boolean().optional(),
        showTutorials: z.boolean().optional(),
        theme: z.enum(['light', 'dark', 'system']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get current profile
      const currentProfile = await ctx.prisma.userProfile.findUnique({
        where: { userId: ctx.userId },
      });

      const currentPreferences = (currentProfile?.preferences ?? DEFAULT_USER_PREFERENCES) as UserPreferences;

      const newPreferences: UserPreferences = {
        ...currentPreferences,
        ...input,
      };

      const profile = await ctx.prisma.userProfile.upsert({
        where: { userId: ctx.userId },
        update: {
          preferences: newPreferences as unknown as Record<string, unknown>,
        },
        create: {
          userId: ctx.userId,
          preferences: newPreferences as unknown as Record<string, unknown>,
        },
      });

      return {
        ...profile,
        preferences: profile.preferences as UserPreferences,
      };
    }),

  // Get user statistics
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const [projectCount, renderCount, completedRenders, totalDuration] = await Promise.all([
      ctx.prisma.project.count({
        where: { userId: ctx.userId, deletedAt: null },
      }),
      ctx.prisma.render.count({
        where: { userId: ctx.userId },
      }),
      ctx.prisma.render.count({
        where: { userId: ctx.userId, status: 'COMPLETE' },
      }),
      ctx.prisma.project.aggregate({
        where: { userId: ctx.userId, deletedAt: null },
        _sum: { duration: true },
      }),
    ]);

    return {
      projectCount,
      renderCount,
      completedRenders,
      totalVideoDuration: totalDuration._sum.duration ?? 0,
    };
  }),

  // Delete user account (soft delete)
  deleteAccount: protectedProcedure
    .input(
      z.object({
        confirmation: z.literal('DELETE MY ACCOUNT'),
      })
    )
    .mutation(async ({ ctx }) => {
      // Soft delete all projects
      await ctx.prisma.project.updateMany({
        where: { userId: ctx.userId },
        data: { deletedAt: new Date() },
      });

      // Delete templates
      await ctx.prisma.template.deleteMany({
        where: { userId: ctx.userId },
      });

      // Mark profile for deletion
      await ctx.prisma.userProfile.update({
        where: { userId: ctx.userId },
        data: {
          displayName: '[DELETED]',
          company: null,
          avatarUrl: null,
        },
      });

      // TODO: Trigger Supabase user deletion

      return { success: true };
    }),

  // Export user data (GDPR compliance)
  exportData: protectedProcedure.mutation(async ({ ctx }) => {
    const [profile, projects, renders, templates] = await Promise.all([
      ctx.prisma.userProfile.findUnique({
        where: { userId: ctx.userId },
      }),
      ctx.prisma.project.findMany({
        where: { userId: ctx.userId, deletedAt: null },
      }),
      ctx.prisma.render.findMany({
        where: { userId: ctx.userId },
      }),
      ctx.prisma.template.findMany({
        where: { userId: ctx.userId },
      }),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      profile: profile
        ? {
            displayName: profile.displayName,
            company: profile.company,
            preferences: profile.preferences,
            createdAt: profile.createdAt,
          }
        : null,
      projects: projects.map((p) => ({
        name: p.name,
        description: p.description,
        duration: p.duration,
        config: p.config,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
      renders: renders.map((r) => ({
        status: r.status,
        resolution: r.resolution,
        createdAt: r.createdAt,
        completedAt: r.completedAt,
      })),
      templates: templates.map((t) => ({
        name: t.name,
        description: t.description,
        category: t.category,
        isPublic: t.isPublic,
        createdAt: t.createdAt,
      })),
    };

    return exportData;
  }),
});
