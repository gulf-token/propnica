import { createTRPCRouter } from '@/server/trpc';
import { projectsRouter } from './routers/projects';
import { rendersRouter } from './routers/renders';
import { templatesRouter } from './routers/templates';
import { userRouter } from './routers/user';
import { libraryRouter } from './routers/library';

// ===========================================
// Main App Router
// ===========================================

export const appRouter = createTRPCRouter({
  projects: projectsRouter,
  renders: rendersRouter,
  templates: templatesRouter,
  user: userRouter,
  library: libraryRouter,
});

// ===========================================
// Type Export
// ===========================================

export type AppRouter = typeof appRouter;
