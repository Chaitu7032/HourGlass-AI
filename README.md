# Hourglass AI

**The AI that predicts missed deadlines before they happen.**

An autonomous execution operating system for the Google VIBE2SHIP Hackathon. Not a reminder app — a predictive Chief of Staff powered by Gemini 2.5 Flash and a 10-agent orchestration pipeline.

## Demo (30-second WOW)

1. Open the app → Click **Launch Demo**
2. Four commitments load: Exam (7d), Interview (5d), Hackathon (4d), Assignment (3d)
3. Agents activate in sequence — Risk calculated, failure detected at 89%
4. Heatmap, Future Self, Opportunity Loss, and Rescue Plan appear automatically

## Architecture

```
Planner → Memory → Focus → Energy → Risk → Calendar → Opportunity → Negotiation → Rescue → Reflection
                                    ↑
                              Orchestrator (Gemini 2.5 Flash)
```

### Agents

| Agent | Role |
|-------|------|
| Planner | Goal decomposition, execution roadmap |
| Risk | Failure probability with explainable factors |
| Calendar | Execution windows, schedule reorganization |
| Focus | Velocity, procrastination detection |
| Energy | Mental energy vs available time |
| Memory | Long-term behavioral patterns |
| Opportunity | Opportunity cost quantification |
| Negotiation | Capacity-aware trade-off scenarios |
| Accountability | Rescue mode, escalation |
| Reflection | Model improvement from outcomes |

### Tech Stack

- **Frontend:** Next.js 16, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion, Zustand, React Query
- **AI:** Gemini 2.5 Flash via `@google/generative-ai`
- **Backend:** Next.js API Routes, Firebase Cloud Functions (ready)
- **Database:** Firestore with security rules
- **Auth:** Firebase Auth
- **Deploy:** Firebase Hosting

## Quick Start

```bash
cd hourglass-ai
npm install
cp .env.example .env.local
# Add GEMINI_API_KEY from https://aistudio.google.com/apikey
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → **Launch Demo**

Works offline without API keys (deterministic orchestration engine). With `GEMINI_API_KEY`, executive summaries and chat are enhanced by Gemini.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages & API
├── components/
│   ├── dashboard/          # Mission Control, Risk, Future Self UI
│   ├── layout/             # Sidebar, shell
│   └── ui/                 # Design system primitives
├── lib/
│   ├── agents/             # Orchestrator, Gemini, prompts
│   ├── firebase/           # Config, collections
│   └── store/              # Zustand state
└── types/                  # Strict TypeScript domain types
```

## Firestore Collections

`users/{uid}/tasks`, `goals`, `riskAssessments`, `rescuePlans`, `agentLogs`, `memory`, `predictions`, `simulations`, and more — see `firestore.rules`.

## Judging Criteria Alignment

| Criterion | Implementation |
|-----------|----------------|
| Problem Solving | Predictive failure vs reactive reminders |
| Agentic AI | 10-agent pipeline with orchestrator |
| Innovation | Future Self, Opportunity Loss, Energy Model, Commitment Score |
| Google Tech | Gemini, Firebase, Firestore, Calendar-ready |
| Product Design | Glassmorphism, Mission Control UX |
| Technical | Production TypeScript, API routes, security rules |
| Completeness | Full demo flow, 7 screens, voice coach |

## License

MIT — Built for Google VIBE2SHIP Hackathon
