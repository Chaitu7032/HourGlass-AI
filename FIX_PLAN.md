# Hourglass AI V6 — Production Hardening & Feature Completion Plan

## Audit Summary

After thorough codebase audit, here is the complete fix plan organized by priority.

## Phase 1: Critical Fixes (Must Ship)

### 1.1 Consolidate Duplicate Stores
- **Files**: `src/lib/store/execution-store.ts` (DEAD CODE)
- **Action**: Remove `execution-store.ts`. All state is in `hourglass-store.ts`.
- **Risk**: Low - execution-store is never imported anywhere.

### 1.2 Fix Planner Server Fallback
- **Files**: `src/lib/agents/planner-server.ts`, `src/app/api/plan/route.ts`
- **Issue**: `/api/plan` throws error when Gemini is unavailable. Task dialog catches it but API route has no fallback.
- **Fix**: Add heuristic fallback in API route when Gemini fails.

### 1.3 Fix Chat Fallback When Gemini Unavailable
- **Files**: `src/lib/ai/ai-chief-of-staff.ts`, `src/app/api/chat/route.ts`
- **Issue**: `chatWithChiefOfStaff` throws error when Gemini API key is missing. API route returns 500.
- **Fix**: Use `generateFallbackResponse` when Gemini is unavailable.

### 1.4 Add Error Boundaries to Dashboard Pages
- **Files**: All dashboard pages
- **Action**: Wrap each page with ErrorBoundary component

## Phase 2: Feature Completion (Core UX)

### 2.1 Integrate Orchestrator Output into Mission Control
- **Files**: `src/app/dashboard/page.tsx`
- **Issue**: Dashboard uses intelligence engine only, ignores orchestrator's richer output
- **Fix**: Show risk assessments, commitment score, agent pipeline, future scenarios from orchestration

### 2.2 Use Existing Components on Dashboard Pages
- **Files**: Multiple
- **Components to integrate**:
  - `AgentPipeline` → Mission Control
  - `CommitmentScoreCard` → Mission Control
  - `RescueBanner` → Mission Control
  - `RiskHeatmap` → Risk page
  - `FutureSelfSimulation` → Future Self page

### 2.3 Add Real-Time Orchestration on Task Changes
- **Files**: `src/lib/firebase/sync.tsx`
- **Issue**: Orchestration only runs when task is created, not when tasks are updated/deleted
- **Fix**: Auto-trigger orchestration when tasks change

## Phase 3: Production Hardening

### 3.1 Add Loading Skeletons
- **Files**: All dashboard pages
- **Action**: Use existing Skeleton component for loading states

### 3.2 Add Retry Logic to Firestore Hooks
- **Files**: `src/lib/firebase/hooks.ts`
- **Action**: Add retry with exponential backoff for Firestore reads

### 3.3 Add Structured Logging
- **Files**: All agent files
- **Action**: Add consistent logging with timestamps and context

### 3.4 Add Offline Handling
- **Files**: `src/lib/firebase/sync.tsx`
- **Action**: Graceful degradation when Firebase is unavailable

## Phase 4: Polish & Performance

### 4.1 Remove Dead Code
- **Files**: `src/lib/store/execution-store.ts`
- **Action**: Delete file and update imports

### 4.2 Add Memoization
- **Files**: Dashboard components
- **Action**: Add useMemo/useCallback where missing

### 4.3 Fix TypeScript Strictness
- **Files**: Multiple
- **Action**: Remove `any` types, add proper type guards
</write_to_file>