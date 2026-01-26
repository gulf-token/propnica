# CLAUDE.md - Propnica Project Context

> This file provides comprehensive context for AI assistants working on the Propnica codebase.

## Project Overview

**Propnica** is a cloud-based SaaS platform that enables UAE real estate professionals to create cinematic property showcase videos featuring animated map journeys. Users can create professional videos without video editing expertise through an intuitive visual editor.

### Target Market
- Primary: UAE real estate agencies and property developers
- Secondary: International real estate professionals
- Tertiary: Property marketing agencies

### Key Value Propositions
- No video editing skills required
- Professional 4K video output
- Map-centric storytelling with cinematic camera movements
- Full white-labelling with logos, watermarks, colour schemes
- Cloud-based rendering (no local hardware requirements)

---

## Tech Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Framework | Next.js | 14.1.3 | React framework with App Router |
| Language | TypeScript | 5.3.3 | Type-safe JavaScript |
| UI | React | 18.2.0 | Component library |
| Styling | Tailwind CSS | 3.4.1 | Utility-first CSS |
| Components | Radix UI | Various | Accessible UI primitives |
| Animation | Framer Motion | 11.0.5 | Animation library |
| Maps | Mapbox GL JS | 3.2.0 | Interactive map rendering |
| State | Zustand | 4.5.0 | State management |
| API | tRPC | 10.45.0 | End-to-end typesafe APIs |
| ORM | Prisma | 5.10.0 | Database ORM |
| Auth | Supabase Auth | 2.x | Authentication service |
| Storage | AWS S3 | SDK 3.x | File storage |
| Video | Remotion | 4.0.114 | Programmatic video creation |
| AI | Anthropic SDK | 0.71.x | AI-powered script parsing |
| Database | PostgreSQL | 15+ | Primary database |

### System Requirements
```
Node.js: >=20.0.0
npm: >=10.0.0
PostgreSQL: >=15.0
```

---

## Project Structure

```
propnica/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/             # Auth routes (login, signup, reset-password)
│   │   ├── (dashboard)/        # Protected dashboard routes
│   │   │   ├── dashboard/      # Main dashboard
│   │   │   ├── projects/       # Project management
│   │   │   ├── templates/      # Template management
│   │   │   ├── renders/        # Render history
│   │   │   ├── settings/       # User settings
│   │   │   └── account/        # Account management
│   │   ├── editor/[id]/        # Project editor
│   │   ├── api/                # API routes
│   │   │   ├── trpc/[trpc]/    # tRPC handler
│   │   │   ├── ai/parse-script/ # AI script parsing endpoint
│   │   │   └── webhooks/       # Webhook handlers (Stripe)
│   │   ├── auth/callback/      # OAuth callback
│   │   ├── privacy/            # Privacy policy page
│   │   ├── terms/              # Terms of service page
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Landing page
│   │
│   ├── components/             # React components
│   │   ├── ui/                 # Base UI components (Radix-based)
│   │   ├── editor/             # Editor components
│   │   │   ├── map-canvas.tsx  # Mapbox GL canvas
│   │   │   ├── toolbar.tsx     # Tool selection
│   │   │   ├── property-panel.tsx
│   │   │   ├── drawing-manager.tsx
│   │   │   ├── geocoding-search.tsx
│   │   │   ├── settings-modal.tsx
│   │   │   ├── library-panel.tsx
│   │   │   └── editor-controls.tsx
│   │   ├── timeline/           # Timeline components
│   │   │   ├── timeline.tsx
│   │   │   └── draggable-keyframe.tsx
│   │   ├── preview/            # Preview/render components
│   │   │   ├── preview-modal.tsx
│   │   │   └── render-modal.tsx
│   │   ├── ai/                 # AI-powered components
│   │   │   ├── ai-project-generator.tsx  # AI video generation
│   │   │   ├── location-autocomplete.tsx # Location search
│   │   │   └── timeline-table.tsx        # Timeline table view
│   │   ├── auth/               # Auth components
│   │   └── layout/             # Layout components (header, footer)
│   │
│   ├── lib/                    # Utility libraries
│   │   ├── trpc.tsx            # tRPC client setup
│   │   ├── supabase.ts         # Supabase client (browser + server)
│   │   ├── s3.ts               # S3 operations
│   │   ├── remotion.ts         # Remotion Lambda integration
│   │   ├── geo-utils.ts        # Geographic utilities
│   │   ├── color-preferences.ts
│   │   ├── utils.ts            # General utilities (cn, etc.)
│   │   └── ai/                 # AI utilities
│   │       ├── index.ts        # AI module exports
│   │       ├── parse-script.ts # Script parsing logic
│   │       ├── schemas.ts      # Zod validation schemas
│   │       └── time-parser.ts  # Time parsing utilities
│   │
│   ├── stores/                 # Zustand state stores
│   │   ├── editor-store.ts     # Editor UI state
│   │   └── project-store.ts    # Project data state (removed immer.ts)
│   │
│   ├── server/                 # Server-side code
│   │   ├── trpc.ts             # tRPC initialisation
│   │   ├── router.ts           # Main router (appRouter)
│   │   └── routers/            # Individual routers
│   │       ├── projects.ts
│   │       ├── renders.ts
│   │       ├── templates.ts
│   │       ├── library.ts
│   │       └── user.ts
│   │
│   ├── types/                  # TypeScript type definitions
│   │   └── index.ts            # All type exports
│   │
│   └── middleware.ts           # Next.js middleware (auth)
│
├── remotion/                   # Remotion video rendering
│   ├── compositions/           # Video compositions
│   │   └── index.ts            # PropertyClipComposition
│   ├── components/             # Rendering components
│   │   ├── MapRenderer.tsx
│   │   ├── MarkerRenderer.tsx
│   │   ├── RouteRenderer.tsx
│   │   ├── ZoneRenderer.tsx
│   │   ├── LogoOverlay.tsx
│   │   ├── TitleOverlay.tsx
│   │   ├── WatermarkOverlay.tsx
│   │   └── index.ts
│   ├── Root.tsx                # Remotion root + composition definitions
│   ├── index.ts                # Remotion entry
│   └── remotion.config.ts      # Remotion configuration
│
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── migrations/             # Migration files
│
├── infrastructure/
│   └── terraform/              # AWS infrastructure as code
│       ├── main.tf
│       ├── lambda.tf
│       └── terraform.tfvars.example
│
├── scripts/                    # Utility scripts
│   ├── deploy-infrastructure.sh
│   ├── deploy-remotion.sh
│   ├── setup-database.sh
│   ├── setup-dev.sh
│   ├── render-video.sh
│   ├── generate-video.js
│   └── generate-property-video.ts
│
├── e2e/                        # Playwright E2E tests
│   └── auth.spec.ts
│
├── public/                     # Static assets
│
├── docs/                       # Documentation
│   ├── Propnica_Project_Documentation.md
│   ├── Propnica_User_Guide.md
│   ├── Propnica_Code_Review_Report.md
│   └── devopsnotes/
│       └── 001-ubuntu-24-install.md
│
└── examples/                   # Example data
    └── dubai-creek-harbour.json
```

---

## Coding Conventions

### TypeScript
- Strict mode enabled
- Use UK English for type names: `colour`, `centre` (not `color`, `center`)
- All types exported from `src/types/index.ts`
- Use Zod schemas for runtime validation
- Prefer `interface` over `type` for object shapes

### Import Aliases
```typescript
"@/*": ["./src/*"]
"@/components/*": ["./src/components/*"]
"@/lib/*": ["./src/lib/*"]
"@/stores/*": ["./src/stores/*"]
"@/server/*": ["./src/server/*"]
"@/types/*": ["./src/types/*"]
```

### Component Patterns
```typescript
// Prefer named exports for components
export function ComponentName() { ... }

// Use 'use client' directive for client components
'use client';

// Props interface naming
interface ComponentNameProps { ... }
```

### Naming Conventions
- **Files**: kebab-case (`map-canvas.tsx`, `editor-store.ts`)
- **Components**: PascalCase (`MapCanvas`, `EditorStore`)
- **Functions**: camelCase (`handleClick`, `updateProject`)
- **Constants**: SCREAMING_SNAKE_CASE (`DEFAULT_ZOOM`, `MAX_DURATION`)
- **Types/Interfaces**: PascalCase (`ProjectConfig`, `Keyframe`)
- **Enums**: PascalCase with PascalCase members (`RenderStatus.COMPLETE`)

### State Management (Zustand)
```typescript
// Store pattern with Immer middleware
export const useEditorStore = create<EditorState>()(
  immer((set, get) => ({
    // State
    currentTool: 'select',

    // Actions
    setTool: (tool) => set((state) => {
      state.currentTool = tool;
    }),
  }))
);

// Usage in components
const { currentTool, setTool } = useEditorStore();
```

### tRPC Patterns
```typescript
// Router definition
export const projectsRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      // Implementation
    }),
});

// Client usage
const { data } = trpc.projects.list.useQuery({ limit: 10 });
const mutation = trpc.projects.create.useMutation();
```

### CSS/Styling
- Use Tailwind CSS utility classes
- Use `cn()` utility for conditional classes (from `@/lib/utils`)
- CSS custom properties for theming (defined in `globals.css`)
- Radix UI components with Tailwind styling

---

## Key Type Definitions

### ProjectConfig (Core data structure)
```typescript
interface ProjectConfig {
  version: string;
  settings: {
    duration: number;        // seconds
    fps: number;             // 24, 30, or 60
    resolution: '720p' | '1080p' | '4k';
    aspectRatio: '16:9' | '9:16' | '4:3' | '1:1' | etc.;
  };
  mapSettings: {
    style: MapStyle;         // 'satellite', 'streets', etc.
    accessToken?: string;
  };
  keyframes: Keyframe[];
  zones: Zone[];
  routes: Route[];
  textMarkers: TextMarker[];
  branding: BrandingConfig;
}
```

### Keyframe
```typescript
interface Keyframe {
  id: string;
  name: string;
  time: number;              // Start time in seconds
  duration: number;          // Hold duration in seconds
  camera: {
    centre: [number, number]; // [longitude, latitude]
    zoom: number;             // 0-22
    bearing: number;          // 0-360
    pitch: number;            // 0-60
  };
  easing: EasingType;
}
```

### Zone (Polygon)
```typescript
interface Zone {
  id: string;
  name: string;
  coordinates: [number, number][]; // GeoJSON polygon
  style: {
    fillColour: string;
    fillOpacity: number;
    strokeColour: string;
    strokeWidth: number;
  };
  timing?: ElementTiming;
}
```

### Route (Polyline)
```typescript
interface Route {
  id: string;
  name: string;
  coordinates: [number, number][]; // GeoJSON linestring
  style: {
    colour: string;
    width: number;
    opacity?: number;
  };
  animation?: {
    type: 'none' | 'draw' | 'pulse' | 'flow';
    speed: number;
  };
  timing?: ElementTiming;
}
```

### TextMarker
```typescript
interface TextMarker {
  id: string;
  position: [number, number]; // [longitude, latitude]
  text: string;
  style: {
    fontSize: number;
    color: string;
    backgroundColor?: string;
    fontFamily?: string;
    fontWeight?: string;
  };
  icon?: MarkerIcon;
  timing?: ElementTiming;
}
```

### Coordinate System
- Uses GeoJSON format: `[longitude, latitude]` (NOT `[lat, lng]`)
- Mapbox GL JS expects this format
- Be consistent throughout the codebase

---

## Database Schema (Prisma)

### Core Models
```prisma
model UserProfile {
  id          String   @id @default(uuid()) @db.Uuid
  userId      String   @unique @map("user_id") @db.Uuid
  displayName String?  @map("display_name")
  company     String?
  avatarUrl   String?  @map("avatar_url")
  preferences Json     @default("{}")

  projects    Project[]
  renders     Render[]
  templates   Template[]
  libraryItems LibraryItem[]
}

model Project {
  id           String    @id @default(uuid()) @db.Uuid
  userId       String    @map("user_id") @db.Uuid
  name         String
  description  String?
  config       Json      @default("{}")  // ProjectConfig
  thumbnailUrl String?   @map("thumbnail_url")
  duration     Int       @default(30)
  isTemplate   Boolean   @default(false) @map("is_template")
  deletedAt    DateTime? @map("deleted_at")  // Soft delete

  user         UserProfile @relation(...)
  renders      Render[]
}

model Render {
  id           String       @id @default(uuid()) @db.Uuid
  projectId    String       @map("project_id") @db.Uuid
  userId       String       @map("user_id") @db.Uuid
  status       RenderStatus @default(QUEUED)
  resolution   Resolution   @default(HD_1080P)
  progress     Int          @default(0)
  outputUrl    String?      @map("output_url")
  fileSize     Int?         @map("file_size")
  errorMessage String?      @map("error_message")
  renderId     String?      @map("render_id")  // Lambda render ID
  startedAt    DateTime?    @map("started_at")
  completedAt  DateTime?    @map("completed_at")
}

enum RenderStatus {
  QUEUED
  PROCESSING
  COMPLETE
  FAILED
}

enum Resolution {
  HD_720P
  HD_1080P
  UHD_4K
}
```

---

## API Reference (tRPC Routers)

### Projects Router (`/src/server/routers/projects.ts`)
| Procedure | Type | Description |
|-----------|------|-------------|
| `list` | Query | Paginated project list |
| `get` | Query | Single project by ID |
| `create` | Mutation | Create new project |
| `update` | Mutation | Update project (name, config) |
| `delete` | Mutation | Soft delete project |
| `duplicate` | Mutation | Clone project |
| `recent` | Query | Recent projects |
| `count` | Query | User's project count |

### Renders Router (`/src/server/routers/renders.ts`)
| Procedure | Type | Description |
|-----------|------|-------------|
| `list` | Query | Paginated render list |
| `get` | Query | Single render by ID |
| `create` | Mutation | Start new render job |
| `getDownloadUrl` | Query | Signed S3 download URL |
| `cancel` | Mutation | Cancel queued render |
| `delete` | Mutation | Delete render + S3 file |
| `stats` | Query | Render statistics |

### Templates Router (`/src/server/routers/templates.ts`)
| Procedure | Type | Description |
|-----------|------|-------------|
| `list` | Query | Paginated template list |
| `get` | Query | Single template |
| `create` | Mutation | Save project as template |
| `update` | Mutation | Update template metadata |
| `delete` | Mutation | Delete template |
| `clone` | Mutation | Create project from template |

### Library Router (`/src/server/routers/library.ts`)
| Procedure | Type | Description |
|-----------|------|-------------|
| `list` | Query | Paginated library items |
| `get` | Query | Single item with config |
| `create` | Mutation | Save element to library |
| `update` | Mutation | Update item metadata |
| `delete` | Mutation | Delete from library |
| `import` | Mutation | Get config + increment usage |
| `stats` | Query | Counts by type |

### User Router (`/src/server/routers/user.ts`)
| Procedure | Type | Description |
|-----------|------|-------------|
| `getProfile` | Query | Get/create user profile |
| `updateProfile` | Mutation | Update profile details |

---

## Environment Variables

### Required Variables
```env
# Database
DATABASE_URL="postgresql://user:pass@host:5432/propnica"
DIRECT_URL="postgresql://user:pass@host:5432/propnica"  # For migrations

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJxxx"
SUPABASE_SERVICE_ROLE_KEY="eyJxxx"

# Mapbox
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN="pk.xxx"

# AWS S3
AWS_ACCESS_KEY_ID="AKIAxxx"
AWS_SECRET_ACCESS_KEY="xxx"
AWS_REGION="eu-central-1"

# Remotion Lambda
REMOTION_AWS_REGION="eu-central-1"
REMOTION_LAMBDA_FUNCTION_NAME="remotion-render-prod"
REMOTION_SERVE_URL="https://xxx.s3.eu-central-1.amazonaws.com/sites/xxx"
REMOTION_S3_BUCKET="propnica-renders-prod"

# Application
NEXT_PUBLIC_APP_URL="https://app.propnica.com"
```

### Optional Variables
```env
# AI Features
ANTHROPIC_API_KEY="sk-ant-xxx"

# Stripe (payments)
STRIPE_SECRET_KEY="sk_xxx"
STRIPE_WEBHOOK_SECRET="whsec_xxx"

# Analytics
NEXT_PUBLIC_POSTHOG_KEY="phc_xxx"

# Error Tracking
SENTRY_DSN="https://xxx@sentry.io/xxx"
```

---

## Development Commands

### Common Commands
```bash
# Development
npm run dev              # Start Next.js dev server (port 3000)
npm run build            # Production build
npm run start            # Start production server
npm run lint             # ESLint check
npm run lint:fix         # Auto-fix lint errors
npm run type-check       # TypeScript type checking

# Database
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema to database
npm run db:migrate       # Create migration
npm run db:studio        # Open Prisma Studio

# Remotion
npm run remotion:dev     # Start Remotion Studio (port 3001)
npm run remotion:build   # Bundle Remotion compositions
npm run remotion:deploy  # Deploy to Remotion Lambda

# Testing
npm run test             # Run unit tests (Vitest)
npm run test:e2e         # Run E2E tests (Playwright)
```

### Setup Commands
```bash
# Initial setup
npm install --legacy-peer-deps  # Note: legacy-peer-deps required
cp .env.example .env.local
npm run db:generate
npm run db:push
npm run dev
```

---

## Infrastructure (AWS via Terraform)

### S3 Buckets
- `propnica-renders-{env}` - Video outputs (30-day lifecycle)
- `propnica-assets-{env}` - User uploads (versioned)
- `propnica-thumbnails-{env}` - Project thumbnails (public)

### Lambda
- Remotion Lambda function for video rendering
- Memory: 2048 MB
- Timeout: 900 seconds (15 minutes)
- Region: eu-central-1

### CloudFront
- CDN distribution for rendered videos
- Origin Access Control for S3

### SQS
- `propnica-render-jobs` queue
- Dead-letter queue for failed renders
- Visibility timeout: 930s

### Deployment
```bash
# Deploy infrastructure
cd infrastructure/terraform
terraform init
terraform plan
terraform apply

# Deploy Remotion Lambda
npm run remotion:deploy
```

---

## Remotion Video Rendering

### Architecture
```
User clicks Render
    ↓
renders.create() → Creates Render record (QUEUED)
    ↓
renderVideo() → Calls Remotion Lambda
    ↓
PropertyClipComposition → Renders frames
    ↓
FFmpeg encodes → MP4 to S3
    ↓
Poll progress → Update Render record (COMPLETE)
```

### Composition Structure
```typescript
// remotion/Root.tsx
<Composition
  id="PropertyClip"
  component={PropertyClipComposition}
  durationInFrames={calculateDuration(config)}
  fps={config.settings.fps}
  width={getWidth(config.settings.resolution)}
  height={getHeight(config.settings.resolution)}
  defaultProps={{ config: defaultProjectConfig }}
/>
```

### Resolution Presets
| Preset | Width | Height |
|--------|-------|--------|
| HD_720P | 1280 | 720 |
| HD_1080P | 1920 | 1080 |
| UHD_4K | 3840 | 2160 |

---

## Authentication Flow

```
Client → Supabase Auth → Callback Handler → Session Cookie
                                                  ↓
                                            Middleware
                                                  ↓
                                          tRPC Context
                                                  ↓
                                        Protected Procedures
```

### Protected Routes
- All `/app/(dashboard)/*` routes
- `/editor/[id]`

### Public Routes
- `/` (landing)
- `/login`, `/signup`, `/reset-password`
- `/auth/callback`
- `/api/webhooks/*`

---

## Known Issues & Technical Debt

### Critical Issues (from Code Review)
All critical issues from the January 2026 code review have been resolved:
- ✅ AWS SDK dependencies added
- ✅ Remotion type mismatches fixed (using `TextMarker`, `Zone`, `Route`)
- ✅ Route property access corrected (using nested `style.*`)
- ✅ TitleStyle type defined
- ✅ tRPC procedure names aligned (`renders.create`, `renders.get`)
- ✅ Timeline function names corrected (`zoomIn`, `zoomOut`)
- ✅ Toolbar component accepts props correctly
- ✅ Settings modal uses `config` key correctly

### Technical Debt
- No React error boundaries
- Minimal test coverage
- No structured logging
- No APM integration
- Incomplete JSDoc comments

---

## Editor Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `V` | Select tool |
| `H` | Pan/Hand tool |
| `Z` | Draw zone (pencil) |
| `R` | Draw route |
| `M` | Add marker |
| `U` | Rectangle zone |
| `O` | Circle zone |
| `Space` | Play/Pause |
| `K` | Add keyframe |
| `[` / `]` | Previous/Next keyframe |
| `+` / `-` | Zoom timeline |
| `Ctrl+S` | Save |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Delete` | Delete selected |
| `Escape` | Clear selection / Cancel drawing |
| `?` | Show shortcuts modal |

---

## Git Workflow

### Branch Strategy
```
main (production)
  └── develop (staging)
        ├── feature/XXX-description
        ├── bugfix/XXX-description
        └── hotfix/XXX-description
```

### Commit Convention
```
type(scope): description

Types: feat, fix, docs, style, refactor, test, chore
Scope: editor, timeline, api, auth, render, ui
```

---

## Useful Patterns

### Auto-save Implementation
```typescript
// Project store watches isDirty flag
// Debounced save after 2 seconds of inactivity
useEffect(() => {
  if (isDirty && projectId) {
    const timer = setTimeout(() => {
      saveProject();
    }, 2000);
    return () => clearTimeout(timer);
  }
}, [isDirty, projectId]);
```

### History (Undo/Redo)
```typescript
// Max 50 items in undo stack
// Uses Immer for immutable updates
undo: () => set((state) => {
  if (state.past.length === 0) return;
  const previous = state.past[state.past.length - 1];
  state.future.unshift(state.config);
  state.config = previous;
  state.past.pop();
});
```

### Touch Gesture Support
- Map canvas supports pinch-to-zoom
- Two-finger drag to rotate/tilt
- Gesture hint shown on first touch (stored in localStorage)

---

## Common Tasks

### Adding a New tRPC Procedure
1. Add procedure to relevant router in `/src/server/routers/`
2. Define Zod input schema
3. Implement query/mutation logic
4. Use in client with `trpc.router.procedure.useQuery/useMutation()`

### Adding a New Editor Tool
1. Add tool type to `EditorTool` union in types
2. Add tool button to Toolbar component
3. Handle tool in MapCanvas event handlers
4. Add keyboard shortcut if needed

### Adding a New Remotion Component
1. Create component in `/remotion/components/`
2. Import types from `../../src/types`
3. Use `useCurrentFrame()` and `useVideoConfig()` hooks
4. Add to PropertyClipComposition render

---

## Contacts & Resources

- **Repository**: GitHub (private)
- **Documentation**: `/docs/` folder
- **Issue Tracker**: GitHub Issues
- **Supabase Dashboard**: https://app.supabase.com
- **AWS Console**: eu-central-1 region
- **Mapbox Dashboard**: https://account.mapbox.com

---

*Last updated: January 2026*
