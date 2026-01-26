# Propnica Code Review Report

## Production Readiness Assessment

**Review Date:** 24 January 2026
**Last Updated:** 26 January 2026
**Codebase Version:** Phase 3 Complete
**Total Files Reviewed:** 88 TypeScript/TSX files (17,712 lines of code)
**Overall Assessment:** ✅ ALL CRITICAL ISSUES RESOLVED - READY FOR STAGING

> **Note:** All 11 critical issues identified in this review have been resolved as of 26 January 2026. The codebase now passes TypeScript type-checking.

---

## Executive Summary

The Propnica codebase demonstrates a well-structured SaaS application with comprehensive feature implementation across all 10 phases. ~~However, the code review has identified **11 critical issues** that would cause runtime failures or type errors in production.~~ **All critical issues have been resolved.** The Remotion rendering layer now uses the correct types (`TextMarker`, `Zone`, `Route`) and property access patterns.

---

## Critical Issues (Must Fix Before Production)

### Issue #1: Missing AWS SDK Dependency
**Severity:** CRITICAL  
**Location:** `/package.json`  
**Impact:** Runtime failure when attempting S3 operations

**Problem:**  
The S3 library (`/src/lib/s3.ts`) imports AWS SDK packages that are not declared in `package.json`:
```typescript
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
```

**Fix Required:**
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

---

### Issue #2: MapMarker Type Does Not Exist
**Severity:** CRITICAL  
**Location:** `/remotion/components/MarkerRenderer.tsx` (Line 3)  
**Impact:** TypeScript compilation failure

**Problem:**  
```typescript
import type { MapMarker } from '../../src/types';
```
The type `MapMarker` does not exist in the type system. The actual type is `TextMarker` with a completely different structure.

**Actual Type (TextMarker):**
```typescript
interface TextMarker {
  id: string;
  position: [number, number];  // Not "coordinates"
  text: string;
  style: TextMarkerStyle;
  icon?: MarkerIcon;
  timing: ElementTiming;
}
```

**MarkerRenderer Expects:**
- `marker.coordinates` (should be `marker.position`)
- `marker.size` (does not exist - should use `marker.icon?.size`)
- `marker.color` (does not exist - should use `marker.icon?.colour`)
- `marker.label` (does not exist - should use `marker.text`)

---

### Issue #3: Route Type Property Mismatches
**Severity:** CRITICAL  
**Location:** `/remotion/components/RouteRenderer.tsx`  
**Impact:** Runtime property access errors

**Problem:**  
RouteRenderer accesses flat properties that should be nested:

| Component Uses | Actual Type Property |
|---------------|---------------------|
| `route.color` | `route.style.colour` |
| `route.width` | `route.style.width` |
| `route.opacity` | `route.style.opacity` |
| `route.animated` | `route.animation.type !== 'none'` |

---

### Issue #4: TitleStyle Type Does Not Exist
**Severity:** CRITICAL  
**Location:** `/remotion/components/TitleOverlay.tsx` (Line 3)  
**Impact:** TypeScript compilation failure

**Problem:**  
```typescript
import type { OverlayPosition, TitleStyle } from '../../src/types';
```
The type `TitleStyle` is not defined in the type system.

**Fix Required:**  
Add to `/src/types/index.ts`:
```typescript
export interface TitleStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number | string;
  color?: string;
  backgroundColor?: string;
  borderRadius?: number;
  letterSpacing?: number;
  textShadow?: string;
}
```

---

### Issue #5: PropertyClipComposition Type System Mismatch
**Severity:** CRITICAL  
**Location:** `/remotion/compositions/PropertyClipComposition.tsx`  
**Impact:** Complete rendering failure

**Problems:**

1. **Lines 10-12 - Missing Type Imports:**
```typescript
import type { MapMarker, Route, Polygon } from '../../src/types';
```
- `MapMarker` does not exist (use `TextMarker`)
- `Polygon` does not exist (use `Zone`)

2. **Lines 100-115 - Incorrect Keyframe Access:**
```typescript
keyframe.center  // Should be keyframe.camera.centre
keyframe.zoom    // Should be keyframe.camera.zoom
keyframe.pitch   // Should be keyframe.camera.pitch
keyframe.bearing // Should be keyframe.camera.bearing
```

3. **Lines 143-165 - Non-existent Element Properties:**
```typescript
marker.visibleFrom   // Should be marker.timing.startTime
marker.visibleTo     // Should be marker.timing.endTime
route.visibleFrom    // Should be route.timing.startTime
route.animated       // Should be route.animation.type !== 'none'
polygon.visibleFrom  // Should be zone.timing.startTime
```

4. **Lines 205-212 - Non-existent Config Properties:**
```typescript
config.transitions   // Does not exist
config.markers       // Should be config.textMarkers
config.routes        // Exists (OK)
config.polygons      // Should be config.zones
config.mapStyle      // Should be config.mapSettings.style
config.overlays      // Does not exist
```

---

### Issue #6: Render Modal tRPC Procedure Names
**Severity:** CRITICAL  
**Location:** `/src/components/preview/render-modal.tsx` (Lines 167, 179)  
**Impact:** Runtime tRPC errors

**Problem:**  
```typescript
const startRender = trpc.renders.start.useMutation({...});
const { data: renderStatus } = trpc.renders.getStatus.useQuery(...);
```

The renders router does not have `start` or `getStatus` procedures.

**Available Procedures in Renders Router:**
- `list`
- `get`
- `create` (should replace `start`)
- `getDownloadUrl`
- `cancel`
- `delete`
- `stats`

**Fix Required:**
```typescript
const startRender = trpc.renders.create.useMutation({...});
const { data: renderStatus } = trpc.renders.get.useQuery(...);
```

---

### Issue #7: Toolbar Component Props Mismatch
**Severity:** CRITICAL  
**Location:** `/src/app/editor/[id]/page.tsx` (Lines 450-455)  
**Impact:** React props error

**Problem:**  
Editor page passes props to Toolbar:
```typescript
<Toolbar
  onPreview={handlePreview}
  onExport={handleExport}
  onOpenShortcuts={handleOpenShortcuts}
  onOpenSettings={handleOpenSettings}
/>
```

But Toolbar component accepts no props:
```typescript
export function Toolbar() {
```

**Fix Options:**
1. Update Toolbar to accept props and use them
2. Remove props from editor page (Toolbar uses store methods internally)

---

### Issue #8: Timeline Function Name Errors
**Severity:** CRITICAL  
**Location:** `/src/components/timeline/timeline.tsx` (Lines 410, 431)  
**Impact:** Runtime function call errors

**Problem:**  
```typescript
onClick={() => zoomTimelineOut()}  // Line 410 - Should be zoomOut()
onClick={() => zoomTimelineIn()}   // Line 431 - Should be zoomIn()
```

The editor store exports `zoomIn` and `zoomOut`, not `zoomTimelineIn` and `zoomTimelineOut`.

---

### Issue #9: Timeline Variable Name Error
**Severity:** CRITICAL  
**Location:** `/src/components/timeline/timeline.tsx` (Line 378)  
**Impact:** Runtime reference error

**Problem:**  
```typescript
isTimelineExpanded  // Should be timelineExpanded
```

The editor store exports `timelineExpanded`, not `isTimelineExpanded`.

---

### Issue #10: Settings Modal Update Schema Mismatch
**Severity:** HIGH  
**Location:** `/src/components/editor/settings-modal.tsx` (Lines 107-121)  
**Impact:** tRPC validation error

**Problem:**  
Settings modal passes `settings` object:
```typescript
updateProject.mutate({
  id: projectId,
  name,
  description: description || undefined,
  settings: {  // Wrong key
    resolution,
    frameRate,
    duration,
    mapStyle,
    ...
  },
});
```

But projects.update expects `config`:
```typescript
z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  config: projectConfigSchema.optional(),  // Correct key
  thumbnailUrl: z.string().url().optional().nullable(),
})
```

**Fix Required:**  
Change `settings` to `config` and ensure structure matches `projectConfigSchema`.

---

### Issue #11: MapRenderer Static URL Builder Type Mismatch
**Severity:** HIGH  
**Location:** `/remotion/components/MapRenderer.tsx`  
**Impact:** Incorrect map rendering

**Problem:**  
The `buildStaticMapUrl()` function references properties using the incorrect type structure (same issues as PropertyClipComposition - accessing flat properties instead of nested ones).

---

## Medium Priority Issues

### Issue #12: Inconsistent Colour vs Color Spelling
**Severity:** MEDIUM  
**Impact:** Potential confusion, no runtime impact

**Observation:**  
Type system uses UK English (`colour`, `centre`) consistently, but some Remotion components use US English (`color`, `center`). This is handled via property mapping in most cases but creates maintenance overhead.

---

### Issue #13: Missing Error Boundaries
**Severity:** MEDIUM  
**Impact:** Poor error UX in production

**Observation:**  
No React error boundaries implemented for graceful error handling in the editor or map canvas components.

---

## Components Verified as Correct

The following components were reviewed and found to be correctly implemented:

### Database Layer
- Prisma schema (complete)
- Type definitions (complete, but missing some overlay types)

### Server Layer
- tRPC context and procedures
- Projects router
- Renders router (procedures exist, names need updating in consumers)
- Templates router
- User router

### Client Layer
- Editor store (Zustand)
- Project store (Zustand)
- Property panel component
- Keyboard shortcuts modal
- Settings modal (aside from schema mismatch)
- Preview modal

### Remotion Layer (need type fixes)
- LogoOverlay (correct)
- WatermarkOverlay (correct)

### Infrastructure
- Middleware (correct)
- tRPC API handler (correct)
- Authentication flow (correct)

---

## Recommended Fix Priority

### Immediate (Block deployment)
1. Add AWS SDK dependencies to package.json
2. Fix Remotion composition type imports and property access
3. Fix MarkerRenderer and RouteRenderer type mismatches
4. Add missing TitleStyle type definition
5. Fix render-modal tRPC procedure names
6. Fix toolbar props mismatch
7. Fix timeline function and variable names
8. Fix settings-modal update schema

### Before GA Release
9. Add React error boundaries
10. Comprehensive integration testing
11. Performance profiling for large projects

---

## File Changes Summary

| File | Changes Required |
|------|-----------------|
| `package.json` | Add AWS SDK dependencies |
| `src/types/index.ts` | Add TitleStyle interface |
| `remotion/compositions/PropertyClipComposition.tsx` | Major refactor for type alignment |
| `remotion/components/MarkerRenderer.tsx` | Change MapMarker to TextMarker, fix property access |
| `remotion/components/RouteRenderer.tsx` | Fix nested property access |
| `remotion/components/TitleOverlay.tsx` | Import corrected after TitleStyle added |
| `remotion/components/MapRenderer.tsx` | Fix property access patterns |
| `src/components/preview/render-modal.tsx` | Change start to create, getStatus to get |
| `src/components/editor/toolbar.tsx` | Accept props or document store-based approach |
| `src/app/editor/[id]/page.tsx` | Remove toolbar props or update component |
| `src/components/timeline/timeline.tsx` | Fix function and variable names |
| `src/components/editor/settings-modal.tsx` | Change settings to config |

---

## Conclusion

The Propnica codebase demonstrates solid architectural decisions and comprehensive feature coverage. However, the identified type system mismatches in the Remotion rendering layer represent a fundamental disconnect that would prevent the application from compiling or functioning correctly. These issues likely arose from parallel development where the core type system evolved separately from the rendering components.

**Estimated fix time:** 8-12 hours for a developer familiar with the codebase.

**Recommendation:** Do not deploy to production until all critical issues are resolved and comprehensive integration tests confirm the fixes.
