# Propnica Project Documentation

## Complete Technical & Business Reference

**Document Version:** 1.0.0  
**Last Updated:** 24 January 2026  
**Classification:** Internal - All Teams  
**Maintainers:** Development Team Lead

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision & Business Context](#2-product-vision--business-context)
3. [Architecture Overview](#3-architecture-overview)
4. [Technology Stack](#4-technology-stack)
5. [Project Structure](#5-project-structure)
6. [Database Schema](#6-database-schema)
7. [API Reference](#7-api-reference)
8. [Authentication & Authorisation](#8-authentication--authorisation)
9. [Core Features & Modules](#9-core-features--modules)
10. [State Management](#10-state-management)
11. [Remotion Video Rendering](#11-remotion-video-rendering)
12. [UI Component Library](#12-ui-component-library)
13. [External Integrations](#13-external-integrations)
14. [Environment Configuration](#14-environment-configuration)
15. [Development Workflow](#15-development-workflow)
16. [Testing Strategy](#16-testing-strategy)
17. [Deployment & Infrastructure](#17-deployment--infrastructure)
18. [Performance Considerations](#18-performance-considerations)
19. [Security Considerations](#19-security-considerations)
20. [Known Issues & Technical Debt](#20-known-issues--technical-debt)
21. [Glossary](#21-glossary)

---

## 1. Executive Summary

### 1.1 What is Propnica?

Propnica is a cloud-based SaaS platform that enables real estate professionals to create cinematic property showcase videos featuring animated map journeys. The platform combines interactive map editing with professional video rendering capabilities, allowing users to create stunning visual content without video editing expertise.

### 1.2 Target Market

- **Primary:** UAE real estate agencies and property developers
- **Secondary:** International real estate professionals
- **Tertiary:** Property marketing agencies

### 1.3 Key Value Propositions

1. **No Video Editing Skills Required:** Intuitive visual editor with drag-and-drop functionality
2. **Professional Output Quality:** Broadcast-ready 4K video export
3. **Map-Centric Storytelling:** Cinematic camera movements across interactive maps
4. **Brand Customisation:** Full white-labelling with logos, watermarks, and colour schemes
5. **Cloud-Based Rendering:** No local hardware requirements for video processing

### 1.4 Project Metrics

| Metric | Value |
|--------|-------|
| Total Source Files | 88 TypeScript/TSX |
| Lines of Code | 17,712 |
| Development Phases | 10 (all complete) |
| Estimated Launch | Q2 2026 |

---

## 2. Product Vision & Business Context

### 2.1 Problem Statement

Real estate professionals need compelling visual content to market properties effectively. Traditional video production is expensive (AED 5,000-15,000 per video) and time-consuming (1-2 weeks turnaround). Existing solutions either lack professional quality or require technical expertise.

### 2.2 Solution

Propnica democratises professional property video creation by providing:

- **Visual Timeline Editor:** Keyframe-based animation system
- **Interactive Map Canvas:** Direct manipulation of camera paths
- **Element Overlays:** Zones, routes, markers, and text annotations
- **Cloud Rendering:** Server-side video generation using Remotion
- **Template System:** Reusable project configurations

### 2.3 User Personas

#### Persona 1: Agency Marketing Manager
- **Goals:** Create consistent branded content across listings
- **Pain Points:** Budget constraints, time pressure, quality inconsistency
- **Feature Focus:** Templates, branding, batch processing

#### Persona 2: Independent Agent
- **Goals:** Stand out from competition with professional marketing
- **Pain Points:** No technical skills, limited budget
- **Feature Focus:** Ease of use, quick turnaround, affordable pricing

#### Persona 3: Property Developer
- **Goals:** Showcase developments with cinematic presentations
- **Pain Points:** Complex projects, multiple stakeholders
- **Feature Focus:** High resolution, collaboration, export options

### 2.4 Competitive Landscape

| Competitor | Strengths | Weaknesses | Our Differentiation |
|------------|-----------|------------|---------------------|
| Animoto | Easy to use | No map features | Map-centric focus |
| Google Earth Studio | Powerful maps | Complex, desktop only | Cloud-based, simpler |
| Mapbox Studio | Developer-friendly | Requires coding | No-code interface |
| Promo.com | Template library | Generic content | Real estate specific |

---

## 3. Architecture Overview

### 3.1 High-Level Architecture

```
+-------------------------------------------------------------------------+
|                              CLIENT LAYER                                |
|  +-------------+  +-------------+  +-------------+  +-------------+     |
|  |   Next.js   |  |   Mapbox    |  |   Zustand   |  |    Radix    |     |
|  |  App Router |  |   GL JS     |  |   Stores    |  |     UI      |     |
|  +------+------+  +------+------+  +------+------+  +------+------+     |
+---------|-----------------|-----------------|-----------------|---------+
          |                 |                 |                 |
          V                 V                 V                 V
+-------------------------------------------------------------------------+
|                              API LAYER                                   |
|  +------------------------------------------------------------------+   |
|  |                        tRPC Router                                |   |
|  |  +----------+ +----------+ +----------+ +----------+             |   |
|  |  | Projects | | Renders  | |Templates | |   User   |             |   |
|  |  +----------+ +----------+ +----------+ +----------+             |   |
|  +------------------------------------------------------------------+   |
+-------------------------------------------------------------------------+
          |                 |                 |                 |
          V                 V                 V                 V
+-------------------------------------------------------------------------+
|                            SERVICE LAYER                                 |
|  +-------------+  +-------------+  +-------------+  +-------------+     |
|  |   Prisma    |  |  Supabase   |  |   AWS S3    |  |  Remotion   |     |
|  |    ORM      |  |    Auth     |  |   Storage   |  |  Renderer   |     |
|  +------+------+  +------+------+  +------+------+  +------+------+     |
+---------|-----------------|-----------------|-----------------|---------+
          |                 |                 |                 |
          V                 V                 V                 V
+-------------------------------------------------------------------------+
|                          INFRASTRUCTURE LAYER                            |
|  +-------------+  +-------------+  +-------------+  +-------------+     |
|  | PostgreSQL  |  |  Supabase   |  |   AWS S3    |  |   Lambda    |     |
|  |  Database   |  |   Cloud     |  |   Bucket    |  |  Functions  |     |
|  +-------------+  +-------------+  +-------------+  +-------------+     |
+-------------------------------------------------------------------------+
```

### 3.2 Data Flow

```
User Action -> React Component -> Zustand Store -> tRPC Mutation -> Prisma -> PostgreSQL
                                      |
                              Local State Update
                                      |
                              UI Re-render
```

### 3.3 Rendering Pipeline

```
Project Config -> Remotion Composition -> Frame-by-Frame Render -> FFmpeg Encode -> S3 Upload
      |                  |                      |                    |             |
      V                  V                      V                    V             V
   JSON Data      React Components      PNG Sequences         MP4/WebM        Signed URL
```

---

## 4. Technology Stack

### 4.1 Frontend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.1.3 | React framework with App Router |
| React | 18.2.0 | UI component library |
| TypeScript | 5.3.3 | Type-safe JavaScript |
| Tailwind CSS | 3.4.1 | Utility-first CSS framework |
| Radix UI | Various | Accessible UI primitives |
| Framer Motion | 11.0.5 | Animation library |
| Mapbox GL JS | 3.2.0 | Interactive map rendering |
| Zustand | 4.5.0 | State management |
| React Hook Form | 7.x | Form handling |
| Zod | 3.22.4 | Schema validation |

### 4.2 Backend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| tRPC | 10.45.0 | End-to-end typesafe APIs |
| Prisma | 5.10.0 | Database ORM |
| Supabase Auth | 2.x | Authentication service |
| AWS SDK | 3.x | S3 file operations |

### 4.3 Video Rendering

| Technology | Version | Purpose |
|------------|---------|---------|
| Remotion | 4.0.114 | Programmatic video creation |
| FFmpeg | System | Video encoding |

### 4.4 Database

| Technology | Version | Purpose |
|------------|---------|---------|
| PostgreSQL | 15+ | Primary database |
| Prisma Migrate | 5.10.0 | Schema migrations |

### 4.5 Development Tools

| Tool | Purpose |
|------|---------|
| Vitest | Unit testing |
| Playwright | E2E testing |
| ESLint | Code linting |
| Prettier | Code formatting |
| Husky | Git hooks |

### 4.6 System Requirements

```
Node.js: >=20.0.0
npm: >=10.0.0
PostgreSQL: >=15.0
```

---

## 5. Project Structure

### 5.1 Directory Layout

```
propnica/
|-- src/
|   |-- app/                    # Next.js App Router pages
|   |   |-- (auth)/             # Authentication routes
|   |   |   |-- login/
|   |   |   |-- signup/
|   |   |   +-- reset-password/
|   |   |-- (dashboard)/        # Protected dashboard routes
|   |   |   |-- projects/
|   |   |   |-- templates/
|   |   |   |-- renders/
|   |   |   +-- settings/
|   |   |-- editor/[id]/        # Project editor
|   |   |-- api/                # API routes
|   |   |   |-- trpc/[trpc]/    # tRPC handler
|   |   |   +-- webhooks/       # Webhook handlers
|   |   |-- layout.tsx          # Root layout
|   |   |-- page.tsx            # Landing page
|   |   +-- globals.css         # Global styles
|   |
|   |-- components/             # React components
|   |   |-- ui/                 # Base UI components (Radix-based)
|   |   |-- editor/             # Editor-specific components
|   |   |   |-- map-canvas.tsx
|   |   |   |-- toolbar.tsx
|   |   |   |-- property-panel.tsx
|   |   |   |-- keyboard-shortcuts-modal.tsx
|   |   |   +-- settings-modal.tsx
|   |   |-- timeline/           # Timeline components
|   |   |   +-- timeline.tsx
|   |   |-- preview/            # Preview/render components
|   |   |   |-- preview-modal.tsx
|   |   |   +-- render-modal.tsx
|   |   |-- dashboard/          # Dashboard components
|   |   +-- shared/             # Shared components
|   |
|   |-- lib/                    # Utility libraries
|   |   |-- trpc.ts             # tRPC client
|   |   |-- supabase.ts         # Supabase clients
|   |   |-- s3.ts               # S3 operations
|   |   |-- utils.ts            # General utilities
|   |   +-- constants.ts        # Application constants
|   |
|   |-- stores/                 # Zustand state stores
|   |   |-- editor-store.ts     # Editor UI state
|   |   |-- project-store.ts    # Project data state
|   |   +-- index.ts            # Store exports
|   |
|   |-- server/                 # Server-side code
|   |   |-- trpc.ts             # tRPC initialisation
|   |   |-- router.ts           # Main router
|   |   +-- routers/            # Individual routers
|   |       |-- projects.ts
|   |       |-- renders.ts
|   |       |-- templates.ts
|   |       +-- user.ts
|   |
|   |-- types/                  # TypeScript type definitions
|   |   +-- index.ts            # All type exports
|   |
|   |-- hooks/                  # Custom React hooks
|   |   |-- use-debounce.ts
|   |   |-- use-map.ts
|   |   +-- use-keyboard-shortcuts.ts
|   |
|   +-- middleware.ts           # Next.js middleware
|
|-- remotion/                   # Remotion video rendering
|   |-- compositions/           # Video compositions
|   |   +-- PropertyClipComposition.tsx
|   |-- components/             # Rendering components
|   |   |-- MapRenderer.tsx
|   |   |-- MarkerRenderer.tsx
|   |   |-- RouteRenderer.tsx
|   |   |-- LogoOverlay.tsx
|   |   |-- TitleOverlay.tsx
|   |   |-- WatermarkOverlay.tsx
|   |   +-- index.ts
|   |-- Root.tsx                # Remotion root
|   +-- index.ts                # Remotion entry
|
|-- prisma/
|   |-- schema.prisma           # Database schema
|   +-- migrations/             # Migration files
|
|-- public/                     # Static assets
|   |-- fonts/
|   +-- images/
|
|-- tests/                      # Test files
|   |-- unit/
|   |-- integration/
|   +-- e2e/
|
|-- .env.example                # Environment template
|-- .env.local                  # Local environment (gitignored)
|-- next.config.js              # Next.js configuration
|-- tailwind.config.js          # Tailwind configuration
|-- tsconfig.json               # TypeScript configuration
|-- package.json                # Dependencies
+-- README.md                   # Project readme
```

### 5.2 Import Aliases

```typescript
// tsconfig.json paths
{
  "@/*": ["./src/*"],
  "@/components/*": ["./src/components/*"],
  "@/lib/*": ["./src/lib/*"],
  "@/stores/*": ["./src/stores/*"],
  "@/server/*": ["./src/server/*"],
  "@/types/*": ["./src/types/*"]
}
```

---

## 6. Database Schema

### 6.1 Entity Relationship Diagram

```
+-------------+       +-------------+       +-------------+
|    User     |       |   Project   |       |   Render    |
+-------------+       +-------------+       +-------------+
| id (PK)     |--+    | id (PK)     |--+    | id (PK)     |
| email       |  |    | userId (FK) |<-+    | projectId   |<--+
| createdAt   |  |    | name        |       | status      |   |
| updatedAt   |  |    | description |       | progress    |   |
+-------------+  |    | config      |-------| outputUrl   |   |
                 |    | thumbnail   |       | createdAt   |   |
+-------------+  |    | createdAt   |       +-------------+   |
| UserProfile |  |    | updatedAt   |                         |
+-------------+  |    | deletedAt   |                         |
| id (PK)     |  |    +-------------+                         |
| userId (FK) |<-+                                            |
| displayName |  |    +-------------+                         |
| company     |  |    |  Template   |                         |
| avatarUrl   |  |    +-------------+                         |
| preferences |  |    | id (PK)     |                         |
+-------------+  |    | userId (FK) |<------------------------+
                 |    | name        |                         |
                 |    | config      |                         |
                 |    | category    |                         |
                 |    | isPublic    |                         |
                 +----| usageCount  |                         |
                      +-------------+                         |
                                                              |
                      +-------------+                         |
                      | Subscription|                         |
                      +-------------+                         |
                      | id (PK)     |                         |
                      | userId (FK) |<------------------------+
                      | plan        |
                      | status      |
                      | stripeId    |
                      +-------------+
```

### 6.2 Core Tables

#### UserProfile Table
```prisma
model UserProfile {
  id          String   @id @default(uuid()) @db.Uuid
  userId      String   @unique @map("user_id") @db.Uuid
  displayName String?  @map("display_name") @db.VarChar(100)
  company     String?  @db.VarChar(200)
  avatarUrl   String?  @map("avatar_url") @db.Text
  preferences Json     @default("{}")
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt   DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  projects  Project[]
  renders   Render[]
  templates Template[]

  @@map("user_profiles")
}
```

#### Project Table
```prisma
model Project {
  id           String    @id @default(uuid()) @db.Uuid
  userId       String    @map("user_id") @db.Uuid
  name         String    @db.VarChar(200)
  description  String?   @db.Text
  config       Json      @default("{}")
  thumbnailUrl String?   @map("thumbnail_url") @db.Text
  duration     Int       @default(30)
  isTemplate   Boolean   @default(false) @map("is_template")
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt    DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt    DateTime? @map("deleted_at") @db.Timestamptz(6)

  user    UserProfile @relation(fields: [userId], references: [userId], onDelete: Cascade)
  renders Render[]

  @@index([userId])
  @@index([updatedAt(sort: Desc)])
  @@index([isTemplate])
  @@map("projects")
}
```

#### Render Table
```prisma
model Render {
  id           String       @id @default(uuid()) @db.Uuid
  projectId    String       @map("project_id") @db.Uuid
  userId       String       @map("user_id") @db.Uuid
  status       RenderStatus @default(QUEUED)
  resolution   Resolution   @default(HD_1080P)
  progress     Int          @default(0)
  outputUrl    String?      @map("output_url") @db.Text
  fileSize     Int?         @map("file_size")
  errorMessage String?      @map("error_message") @db.Text
  renderId     String?      @map("render_id") @db.VarChar(100)
  startedAt    DateTime?    @map("started_at") @db.Timestamptz(6)
  completedAt  DateTime?    @map("completed_at") @db.Timestamptz(6)
  createdAt    DateTime     @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt    DateTime     @updatedAt @map("updated_at") @db.Timestamptz(6)

  project Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user    UserProfile @relation(fields: [userId], references: [userId], onDelete: Cascade)

  @@index([projectId])
  @@index([userId])
  @@index([status])
  @@index([createdAt(sort: Desc)])
  @@map("renders")
}
```

#### Template Table
```prisma
model Template {
  id           String   @id @default(uuid()) @db.Uuid
  userId       String   @map("user_id") @db.Uuid
  name         String   @db.VarChar(200)
  description  String?  @db.Text
  config       Json     @default("{}")
  thumbnailUrl String?  @map("thumbnail_url") @db.Text
  category     String?  @db.VarChar(50)
  isPublic     Boolean  @default(false) @map("is_public")
  usageCount   Int      @default(0) @map("usage_count")
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt    DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  user UserProfile @relation(fields: [userId], references: [userId], onDelete: Cascade)

  @@index([userId])
  @@index([isPublic])
  @@index([category])
  @@map("templates")
}
```

#### Enums
```prisma
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

### 6.3 JSON Schema: ProjectConfig

The `config` column in Projects and Templates stores the complete project state:

```typescript
interface ProjectConfig {
  settings: ProjectSettings;
  mapSettings: MapSettings;
  keyframes: Keyframe[];
  zones: Zone[];
  routes: Route[];
  textMarkers: TextMarker[];
  branding: BrandingConfig;
}

interface ProjectSettings {
  resolution: '720p' | '1080p' | '4k';
  frameRate: 24 | 30 | 60;
  duration: number; // seconds
  backgroundColour: string;
}

interface MapSettings {
  style: MapStyle;
  centre: [number, number]; // [longitude, latitude]
  zoom: number;
  bearing: number;
  pitch: number;
  enable3DBuildings: boolean;
  showLabels: boolean;
}

interface Keyframe {
  id: string;
  time: number;        // milliseconds from start
  duration: number;    // milliseconds
  camera: CameraState;
  easing: EasingType;
  label?: string;
}

interface CameraState {
  centre: [number, number]; // [longitude, latitude]
  zoom: number;             // 0-22
  bearing: number;          // 0-360
  pitch: number;            // 0-60
}

interface Zone {
  id: string;
  name: string;
  coordinates: [number, number][];
  style: ZoneStyle;
  label?: ZoneLabel;
  timing: ElementTiming;
}

interface ZoneStyle {
  fillColour: string;
  fillOpacity: number;
  strokeColour: string;
  strokeWidth: number;
  strokeOpacity: number;
}

interface Route {
  id: string;
  name: string;
  coordinates: [number, number][];
  style: RouteStyle;
  label?: RouteLabel;
  animation: RouteAnimation;
  timing: ElementTiming;
}

interface RouteStyle {
  colour: string;
  width: number;
  opacity: number;
  dashPattern?: number[];
}

interface RouteAnimation {
  type: 'none' | 'draw' | 'pulse' | 'flow';
  speed: number;
}

interface TextMarker {
  id: string;
  position: [number, number];
  text: string;
  style: TextMarkerStyle;
  icon?: MarkerIcon;
  timing: ElementTiming;
}

interface TextMarkerStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  colour: string;
  backgroundColour?: string;
  padding?: number;
  borderRadius?: number;
}

interface ElementTiming {
  startTime: number;      // When element appears (ms)
  endTime: number;        // When element disappears (ms)
  fadeInDuration: number; // Fade in duration (ms)
  fadeOutDuration: number;// Fade out duration (ms)
}

interface BrandingConfig {
  logo?: LogoConfig;
  watermark?: WatermarkConfig;
  colours: BrandColours;
}

interface LogoConfig {
  url: string;
  position: OverlayPosition;
  size: number;
  opacity: number;
  timing: ElementTiming;
}

interface WatermarkConfig {
  text: string;
  position: OverlayPosition;
  fontSize: number;
  colour: string;
  opacity: number;
}

type OverlayPosition = 
  | 'top-left' | 'top-center' | 'top-right'
  | 'middle-left' | 'middle-center' | 'middle-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

type EasingType = 
  | 'linear' 
  | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out'
  | 'spring';

type MapStyle = 
  | 'satellite' 
  | 'satellite-streets' 
  | 'streets' 
  | 'light' 
  | 'dark' 
  | 'outdoors';
```

---

## 7. API Reference

### 7.1 tRPC Router Structure

```typescript
appRouter = {
  projects: projectsRouter,
  renders: rendersRouter,
  templates: templatesRouter,
  user: userRouter,
}
```

### 7.2 Projects Router

#### `projects.list`
**Type:** Query  
**Auth:** Required  
**Description:** List user's projects with pagination

```typescript
// Input
{
  cursor?: string;
  limit?: number; // default: 20, max: 100
  sortBy?: 'createdAt' | 'updatedAt' | 'name';
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

// Output
{
  items: Project[];
  nextCursor?: string;
  totalCount: number;
}
```

#### `projects.get`
**Type:** Query  
**Auth:** Required  
**Description:** Get single project by ID

```typescript
// Input
{ id: string }

// Output
Project | null
```

#### `projects.create`
**Type:** Mutation  
**Auth:** Required  
**Description:** Create new project

```typescript
// Input
{
  name: string;
  description?: string;
  config?: ProjectConfig;
  templateId?: string;
}

// Output
Project
```

#### `projects.update`
**Type:** Mutation  
**Auth:** Required  
**Description:** Update existing project

```typescript
// Input
{
  id: string;
  name?: string;
  description?: string;
  config?: ProjectConfig;
  thumbnailUrl?: string;
}

// Output
Project
```

#### `projects.delete`
**Type:** Mutation  
**Auth:** Required  
**Description:** Soft delete project

```typescript
// Input
{ id: string }

// Output
{ success: boolean }
```

#### `projects.duplicate`
**Type:** Mutation  
**Auth:** Required  
**Description:** Clone existing project

```typescript
// Input
{
  id: string;
  name?: string;
}

// Output
Project
```

### 7.3 Renders Router

#### `renders.list`
**Type:** Query  
**Auth:** Required  
**Description:** List renders for a project

```typescript
// Input
{
  projectId?: string;
  status?: RenderStatus;
  cursor?: string;
  limit?: number;
}

// Output
{
  items: Render[];
  nextCursor?: string;
}
```

#### `renders.get`
**Type:** Query  
**Auth:** Required  
**Description:** Get render by ID with status

```typescript
// Input
{ id: string }

// Output
Render
```

#### `renders.create`
**Type:** Mutation  
**Auth:** Required  
**Description:** Start new render job

```typescript
// Input
{
  projectId: string;
  resolution: '720p' | '1080p' | '4k';
  format: 'mp4' | 'webm' | 'gif';
  fps: 24 | 30 | 60;
}

// Output
Render
```

#### `renders.getDownloadUrl`
**Type:** Query  
**Auth:** Required  
**Description:** Get signed download URL

```typescript
// Input
{ id: string }

// Output
{ url: string; expiresAt: Date }
```

#### `renders.cancel`
**Type:** Mutation  
**Auth:** Required  
**Description:** Cancel queued/processing render

```typescript
// Input
{ id: string }

// Output
{ success: boolean }
```

#### `renders.delete`
**Type:** Mutation  
**Auth:** Required  
**Description:** Delete render record and file

```typescript
// Input
{ id: string }

// Output
{ success: boolean }
```

#### `renders.stats`
**Type:** Query  
**Auth:** Required  
**Description:** Get render statistics for user

```typescript
// Output
{
  totalRenders: number;
  completedRenders: number;
  failedRenders: number;
  totalDuration: number;
  totalFileSize: number;
}
```

### 7.4 Templates Router

#### `templates.list`
**Type:** Query  
**Auth:** Required  
**Description:** List templates

```typescript
// Input
{
  category?: string;
  includePublic?: boolean;
  cursor?: string;
  limit?: number;
}

// Output
{
  items: Template[];
  nextCursor?: string;
}
```

#### `templates.get`
**Type:** Query  
**Auth:** Required  
**Description:** Get template by ID

```typescript
// Input
{ id: string }

// Output
Template
```

#### `templates.create`
**Type:** Mutation  
**Auth:** Required  
**Description:** Create template from project

```typescript
// Input
{
  projectId: string;
  name: string;
  description?: string;
  category: string;
  isPublic?: boolean;
}

// Output
Template
```

#### `templates.update`
**Type:** Mutation  
**Auth:** Required  
**Description:** Update template metadata

```typescript
// Input
{
  id: string;
  name?: string;
  description?: string;
  category?: string;
  isPublic?: boolean;
}

// Output
Template
```

#### `templates.delete`
**Type:** Mutation  
**Auth:** Required  
**Description:** Delete template

```typescript
// Input
{ id: string }

// Output
{ success: boolean }
```

#### `templates.categories`
**Type:** Query  
**Auth:** Required  
**Description:** Get template categories with counts

```typescript
// Output
Array<{ name: string; count: number }>
```

#### `templates.popular`
**Type:** Query  
**Auth:** Required  
**Description:** Get most-used public templates

```typescript
// Input
{ limit?: number }

// Output
Template[]
```

### 7.5 User Router

#### `user.getProfile`
**Type:** Query  
**Auth:** Required  
**Description:** Get user profile (auto-creates if missing)

```typescript
// Output
UserProfile
```

#### `user.updateProfile`
**Type:** Mutation  
**Auth:** Required  
**Description:** Update profile details

```typescript
// Input
{
  displayName?: string;
  company?: string;
  avatarUrl?: string;
}

// Output
UserProfile
```

#### `user.updatePreferences`
**Type:** Mutation  
**Auth:** Required  
**Description:** Update user preferences

```typescript
// Input
{
  defaultResolution?: string;
  defaultDuration?: number;
  autoSave?: boolean;
  showTutorials?: boolean;
  theme?: 'light' | 'dark' | 'system';
}

// Output
UserProfile
```

#### `user.getStats`
**Type:** Query  
**Auth:** Required  
**Description:** Get usage statistics

```typescript
// Output
{
  projectCount: number;
  templateCount: number;
  renderCount: number;
  totalDuration: number;
}
```

#### `user.deleteAccount`
**Type:** Mutation  
**Auth:** Required  
**Description:** Delete user account and all data (GDPR)

```typescript
// Output
{ success: boolean }
```

#### `user.exportData`
**Type:** Query  
**Auth:** Required  
**Description:** Export all user data (GDPR)

```typescript
// Output
{
  profile: UserProfile;
  projects: Project[];
  renders: Render[];
  templates: Template[];
  exportedAt: Date;
}
```

---

## 8. Authentication & Authorisation

### 8.1 Authentication Flow

```
+-------------+     +-------------+     +-------------+
|   Client    |---->|  Supabase   |---->|  Callback   |
|  (Login)    |     |    Auth     |     |   Handler   |
+-------------+     +-------------+     +------+------+
                                               |
                                               V
+-------------+     +-------------+     +-------------+
|  Protected  |<----|  Middleware |<----|   Session   |
|    Route    |     |   Check     |     |   Cookie    |
+-------------+     +-------------+     +-------------+
```

### 8.2 Supported Auth Methods

1. **Email/Password:** Traditional registration and login
2. **Magic Link:** Passwordless email authentication
3. **OAuth Providers:** Google, GitHub (configurable)

### 8.3 Session Management

- **Session Storage:** HTTP-only cookies
- **Token Refresh:** Automatic via Supabase middleware
- **Session Duration:** 7 days (configurable)

### 8.4 Middleware Protection

```typescript
// src/middleware.ts
const publicRoutes = [
  '/login',
  '/signup', 
  '/reset-password',
  '/auth/callback',
  '/api/webhooks',
];

// All other routes require authentication
```

### 8.5 API Authentication

```typescript
// tRPC context extracts user from Supabase session
export async function createTRPCContext({ headers }: { headers: Headers }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  return {
    userId: user?.id,
    prisma,
  };
}

// Protected procedures verify userId exists
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});
```

### 8.6 Authorisation Rules

| Resource | Create | Read | Update | Delete |
|----------|--------|------|--------|--------|
| Own Projects | Yes | Yes | Yes | Yes |
| Own Renders | Yes | Yes | No | Yes |
| Own Templates | Yes | Yes | Yes | Yes |
| Public Templates | No | Yes | No | No |
| Own Profile | No | Yes | Yes | Yes |

---

## 9. Core Features & Modules

### 9.1 Project Management

**Location:** `/src/app/(dashboard)/projects/`

**Features:**
- Project listing with grid/list view toggle
- Search and filter capabilities
- Sort by name, date created, date modified
- Project creation from blank or template
- Project duplication
- Soft delete with recovery option
- Thumbnail preview generation

### 9.2 Visual Editor

**Location:** `/src/app/editor/[id]/`

**Components:**
- **Map Canvas:** Interactive Mapbox GL map with direct manipulation
- **Toolbar:** Tool selection, undo/redo, zoom controls
- **Property Panel:** Context-aware property editing
- **Timeline:** Keyframe-based animation control

**Editor Tools:**

| Tool | Shortcut | Purpose |
|------|----------|---------|
| Select | V | Select and move elements |
| Pan | H | Pan the map view |
| Draw Zone | Z | Create polygon zones |
| Draw Route | R | Create route paths |
| Add Marker | M | Place map markers |
| Add Text | T | Add text annotations |
| Rectangle | U | Draw rectangular zones |
| Circle | O | Draw circular zones |

**Additional Shortcuts:**

| Shortcut | Action |
|----------|--------|
| Ctrl/Cmd + S | Save project |
| Ctrl/Cmd + Z | Undo |
| Ctrl/Cmd + Shift + Z | Redo |
| Space | Toggle playback |
| Delete/Backspace | Delete selected |
| Escape | Clear selection |
| + / = | Zoom in |
| - | Zoom out |
| 0 | Reset zoom |
| [ | Previous keyframe |
| ] | Next keyframe |
| K | Add keyframe at current time |
| ? | Show keyboard shortcuts |

### 9.3 Timeline & Animation

**Location:** `/src/components/timeline/`

**Features:**
- Visual keyframe markers on timeline
- Drag-and-drop keyframe repositioning
- Keyframe property editing
- Easing curve selection
- Real-time playback preview
- Zoom and scroll controls
- Duration snapping to grid
- Expand/collapse timeline panel

**Easing Types:**
- `linear` - Constant speed
- `ease` - Smooth acceleration and deceleration
- `ease-in` - Gradual acceleration
- `ease-out` - Gradual deceleration
- `ease-in-out` - Symmetrical acceleration/deceleration
- `spring` - Physics-based spring animation

### 9.4 Map Elements

#### Zones (Polygons)
- Draw custom polygon shapes on map
- Customise fill colour and opacity
- Customise stroke colour, width, and opacity
- Add text labels with positioning
- Control visibility timing (fade in/out)

#### Routes (Lines)
- Draw paths connecting multiple points
- Customise line colour and width
- Choose line style (solid, dashed, dotted)
- Animated drawing effect options
- Distance and time labels
- Control visibility timing

#### Text Markers (Points)
- Place point annotations on map
- Custom text content with styling
- Font family, size, weight, colour
- Background colour and padding
- Optional icon display
- Control visibility timing

### 9.5 Branding & Overlays

**Location:** `/src/components/editor/property-panel.tsx` (Branding tab)

**Features:**
- Logo upload and placement (9 positions)
- Logo size and opacity control
- Logo appearance timing
- Watermark text with styling
- Custom brand colour palette

**Logo Positions:**
```
+-------------+-------------+-------------+
|  top-left   |  top-center |  top-right  |
+-------------+-------------+-------------+
| middle-left |middle-center| middle-right|
+-------------+-------------+-------------+
| bottom-left |bottom-center| bottom-right|
+-------------+-------------+-------------+
```

### 9.6 Video Export

**Location:** `/src/components/preview/render-modal.tsx`

**Supported Formats:**
- **MP4 (H.264):** Universal compatibility
- **WebM (VP9):** Web-optimised
- **GIF:** Animated preview (limited duration)

**Resolutions:**
- **720p:** 1280 x 720 (HD)
- **1080p:** 1920 x 1080 (Full HD) - Default
- **4K:** 3840 x 2160 (Ultra HD)

**Frame Rates:**
- **24 fps:** Cinematic feel
- **30 fps:** Standard video - Default
- **60 fps:** Smooth motion

**Render Status Flow:**
```
QUEUED --> PROCESSING --> COMPLETE
              |
              +--> FAILED
```

### 9.7 Template System

**Location:** `/src/app/(dashboard)/templates/`

**Features:**
- Save any project as reusable template
- Public/private visibility toggle
- Category organisation (e.g., "Property Tour", "Area Overview", "Development Launch")
- Usage tracking and statistics
- Clone template to new project
- Browse public template gallery

---

## 10. State Management

### 10.1 Store Architecture

Propnica uses Zustand for client-side state management with two primary stores:

```
+-------------------------------------------------------+
|                    Editor Store                        |
|  - UI state (tool, selection, modals)                 |
|  - Playback state (playing, currentTime)              |
|  - History (undo/redo stacks)                         |
|  - Timeline state (zoom, scroll, expanded)            |
+-------------------------------------------------------+
                          |
                          V
+-------------------------------------------------------+
|                    Project Store                       |
|  - Project metadata (id, name, description)           |
|  - Project config (settings, keyframes, elements)     |
|  - Dirty state tracking                               |
|  - CRUD operations                                    |
+-------------------------------------------------------+
```

### 10.2 Editor Store

**Location:** `/src/stores/editor-store.ts`

```typescript
interface EditorState {
  // Tool State
  currentTool: EditorTool;
  setTool: (tool: EditorTool) => void;
  
  // Selection State
  selectedElement: SelectedElement | null;
  setSelectedElement: (element: SelectedElement | null) => void;
  clearSelection: () => void;
  
  // Playback State
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  currentTime: number;
  setCurrentTime: (time: number) => void;
  
  // History (Undo/Redo)
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  pushHistory: (state: ProjectConfig) => void;
  
  // Timeline
  timelineZoom: number;
  zoomIn: () => void;
  zoomOut: () => void;
  timelineExpanded: boolean;
  toggleTimeline: () => void;
  
  // UI State
  snapToGrid: boolean;
  toggleSnapToGrid: () => void;
  showGrid: boolean;
  toggleShowGrid: () => void;
}

type EditorTool = 
  | 'select' 
  | 'pan' 
  | 'drawZone' 
  | 'drawRoute' 
  | 'addMarker' 
  | 'addText'
  | 'drawRectangle'
  | 'drawCircle';

interface SelectedElement {
  type: 'keyframe' | 'zone' | 'route' | 'textMarker';
  id: string;
}
```

### 10.3 Project Store

**Location:** `/src/stores/project-store.ts`

```typescript
interface ProjectState {
  // Metadata
  id: string | null;
  name: string;
  description: string | null;
  
  // Settings
  settings: ProjectSettings;
  mapSettings: MapSettings;
  
  // Elements
  keyframes: Keyframe[];
  zones: Zone[];
  routes: Route[];
  textMarkers: TextMarker[];
  
  // Branding
  branding: BrandingConfig;
  
  // State Tracking
  isDirty: boolean;
  lastSaved: Date | null;
  
  // Project Actions
  loadProject: (project: Project) => void;
  resetProject: () => void;
  setName: (name: string) => void;
  setDescription: (description: string | null) => void;
  updateSettings: (settings: Partial<ProjectSettings>) => void;
  updateMapSettings: (settings: Partial<MapSettings>) => void;
  
  // Keyframe Actions
  addKeyframe: (keyframe: Keyframe) => void;
  updateKeyframe: (id: string, updates: Partial<Keyframe>) => void;
  deleteKeyframe: (id: string) => void;
  reorderKeyframes: (fromIndex: number, toIndex: number) => void;
  
  // Zone Actions
  addZone: (zone: Zone) => void;
  updateZone: (id: string, updates: Partial<Zone>) => void;
  deleteZone: (id: string) => void;
  
  // Route Actions
  addRoute: (route: Route) => void;
  updateRoute: (id: string, updates: Partial<Route>) => void;
  deleteRoute: (id: string) => void;
  
  // Text Marker Actions
  addTextMarker: (marker: TextMarker) => void;
  updateTextMarker: (id: string, updates: Partial<TextMarker>) => void;
  deleteTextMarker: (id: string) => void;
  
  // Branding Actions
  updateBranding: (branding: Partial<BrandingConfig>) => void;
  
  // Utility
  getConfig: () => ProjectConfig;
  setDirty: (dirty: boolean) => void;
  markClean: () => void;
}
```

### 10.4 Store Persistence

- **Auto-save:** Debounced save after 2 seconds of inactivity when dirty
- **Manual save:** Ctrl/Cmd + S keyboard shortcut
- **Exit warning:** Browser prompt on navigation with unsaved changes
- **Optimistic updates:** UI updates immediately, rolls back on server error

---

## 11. Remotion Video Rendering

### 11.1 Rendering Architecture

```
+-------------------------------------------------------+
|                   Remotion Root                        |
|  +--------------------------------------------------+ |
|  |           PropertyClipComposition                 | |
|  |  +-------------+  +-------------+                | |
|  |  | MapRenderer |  | Overlays    |                | |
|  |  |  - Static   |  |  - Logo     |                | |
|  |  |  - Animated |  |  - Title    |                | |
|  |  +-------------+  |  - Watermark|                | |
|  |                   +-------------+                | |
|  |  +-------------+  +-------------+                | |
|  |  | Markers     |  | Routes      |                | |
|  |  | Renderer    |  | Renderer    |                | |
|  |  +-------------+  +-------------+                | |
|  +--------------------------------------------------+ |
+-------------------------------------------------------+
```

### 11.2 Composition Structure

**Location:** `/remotion/compositions/PropertyClipComposition.tsx`

The main composition receives the full project config and orchestrates all visual elements:

```typescript
interface PropertyClipProps {
  config: ProjectConfig;
}

const PropertyClipComposition: React.FC<PropertyClipProps> = ({ config }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Calculate current camera state from keyframes
  const camera = interpolateCamera(config.keyframes, frame, fps);
  
  return (
    <AbsoluteFill>
      <MapRenderer camera={camera} mapSettings={config.mapSettings} />
      <ZoneRenderer zones={config.zones} currentTime={frameToMs(frame, fps)} />
      <RouteRenderer routes={config.routes} currentTime={frameToMs(frame, fps)} />
      <MarkerRenderer markers={config.textMarkers} currentTime={frameToMs(frame, fps)} />
      <LogoOverlay logo={config.branding.logo} currentTime={frameToMs(frame, fps)} />
      <WatermarkOverlay watermark={config.branding.watermark} />
    </AbsoluteFill>
  );
};
```

### 11.3 Resolution Configurations

| Preset | Width | Height | Aspect Ratio |
|--------|-------|--------|--------------|
| HD_720P | 1280 | 720 | 16:9 |
| HD_1080P | 1920 | 1080 | 16:9 |
| UHD_4K | 3840 | 2160 | 16:9 |

### 11.4 Camera Interpolation

Camera movements are interpolated between keyframes using the configured easing:

```typescript
function interpolateCamera(
  keyframes: Keyframe[],
  currentFrame: number,
  fps: number
): CameraState {
  const currentTimeMs = (currentFrame / fps) * 1000;
  
  // Find surrounding keyframes
  const prevKeyframe = findPreviousKeyframe(keyframes, currentTimeMs);
  const nextKeyframe = findNextKeyframe(keyframes, currentTimeMs);
  
  if (!prevKeyframe || !nextKeyframe) {
    return prevKeyframe?.camera || nextKeyframe?.camera || defaultCamera;
  }
  
  // Calculate interpolation progress
  const progress = calculateProgress(prevKeyframe, nextKeyframe, currentTimeMs);
  
  // Apply easing function
  const easedProgress = applyEasing(progress, nextKeyframe.easing);
  
  // Interpolate camera properties
  return {
    centre: interpolateCoordinates(prevKeyframe.camera.centre, nextKeyframe.camera.centre, easedProgress),
    zoom: interpolate(prevKeyframe.camera.zoom, nextKeyframe.camera.zoom, easedProgress),
    bearing: interpolateBearing(prevKeyframe.camera.bearing, nextKeyframe.camera.bearing, easedProgress),
    pitch: interpolate(prevKeyframe.camera.pitch, nextKeyframe.camera.pitch, easedProgress),
  };
}
```

### 11.5 Element Visibility

Elements appear/disappear based on their timing configuration with optional fade transitions:

```typescript
function calculateElementOpacity(
  timing: ElementTiming,
  currentTimeMs: number
): number {
  const { startTime, endTime, fadeInDuration, fadeOutDuration } = timing;
  
  // Before element should appear
  if (currentTimeMs < startTime) {
    return 0;
  }
  
  // During fade in
  if (currentTimeMs < startTime + fadeInDuration) {
    return (currentTimeMs - startTime) / fadeInDuration;
  }
  
  // During fade out
  if (currentTimeMs > endTime - fadeOutDuration) {
    return Math.max(0, (endTime - currentTimeMs) / fadeOutDuration);
  }
  
  // After element should disappear
  if (currentTimeMs > endTime) {
    return 0;
  }
  
  // Fully visible
  return 1;
}
```

### 11.6 Render Pipeline

1. **Queue:** Render job created in database with QUEUED status
2. **Process:** Worker picks up job, updates status to PROCESSING
3. **Bundle:** Remotion bundles the composition with project config
4. **Render:** Frame-by-frame rendering to PNG sequences
5. **Encode:** FFmpeg encodes frames to final video format
6. **Upload:** Output file uploaded to S3
7. **Complete:** Status updated to COMPLETE with output URL

### 11.7 Map Rendering Approach

For video rendering, maps are rendered as static images per frame using Mapbox Static Images API:

```typescript
function buildStaticMapUrl(camera: CameraState, mapSettings: MapSettings, width: number, height: number): string {
  const { centre, zoom, bearing, pitch } = camera;
  const { style } = mapSettings;
  
  return `https://api.mapbox.com/styles/v1/mapbox/${style}/static/${centre[0]},${centre[1]},${zoom},${bearing},${pitch}/${width}x${height}@2x?access_token=${MAPBOX_TOKEN}`;
}
```

---

## 12. UI Component Library

### 12.1 Base Components

All base UI components are built on Radix UI primitives with Tailwind CSS styling.

**Location:** `/src/components/ui/`

| Component | Radix Base | Description |
|-----------|------------|-------------|
| Alert | N/A | Status messages |
| AlertDialog | AlertDialog | Confirmation dialogs |
| Avatar | Avatar | User avatars |
| Badge | N/A | Status badges |
| Button | N/A | Action buttons |
| Card | N/A | Content containers |
| Checkbox | Checkbox | Boolean inputs |
| Dialog | Dialog | Modal dialogs |
| DropdownMenu | DropdownMenu | Context menus |
| Input | N/A | Text inputs |
| Label | Label | Form labels |
| Popover | Popover | Floating content |
| Progress | Progress | Progress indicators |
| ScrollArea | ScrollArea | Custom scrollbars |
| Select | Select | Dropdown selects |
| Separator | Separator | Visual dividers |
| Skeleton | N/A | Loading placeholders |
| Slider | Slider | Range inputs |
| Switch | Switch | Toggle switches |
| Tabs | Tabs | Tabbed interfaces |
| Textarea | N/A | Multi-line text |
| Toast | Toast | Notifications |
| Tooltip | Tooltip | Hover tooltips |

### 12.2 Button Variants

```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

### 12.3 Colour System

The application uses CSS custom properties for theming:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  --radius: 0.5rem;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... dark mode values */
}
```

---

## 13. External Integrations

### 13.1 Mapbox GL JS

**Purpose:** Interactive map rendering and manipulation

**Features Used:**
- Vector tile rendering
- Custom map styles
- 3D terrain and buildings
- Geocoding API
- Static Images API (for video rendering)

**Configuration:**
```typescript
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/satellite-streets-v12',
  center: [55.2708, 25.2048], // Dubai default
  zoom: 12,
  pitch: 60,
  bearing: -17.6,
  antialias: true,
});
```

**Supported Styles:**
| Style ID | Description |
|----------|-------------|
| satellite | Satellite imagery |
| satellite-streets | Satellite with labels |
| streets-v12 | Street map |
| light-v11 | Light theme |
| dark-v11 | Dark theme |
| outdoors-v12 | Terrain/outdoor |
| navigation-day-v1 | Navigation (day) |
| navigation-night-v1 | Navigation (night) |

### 13.2 Supabase

**Purpose:** Authentication and user management

**Services Used:**
- Supabase Auth (email, OAuth, magic links)
- Row-Level Security (future)
- Realtime subscriptions (future: collaboration)

**Configuration:**
```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### 13.3 AWS S3

**Purpose:** File storage for rendered videos and assets

**Operations:**
- Upload rendered videos
- Upload user assets (logos)
- Generate presigned download URLs
- Delete expired renders

**Configuration:**
```typescript
import { S3Client } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
```

**Bucket Structure:**
```
propnica-renders/
  users/
    {userId}/
      renders/
        {renderId}/
          output.mp4
      assets/
        logos/
          {assetId}.png
```

### 13.4 Stripe (Future)

**Purpose:** Subscription billing

**Planned Features:**
- Subscription plans (Free, Pro, Enterprise)
- Usage-based billing for renders
- Invoice generation
- Payment webhooks

---

## 14. Environment Configuration

### 14.1 Required Variables

```bash
# Database
DATABASE_URL="postgresql://user:pass@host:5432/propnica"

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJxxx"
SUPABASE_SERVICE_ROLE_KEY="eyJxxx"

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN="pk.xxx"

# AWS S3
AWS_REGION="me-south-1"
AWS_ACCESS_KEY_ID="AKIAxxx"
AWS_SECRET_ACCESS_KEY="xxx"
AWS_S3_BUCKET="propnica-renders"

# Application
NEXT_PUBLIC_APP_URL="https://app.propnica.com"
```

### 14.2 Optional Variables

```bash
# Analytics
NEXT_PUBLIC_POSTHOG_KEY="phc_xxx"
NEXT_PUBLIC_POSTHOG_HOST="https://app.posthog.com"

# Error Tracking
SENTRY_DSN="https://xxx@sentry.io/xxx"

# Email (future)
RESEND_API_KEY="re_xxx"

# Stripe (future)
STRIPE_SECRET_KEY="sk_xxx"
STRIPE_WEBHOOK_SECRET="whsec_xxx"
```

### 14.3 Environment Files

| File | Purpose | Git Status |
|------|---------|------------|
| `.env.example` | Template with all variables | Tracked |
| `.env.local` | Local development | Ignored |
| `.env.development` | Development overrides | Ignored |
| `.env.production` | Production values | Ignored |
| `.env.test` | Test environment | Ignored |

---

## 15. Development Workflow

### 15.1 Getting Started

```bash
# Clone repository
git clone https://github.com/org/propnica.git
cd propnica

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your values

# Setup database
npx prisma migrate dev
npx prisma generate

# Start development server
npm run dev
```

### 15.2 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint errors |
| `npm run format` | Format with Prettier |
| `npm run type-check` | TypeScript type checking |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run E2E tests |
| `npm run db:push` | Push schema to database |
| `npm run db:migrate` | Create migration |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:seed` | Seed database |
| `npm run remotion:preview` | Preview Remotion compositions |
| `npm run remotion:render` | Render video locally |

### 15.3 Git Workflow

**Branch Strategy:**
```
main (production)
  +-- develop (staging)
        +-- feature/XXX-description
        +-- bugfix/XXX-description
        +-- hotfix/XXX-description
```

**Commit Convention:**
```
type(scope): description

Types: feat, fix, docs, style, refactor, test, chore
Scope: editor, timeline, api, auth, render, ui

Examples:
feat(editor): add zone drawing tool
fix(timeline): correct keyframe drag behaviour
docs(api): update tRPC documentation
```

### 15.4 Code Review Checklist

- [ ] TypeScript compiles without errors
- [ ] ESLint passes without warnings
- [ ] Unit tests pass
- [ ] New features have tests
- [ ] Documentation updated
- [ ] No console.log statements
- [ ] No hardcoded values
- [ ] Responsive design verified
- [ ] Accessibility checked

---

## 16. Testing Strategy

### 16.1 Test Pyramid

```
           +--------+
           |  E2E   |  Playwright
           | Tests  |  (10%)
           +---+----+
               |
         +-----+-----+
         |Integration|  Vitest + tRPC
         |   Tests   |  (30%)
         +-----+-----+
               |
       +-------+-------+
       |   Unit Tests  |  Vitest
       |               |  (60%)
       +---------------+
```

### 16.2 Unit Testing

**Framework:** Vitest

**Coverage Targets:**
- Utility functions: 90%
- Store actions: 85%
- Type validators: 90%

**Example:**
```typescript
// tests/unit/stores/editor-store.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '@/stores/editor-store';

describe('EditorStore', () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
  });

  it('should change current tool', () => {
    const store = useEditorStore.getState();
    store.setTool('drawZone');
    expect(useEditorStore.getState().currentTool).toBe('drawZone');
  });
  
  it('should track undo/redo state', () => {
    const store = useEditorStore.getState();
    expect(store.canUndo).toBe(false);
    expect(store.canRedo).toBe(false);
    
    store.pushHistory({ /* project config */ });
    expect(store.canUndo).toBe(true);
  });
});
```

### 16.3 Integration Testing

**Framework:** Vitest with tRPC testing utilities

**Example:**
```typescript
// tests/integration/routers/projects.test.ts
import { describe, it, expect } from 'vitest';
import { createCaller } from '@/server/router';
import { createTestContext } from '../helpers';

describe('Projects Router', () => {
  it('should create a project', async () => {
    const ctx = createTestContext({ userId: 'test-user-id' });
    const caller = createCaller(ctx);
    
    const project = await caller.projects.create({
      name: 'Test Project',
    });
    
    expect(project.name).toBe('Test Project');
    expect(project.userId).toBe('test-user-id');
  });
  
  it('should not allow access to other users projects', async () => {
    const ctx = createTestContext({ userId: 'user-a' });
    const caller = createCaller(ctx);
    
    await expect(
      caller.projects.get({ id: 'user-b-project-id' })
    ).rejects.toThrow('NOT_FOUND');
  });
});
```

### 16.4 E2E Testing

**Framework:** Playwright

**Test Scenarios:**
1. User authentication flow (login, signup, logout)
2. Project CRUD operations
3. Editor tool usage
4. Timeline manipulation
5. Export workflow
6. Template management

**Example:**
```typescript
// tests/e2e/editor.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Editor', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/projects');
  });

  test('should create and edit a project', async ({ page }) => {
    await page.click('text=New Project');
    await expect(page).toHaveURL(/\/editor\/.+/);
    await expect(page.locator('.map-canvas')).toBeVisible();
  });
  
  test('should add a keyframe', async ({ page }) => {
    await page.goto('/editor/test-project-id');
    await page.keyboard.press('k'); // Add keyframe shortcut
    await expect(page.locator('[data-testid="keyframe-marker"]')).toHaveCount(2);
  });
});
```

---

## 17. Deployment & Infrastructure

### 17.1 Deployment Architecture

```
+-------------------------------------------------------+
|                      CloudFlare                        |
|                    (CDN + WAF)                         |
+-------------------------+-----------------------------+
                          |
+-------------------------+-----------------------------+
|                       Vercel                           |
|  +-------------+  +-------------+                     |
|  |   Next.js   |  |   API       |                     |
|  |  App Router |  |   Routes    |                     |
|  +-------------+  +-------------+                     |
+-------------------------+-----------------------------+
                          |
        +-----------------+-----------------+
        |                 |                 |
        V                 V                 V
+---------------+ +---------------+ +---------------+
|   Supabase    | |   AWS S3      | |  AWS Lambda   |
|  PostgreSQL   | |   Storage     | |   Renders     |
+---------------+ +---------------+ +---------------+
```

### 17.2 Environment URLs

| Environment | URL | Purpose |
|-------------|-----|---------|
| Production | app.propnica.com | Live application |
| Staging | staging.propnica.com | Pre-production testing |
| Preview | *.vercel.app | PR previews |
| Local | localhost:3000 | Development |

### 17.3 CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm test

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e

  deploy-staging:
    needs: [lint, test]
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}

  deploy-production:
    needs: [lint, test, e2e]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### 17.4 Database Migrations

```bash
# Development: Apply migrations
npx prisma migrate dev --name description

# Production: Deploy migrations (non-interactive)
npx prisma migrate deploy

# View migration status
npx prisma migrate status

# Reset database (DEVELOPMENT ONLY)
npx prisma migrate reset
```

---

## 18. Performance Considerations

### 18.1 Frontend Optimisations

| Technique | Implementation |
|-----------|----------------|
| Code Splitting | Next.js automatic route-based splitting |
| Dynamic Imports | Heavy components loaded on demand |
| Image Optimisation | Next.js Image component |
| Font Optimisation | next/font with display: swap |
| Bundle Analysis | @next/bundle-analyzer |
| Memoisation | React.memo, useMemo, useCallback |

### 18.2 Map Performance

| Technique | Implementation |
|-----------|----------------|
| Viewport Culling | Only render visible elements |
| Marker Clustering | Group nearby markers at low zoom |
| Geometry Simplification | Reduce polygon complexity at low zoom |
| Tile Caching | Mapbox built-in caching |
| Debounced Events | Throttle camera change events |

### 18.3 API Performance

| Technique | Implementation |
|-----------|----------------|
| Query Optimisation | Prisma query analysis |
| N+1 Prevention | Prisma includes/joins |
| Connection Pooling | Prisma connection pool |
| Response Caching | React Query stale-while-revalidate |
| Pagination | Cursor-based pagination |

### 18.4 Rendering Performance

| Technique | Implementation |
|-----------|----------------|
| Lambda Sizing | 1024MB+ memory for renders |
| Parallel Rendering | Multiple frames concurrently |
| Efficient Encoding | Optimised FFmpeg settings |
| Multipart Upload | Large file chunked uploads |

---

## 19. Security Considerations

### 19.1 Authentication Security

- Session tokens in HTTP-only cookies
- CSRF protection via SameSite cookies
- Rate limiting on auth endpoints
- Password hashing via Supabase (bcrypt)
- Secure password reset flow

### 19.2 API Security

- All routes require authentication (except public)
- Resource ownership verification
- Input validation via Zod schemas
- SQL injection prevention via Prisma
- Rate limiting per user

### 19.3 Data Security

- Encryption at rest (database, S3)
- Encryption in transit (TLS 1.3)
- Presigned URLs with short expiration
- Soft deletes with retention period
- Regular security audits

### 19.4 Infrastructure Security

- Environment variables in Vercel secrets
- AWS IAM least-privilege policies
- CloudFlare WAF rules
- Regular dependency updates
- Vulnerability scanning

### 19.5 GDPR Compliance

- User data export functionality
- Account deletion capability
- 30-day data retention on deletion
- Cookie consent management
- Privacy policy and ToS

---

## 20. Known Issues & Technical Debt

### 20.1 Critical Issues (Must Fix Before Production)

| ID | Issue | Location | Impact | Estimated Fix |
|----|-------|----------|--------|---------------|
| #1 | Missing AWS SDK | package.json | Runtime failure | 15 min |
| #2 | MapMarker type missing | MarkerRenderer.tsx | TypeScript error | 30 min |
| #3 | Route property mismatch | RouteRenderer.tsx | Runtime error | 1 hour |
| #4 | TitleStyle type missing | TitleOverlay.tsx | TypeScript error | 15 min |
| #5 | Composition type mismatch | PropertyClipComposition.tsx | Render failure | 2 hours |
| #6 | tRPC procedure names wrong | render-modal.tsx | API error | 30 min |
| #7 | Toolbar props mismatch | editor/page.tsx | React error | 30 min |
| #8 | Timeline function names | timeline.tsx | Runtime error | 15 min |
| #9 | Timeline variable name | timeline.tsx | Reference error | 15 min |
| #10 | Settings modal schema | settings-modal.tsx | Validation error | 30 min |
| #11 | MapRenderer type mismatch | MapRenderer.tsx | Runtime error | 1 hour |

**Reference:** See `Propnica_Code_Review_Report.md` for detailed fixes.

### 20.2 Technical Debt

| Item | Description | Priority | Effort |
|------|-------------|----------|--------|
| Test Coverage | Minimal test coverage currently | High | 2 weeks |
| Error Boundaries | No React error boundaries | High | 2 days |
| Structured Logging | No logging system | Medium | 3 days |
| APM Integration | No application monitoring | Medium | 2 days |
| JSDoc Comments | Incomplete documentation | Medium | 1 week |
| Accessibility Audit | WCAG compliance needed | Medium | 1 week |
| i18n Support | No internationalisation | Low | 2 weeks |

### 20.3 Future Enhancements

| Feature | Description | Timeline |
|---------|-------------|----------|
| Real-time Collaboration | Multi-user editing | Q3 2026 |
| Mobile App | React Native companion | Q4 2026 |
| AI Camera Paths | Auto-generated animations | Q4 2026 |
| Template Marketplace | Buy/sell templates | Q1 2027 |
| White Label | Full platform customisation | Q2 2027 |
| Offline Mode | Local editing capability | Q2 2027 |

---

## 21. Glossary

| Term | Definition |
|------|------------|
| **Keyframe** | A point in time defining camera position and properties |
| **Zone** | A polygon area drawn on the map (e.g., neighbourhood boundary) |
| **Route** | A path connecting multiple points on the map |
| **Text Marker** | A point-based text annotation on the map |
| **Composition** | A Remotion video template with dynamic props |
| **Render** | The process of generating a video file from a project |
| **tRPC** | TypeScript RPC library for type-safe APIs |
| **Zustand** | Lightweight state management library for React |
| **Remotion** | React-based programmatic video generation framework |
| **Easing** | Interpolation curve controlling animation speed |
| **Viewport** | The visible area of the map at current zoom/position |
| **Bearing** | Rotation angle of the map (0-360 degrees) |
| **Pitch** | Tilt angle of the map (0-60 degrees) |
| **Centre** | The geographic point at the centre of the map view |
| **Zoom** | Map zoom level (0 = world, 22 = building detail) |
| **FPS** | Frames per second in video output |
| **Resolution** | Video dimensions (e.g., 1920x1080 for 1080p) |

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 24 Jan 2026 | Development Team | Initial comprehensive documentation |

---

## Contact & Support

**Development Team Lead:** [TBD]  
**Product Owner:** [TBD]  
**DevOps Lead:** [TBD]  

**Repository:** https://github.com/org/propnica  
**Issue Tracker:** https://github.com/org/propnica/issues  
**Documentation:** https://docs.propnica.com  

---

*This document is maintained as the single source of truth for the Propnica project. All team members should reference this document and propose updates via pull request when information becomes outdated.*
