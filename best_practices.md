# 📘 Project Best Practices

#### 1. Project Purpose
This repository contains an **eDiscovery platform** with a **React (Vite) + Tailwind** client and an **Express + TypeScript + MongoDB (Mongoose)** server, covering common eDiscovery workflows such as case management, document upload/review, search, analytics, notifications, audit logging, and role-based access control.

#### 2. Project Structure
- `ediscovery-platform/client/`: Frontend (React + Vite + Tailwind)
  - `src/pages/`: Route-level pages (e.g., `DashboardPage`, `Cases`, `Review`, `Search`)
  - `src/components/`:
    - `Layout/`: App shell (navigation/layout primitives)
    - `ui/`: Reusable UI primitives (Button, Card, Dialog, Toast, etc.)
    - feature folders (`cases/`, `documents/`, `review/`, etc.): Feature-level components
  - `src/services/`: API clients per domain (analytics/dashboard/notification) built on `services/api.ts`
  - `src/store/`: Zustand stores (`authStore`, `caseStore`, `searchStore`, `toastStore`)
  - `src/context/`: React context for cross-cutting concerns (e.g., `ReviewContext`)
  - `src/lib/`: Shared frontend utilities (e.g., `colors.ts`, `utils.ts`)
  - `src/main.tsx`: Client entry point
  - `src/App.tsx`: App routes + top-level composition
- `ediscovery-platform/server/`: Backend (Express + TS)
  - `src/server.ts`: Server entry point
  - `src/routes/`: Route modules grouped by domain
  - `src/controllers/`: Request handlers grouped by domain
  - `src/models/`: Mongoose models
  - `src/middleware/`: Auth, audit, error, upload
  - `src/config/`: Database configuration/connection
  - `src/utils/`: Cross-cutting helpers (e.g., JWT utils, export utils)
  - `src/services/`: Server-side services (e.g., file handling)
- `ediscovery-platform/shared/`: Cross-cutting shared TypeScript types
- Root-level docs/plans: `README.md`, `WORK_DONE_README.md`, `implementation_plan.md`, `TODO.md`

**Separation of concerns**
- Keep **route wiring** in `routes/`, **request/response logic** in `controllers/`, **persistence/schema** in `models/`, and **cross-cutting policy** in `middleware/`.
- Keep UI primitives in `components/ui` and domain UI in feature folders.

#### 3. Test Strategy
- Current state: no formal test runner configured on the server (`"test": "Error: no test specified"`).
- Preferred direction (recommended for this repo):
  - **Backend**: Vitest or Jest + Supertest for HTTP integration tests.
    - `server/src/**/__tests__/` for unit tests and `server/src/**/__integration__/` (or `server/test/`) for API-level tests.
    - Mock external services (file storage, email, third-party APIs) at the module boundary.
  - **Frontend**: Vitest + React Testing Library.
    - Co-locate tests next to components for UI primitives (`Button.test.tsx`) and keep page-level integration tests under `src/pages/__tests__/`.
- Unit vs integration guidance:
  - Write **unit tests** for pure utilities, stores, and controller/service logic with mocked IO.
  - Write **integration tests** for critical API routes (auth, upload, review actions) using a test database.

#### 4. Code Style
**TypeScript & React**
- Prefer **strict typing** for public boundaries:
  - API payloads/DTOs, Zustand store state/actions, and component props.
  - Reuse types from `shared/types.ts` when applicable.
- Favor **composition over inheritance** for UI.
- Use `async/await` consistently; never mix with `.then()` chains in the same flow.

**Naming conventions**
- React components: `PascalCase.tsx` (e.g., `CreateCaseModal.tsx`).
- Hooks: `useX.ts`.
- Stores: `xStore.ts` with exported hook (Zustand pattern).
- Server: `*.controller.ts`, `*.routes.ts`, `*.middleware.ts`, `*.util.ts`.

**Styling**
- Tailwind-first styling; centralize variants using `class-variance-authority` where appropriate.
- Keep design tokens in CSS variables (see `client/src/index.css`) and map them in Tailwind (`tailwind.config.js`).

**Comments & documentation**
- Prefer comments that explain **why** (constraints, security, legal/audit requirements), not what.
- For complex flows (review, production/export), add short docblocks at module boundaries.

**Error handling**
- Server:
  - Validate inputs at controller boundaries and return consistent error shapes.
  - Route all unhandled errors to `errorMiddleware`.
- Client:
  - Surface network errors via the Toast system (`toastStore` + `ToastContainer`).

#### 5. Common Patterns
- **API layer**: central HTTP client in `client/src/services/api.ts`, with domain-specific service modules.
- **State management**: Zustand stores for cross-page state; React Context for highly contextual flows (e.g., review).
- **UI primitives**: components in `client/src/components/ui` wrap Radix primitives for accessibility (Dialog, Avatar, Progress, etc.).
- **RBAC / auth**: server middleware in `server/src/middleware/authMiddleware.ts`; client likely uses a `ProtectedRoute` wrapper.

#### 6. Do's and Don'ts
✅ Do
- Keep controller methods thin: delegate to services for complex logic.
- Reuse `shared/types.ts` (or extend it) to avoid client/server drift.
- Prefer accessible primitives (Radix) and keep keyboard/focus states intact.
- Use progressive disclosure in UI: show the minimum needed, reveal advanced options on demand.

❌ Don’t
- Don’t duplicate DTO/type definitions independently in client and server.
- Don’t hardcode colors: use CSS variables / Tailwind tokens.
- Don’t bypass auth/audit middleware for new endpoints.
- Don’t store derived UI state in Zustand if it can be derived locally.

#### 7. Tools & Dependencies
**Frontend**
- React 19 + React Router
- TailwindCSS (tokens via CSS variables)
- Radix UI primitives for accessibility
- TanStack React Query for async data fetching/caching
- Zustand for app state
- Framer Motion for animation/micro-interactions
- Zod + react-hook-form for validation/forms

**Backend**
- Express 5 + TypeScript
- Mongoose for MongoDB
- Multer for uploads
- JWT + bcrypt for authentication
- Helmet + CORS for security headers and cross-origin support

**Setup (high level)**
- Configure env vars from `.env.example` in both `client/` and `server/`.
- Run client via Vite and server via nodemon (`server` script `dev`).

#### 8. Other Notes (UI/UX Neuro-Design Framework)
This section is a **UI/UX framework** tailored to this product’s eDiscovery domain, optimized for cognition and tuned to modern “Bento + spatial UI” aesthetics.

##### 8.1 Global Design Tokens

**Source of truth**
- Canonical theme tokens live in: `client/src/index.css` as **HSL CSS variables** (`--background`, `--card`, `--primary`, etc.).
- Hex values below are **reference swatches** to communicate visual intent.

**Palette (Hex) — dark-mode visual intent**
- Background: `#0B0F17` (OLED-ish deep navy-black)
- Surface 1 (cards/panels): `#101828`
- Surface 2 (raised/overlay): `#162235`
- Border (hairline): `#22314D`
- Primary (action): `#3B82F6` (electric blue)
- Secondary (support): `#22C55E` (positive green)
- Accent (attention, sparing): `#A3FF12` (neon citrus; keep <5% of screen)
- Error: `#EF4444`
- Warning: `#F59E0B`
- Success: `#22C55E`
- Text / High: `#E6EDF7`
- Text / Muted: `#9AA8BF`

**Current token mapping (implementation)**
- `--background`: `hsl(222 41% 7%)`
- `--card/--popover`: `hsl(215 44% 11%)`
- `--border/--input`: `hsl(218 38% 22%)`
- `--foreground`: `hsl(214 55% 94%)`
- `--muted-foreground`: `hsl(216 18% 70%)`
- `--primary`: `hsl(217 91% 60%)`
- `--accent` (ring): `hsl(84 100% 54%)`

**Cognitive rationale:** A neutral dark base reduces glare and supports sustained attention; a single saturated primary limits bottom-up distraction while preserving clear action salience.

**Typography stack**
- UI Sans: `Inter` (fallback `system-ui`, `Segoe UI`, `Roboto`, `sans-serif`)
- Display Sans (hero/section titles): `Plus Jakarta Sans` (already configured in Tailwind)
- Optional editorial serif (only for long-form): `Fraunces` or `Source Serif 4` (avoid in dense tables)

**Modular scale (Major Third, 1.250)**
- `--text-xs`: 12px / 0.75rem, line-height 16px
- `--text-sm`: 14px / 0.875rem, line-height 20px
- `--text-md`: 16px / 1rem, line-height 24px
- `--text-lg`: 20px / 1.25rem, line-height 28px
- `--text-xl`: 25px / 1.563rem, line-height 32px
- `--text-2xl`: 31px / 1.953rem, line-height 40px
- `--text-3xl`: 39px / 2.441rem, line-height 48px
- `--text-4xl`: 49px / 3.052rem, line-height 56px

**Weights**
- Body: 400–450
- UI emphasis: 500–600
- Headings: 600–700

**Readability metrics**
- Body text measure: **45–75 characters/line**
- Dense UI (tables/forms): 38–60 characters/line
- Baseline leading: 1.45–1.6 (body), 1.15–1.25 (headings)

**Cognitive rationale:** A consistent modular scale and controlled line length reduces oculomotor correction and preserves working memory for decision-making.

##### 8.2 Core Layout Strategy
**Grid**
- Desktop: 12-column grid, `max-width: 1200–1320px`, gutters 24px
- Tablet: 8 columns, gutters 20px
- Mobile: 4 columns, gutters 16px

**Spacing scale (8pt system)**
- 4, 8, 12, 16, 24, 32, 40, 48, 64

**Bento composition**
- Use “Bento cards” for dashboards: 2–6 tiles per view; each tile contains **≤ 4 ± 1** actionable items.
- Prefer whitespace as separators; use borders only as low-contrast hairlines.

**Cognitive rationale:** Chunking information into bento tiles maps to working-memory limits and allows rapid “gist extraction” via preattentive grouping.

##### 8.3 Component Specifications (with states + micro-animations)

**A) Primary CTA Button**
- Anatomy: label (verb-first), optional left icon, optional trailing shortcut hint.
- Default:
  - bg `#3B82F6`, text uses `primary-foreground` token (avoid hardcoded foregrounds), radius 12px, height 44px, padding 14–16px horizontal
  - shadow: `0 10px 30px rgba(59,130,246,0.18)`
- Hover: bg shifts +4% brightness; shadow becomes `rgba(59,130,246,0.26)`
- Active/Pressed: translateY(1px), shadow tightens
- Disabled: bg `#22314D`, text `#9AA8BF`, no shadow
- Micro-animation:
  - `transition: transform 120ms cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 180ms cubic-bezier(0.2, 0.8, 0.2, 1), background-color 180ms cubic-bezier(0.2, 0.8, 0.2, 1)`
  - Focus ring: 2px `#A3FF12` at 40% opacity + 2px offset

**Cognitive rationale:** Clear affordance + fast easing provides immediate action confirmation, reinforcing dopaminergic “system is responsive” trust signals.

**B) Data Card (Bento Tile)**
- Anatomy: header (title + status badge), main content (key metric or table snippet), footer (1–3 actions max).
- Default:
  - surface `#101828` with subtle noise overlay (1–2% opacity)
  - border 1px `#22314D`, radius 16px
  - padding 16–24px depending on density
- Hover:
  - elevation increases: `0 18px 50px rgba(0,0,0,0.35)`
  - border becomes slightly lighter (`#2A3B5F`)
- Active/Selected:
  - left accent: 2px inset gradient (blue → cyan) OR glow ring `rgba(59,130,246,0.25)`
- Empty state:
  - show 1 sentence + 1 primary action only (avoid multi-link clutter)
- Micro-animation:
  - `transition: box-shadow 220ms cubic-bezier(0.16, 1, 0.3, 1), transform 220ms cubic-bezier(0.16, 1, 0.3, 1)`
  - on hover: translateY(-2px)

**Cognitive rationale:** Hover elevation uses preattentive depth cues to indicate interactivity without adding visual noise, improving scan speed.

**C) Navigation (App Shell Sidebar / Topbar hybrid)**
- Structure:
  - Persistent sidebar (desktop) with grouped sections (max 5 top-level groups)
  - Collapsible to icon rail; mobile uses bottom sheet/drawer
- Item anatomy: icon + label + optional badge (count)
- Default item:
  - text `#9AA8BF`, icon 20px, height 40px, radius 10px
- Active item:
  - bg `rgba(59,130,246,0.14)`, text `#E6EDF7`, left indicator 2px `#3B82F6`
- Hover:
  - bg `rgba(255,255,255,0.04)`
- Micro-interaction:
  - active indicator animates using layout transition: 180ms `cubic-bezier(0.2, 0.8, 0.2, 1)`
  - optional subtle haptic (mobile): light impact on route change

**Cognitive rationale:** Grouped navigation reduces choice overload, and a stable active indicator supports spatial memory (users “remember where things are”).

##### 8.4 Cognitive Rules of Thumb (apply everywhere)
- **4 ± 1 rule**: Never present more than ~5 primary actions per screen section; hide advanced actions under kebab menus.
  - *Rationale:* Reduces DLPFC working-memory load.
- **Progressive disclosure**: Defaults are safe; advanced filters (e.g., in Search/Review) are collapsed.
  - *Rationale:* Minimizes cognitive friction for novice users.
- **Gestalt first**: Use proximity + whitespace to define groups; avoid heavy borders.
  - *Rationale:* Leverages preattentive grouping to accelerate comprehension.
- **Saccadic flow**: Primary CTA is always top-right in content area; destructive actions are separated and require confirmation.
  - *Rationale:* Predictable focal points reduce scan effort and prevent slips.
- **Feedback loops**: Every user action produces a state change within 100–250ms (hover, pressed, skeleton, toast).
  - *Rationale:* Reinforces dopaminergic reward prediction and perceived performance.
- **Accessibility baseline**: Visible focus rings, sufficient contrast, keyboard navigation for dialogs/menus.
  - *Rationale:* Reduces effort and error rate across diverse users.
- **Accessibility targets (explicit)**:
  - Contrast: minimum **WCAG 2.1 AA** for all text; prioritize AA+ for small table text and form labels.
  - Motion: respect `prefers-reduced-motion` (reduce/disable hover lifts, slide-in transitions, and animated glows).
  - Focus: never remove focus outlines; prefer tokenized ring via `--ring`.
  - *Rationale:* Reduced effort and lower error rate across diverse users and contexts.
- **Focus ring policy (two levels)**:
  - Default: use `ring` token (`focus-visible:ring-ring`) for most elements.
  - Critical: use the citrus ring strength (≈40% opacity) only for primary CTAs, destructive confirms, and key filters.
  - *Rationale:* Preserves bottom-up salience for high-stakes actions without creating constant attentional competition.

##### 8.5 Testing Baseline (practical minimum)
- **Backend smoke tests (must-have)**: auth/login, token-protected route, upload endpoint, and one CRUD route per core domain.
- **Frontend smoke tests (must-have)**: routing to key pages (Cases, Review, Search), and one form validation flow.
- **Mocking rule**: mock IO at module boundaries (uploads, exports, notifications) and assert contracts.

##### 8.6 Styling Migration Guardrails (for contributors + LLMs)
- New UI code must use **semantic tokens** (e.g., `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `ring-ring`).
- Avoid introducing new `text-slate-*`, `bg-white`, `border-gray-*` classes in pages.
- Migrate incrementally in this order: **UI primitives → layout shell → pages**.
- *Rationale:* Keeps the system coherent and prevents partial migrations from fragmenting visual language.
