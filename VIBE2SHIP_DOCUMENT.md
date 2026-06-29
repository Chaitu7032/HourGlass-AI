# ⏳ Hourglass AI

**The AI that predicts missed deadlines before they happen.**

*Predictive Execution Operating System — Google VIBE2SHIP Hackathon*

---

## 1. Problem Statement Selected

### The Execution Gap

Every productivity tool today is **reactive**. Google Tasks, Notion, Todoist, and Calendar all share the same fundamental flaw: they notify you **after** you've already fallen behind.

| Tool | Problem |
|------|---------|
| Google Tasks | Passive lists, no intelligence |
| Notion | Great for notes, terrible for execution |
| Todoist | Reminders fire after failure, not before |
| Calendar | Shows time, ignores capacity |
| All of them | Wait until you miss a deadline to notify you |

### The Core Failure

> **80% of missed deadlines are predictable 7+ days in advance — yet no tool predicts them.**

The signals are already there:
- Task complexity vs. remaining hours
- Historical completion velocity
- Calendar density and free time
- Deadline proximity
- Dependency chains
- Energy and focus patterns

No existing tool connects these signals into a unified prediction. By the time a user realizes they're behind, stress is high, options are limited, and the deadline is approaching.

### Why This Matters

Students miss exam deadlines. Founders miss demo days. Developers miss sprint commitments. Job seekers miss interview preparation windows. In every case, the failure was **predictable** — but no system existed to predict it.

**Hourglass AI solves this by transforming execution from reactive scrambling into predictive orchestration.**

---

## 2. Solution Overview

### What Hourglass AI Does

Hourglass AI is an autonomous **Predictive Execution Operating System** powered by a 10-agent AI pipeline. It doesn't just track tasks — it predicts which commitments will fail, explains why, and builds rescue plans before deadlines are missed.

### The Core Loop

```
User adds commitment
        ↓
10-agent pipeline analyzes across 7 risk dimensions
        ↓
Failure probability computed with explainable factors
        ↓
If risk ≥ 65% → Rescue Mode activates automatically
        ↓
Rescue plan generated: actions, roadmap, voice coaching
        ↓
Future Self simulation shows 14-day trajectory
        ↓
User executes, logs progress, system learns
```

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (Next.js 16)                       │
│  Mission Control · Risk Heatmap · Timeline · Future Self    │
│  Rescue Mode · AI Chief of Staff · Voice Coach              │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    API LAYER (Next.js Routes)                │
│  /api/orchestrate · /api/chat · /api/planner                │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    AI LAYER (10 Agents)                      │
│  Planner → Memory → Focus → Energy → Risk → Calendar       │
│  → Opportunity → Negotiation → Accountability → Reflection  │
│  + Gemini 2.5 Flash (optional enhancement)                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    DATA LAYER (Firebase)                     │
│  Firestore · Firebase Auth · Firebase Hosting               │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Deterministic** | Same input always produces same output — no randomness |
| **Explainable** | Every prediction includes factor breakdown and reasoning |
| **Graceful Degradation** | Works without Gemini, without calendar, without history |
| **Data-Aware** | Confidence scores reflect data completeness — never overstates |
| **Real-time** | Firestore listeners push updates to dashboard instantly |

---

## 3. Key Features

### 3.1 Mission Control Dashboard

The central nervous system. Every metric is computed in real-time from the user's commitments, execution profile, and AI pipeline.

```
┌─────────────────────────────────────────────────────────────────┐
│  Mission Control                         4 active commitments   │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Current  │  │Workload  │  │Execution │  │ Burnout  │       │
│  │ Capacity │  │Utilization│  │Confidence│  │  Risk    │       │
│  │  22h/wk  │  │   85%    │  │  Medium  │  │ Moderate │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                  │
│  Risk Assessment: HIGH                   2 tasks need attention │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Hackathon Submission · 4d left                  89% risk │   │
│  │ Final Exam · 7d left                            72% risk │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Weekly Capacity: Mon ████████████ 6h · Tue ██████████ 5h ...   │
└─────────────────────────────────────────────────────────────────┘
```

**User Benefit:** "I know exactly where I stand within 30 seconds of opening the app."

### 3.2 Risk Heatmap with Explainable Factors

Every commitment is scored with a failure probability. Each score includes a breakdown of contributing factors.

```
┌─────────────────────────────────────────────────────────────────┐
│  Risk Factor Breakdown (Hackathon Submission — 89% risk)        │
│                                                                  │
│  Execution Velocity    ████████████████ 30%                     │
│  Deadline Proximity    ██████████ 20%                           │
│  Progress Lag          ████████ 16%                             │
│  Task Complexity       █████ 10%                                │
│  Portfolio Pressure    ████ 8%                                  │
│  Protective Factors    ████████ -16%                            │
│                                                                  │
│  Confidence: HIGH (82%) — 14 tracked days, 18h completed work   │
└─────────────────────────────────────────────────────────────────┘
```

**User Benefit:** "I can see exactly WHY a task is at risk, not just that it is."

### 3.3 Rescue Mode (Automatic at ≥65% Risk)

When any commitment crosses 65% failure probability, Rescue Mode activates automatically with a step-by-step recovery plan.

```
┌─────────────────────────────────────────────────────────────────┐
│  🆘 Rescue Mode Active — Hackathon Submission (89% risk)        │
│                                                                  │
│  Actions:                                                        │
│  ① Convert 14h remaining into 10 focused sessions               │
│  ② Protect 3.5h/day until deadline                              │
│  ③ Defer lower-ranked commitments to next week                  │
│                                                                  │
│  Roadmap:                                                        │
│  ✅ Step 1: Protect first 1.5h session (90 min)                 │
│  ⬜ Step 2: Clear workload for 3.5h/day (20 min)                │
│  ⬜ Step 3: Review progress after next block (5 min)            │
└─────────────────────────────────────────────────────────────────┘
```

**User Benefit:** "When I'm at risk, I don't get a warning — I get a plan."

### 3.4 Future Self Simulation

Simulates 14 days into the future across three scenarios: Current Trajectory, Rescue Activated, Optimized Execution.

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Current     │  │  Rescue      │  │  Optimized   │
│  Trajectory  │  │  Activated   │  │  Execution   │
│  Score: 52   │  │  Score: 68   │  │  Score: 81   │
│  Missed: 2   │  │  Missed: 1   │  │  Missed: 0   │
│  Stress: 74  │  │  Stress: 52  │  │  Stress: 38  │
└──────────────┘  └──────────────┘  └──────────────┘
```

**User Benefit:** "I can see exactly what happens if I don't change — and what happens if I do."

### 3.5 AI Chief of Staff (Gemini-Powered Chat)

A conversational AI that understands the user's entire execution context. Not a chatbot — a chief of staff.

| Query | Response |
|-------|----------|
| "What's my highest risk?" | "Hackathon Submission at 89%. Main factors: velocity (need 3.5h/day, average 2.1h/day) and deadline proximity (4 days, 14h remaining)." |
| "What if I defer the assignment?" | "Utilization drops from 85% to 62%. Frees 6h/week. Hackathon risk reduces from 89% to ~64%. Trade-off: assignment moves to Jul 12." |
| "Show me the rescue plan" | [Displays 3 actions + 4-step roadmap with checkboxes] |

**User Benefit:** "I have an executive assistant who knows everything about my commitments."

### 3.6 Voice Coach

Every orchestration generates a voice-ready coaching message. Calm, strategic briefing — not a robotic notification.

> *"Good morning. You have 4 active commitments with 24 hours of remaining work. Hackathon Submission is your highest priority at 89% risk. I recommend starting with a 90-minute focus session. Your commitment score is 62/100 and trending down. Let's protect today's execution window."*

**User Benefit:** "I get a calm, strategic briefing without opening the app."

### 3.7 Commitment Score

A 6-dimension execution health score (0-100) that tracks performance over time.

| Dimension | Weight | What It Measures |
|-----------|--------|-----------------|
| Completion Rate | 18% | Completed hours vs. estimated hours |
| Planning Quality | 14% | Overdue work, compressed deadlines, complexity |
| Execution Consistency | 20% | Actual progress vs. expected progress |
| Recovery Ability | 14% | Overload ratio, overdue recovery |
| Focus | 16% | Fragmentation pressure, near-term deadlines |
| Reliability | 18% | Blended consistency, completion, deadline adherence |

**User Benefit:** "I have a single number that tells me how healthy my execution is."

---

## 4. Technologies Used

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 16 + TypeScript | App Router, server/client components, type safety |
| **UI** | Tailwind CSS + shadcn/ui + Framer Motion | Design system, glassmorphism, animations |
| **State** | Zustand + React Query | Client state management, server state caching |
| **AI Pipeline** | Custom TypeScript Orchestrator | 10-agent deterministic execution engine |
| **AI Enhancement** | Gemini 2.5 Flash (`@google/generative-ai`) | Executive summaries, chat, voice coach |
| **Database** | Firestore | Real-time NoSQL with security rules |
| **Auth** | Firebase Auth | Google Sign-In, email/password |
| **Hosting** | Firebase Hosting | Production deployment, global CDN |
| **Backend** | Next.js API Routes | Server-side orchestration, chat endpoints |

### 10-Agent Pipeline

| # | Agent | Role | Key Output |
|---|-------|------|------------|
| 1 | **Planner** | Goal decomposition, execution roadmap | Normalized task list |
| 2 | **Memory** | Long-term behavioral patterns | BehaviorPattern, velocity |
| 3 | **Focus** | Velocity, procrastination detection | Focus score (0-100) |
| 4 | **Energy** | Mental energy vs. available time | EnergyProfile, peak windows |
| 5 | **Risk** | Failure probability with explainable factors | RiskAssessment per task |
| 6 | **Calendar** | Execution windows, schedule reorganization | CalendarBlock[] |
| 7 | **Opportunity** | Opportunity cost quantification | OpportunityImpact[] |
| 8 | **Negotiation** | Capacity-aware trade-off scenarios | NegotiationOption[] |
| 9 | **Accountability** | Rescue mode, escalation | RescuePlan[] |
| 10 | **Reflection** | Model improvement from outcomes | Execution snapshot |

### Agent Pipeline Flow

```
Planner → Memory → Focus → Energy → Risk → Calendar → Opportunity → Negotiation → Accountability → Reflection
                                                                                                    ↓
                                                                                          Gemini 2.5 Flash
                                                                                         (optional enhancement)
                                                                                                    ↓
                                                                                          Dashboard (Firestore)
```

### Key Formulas

**Risk Probability:**
```
probability = 0.04 + velocityImpact(0-30%) + deadlineImpact(0-20%) + progressLag(0-20%)
             + complexity(0-10%) + portfolioPressure(0-16%) + priority(0-8%) + dependencies(0-12%)
             - protectiveFactors(0-18%)
Clamped to [0.03, 0.98]
```

**Confidence Score:**
```
confidence = 0.38 + historyConfidence * 0.35 + (hasTasks ? 0.1 : 0) + (hasDeps ? 0.03 : 0)
historyConfidence = min(trackedDays/14, 1) * 0.55 + min(completedHours/12, 1) * 0.45
```

**Rescue Threshold:** `failureProbability >= 0.65`

---

## 5. Google Technologies Utilized

Every Google technology serves a specific purpose. Nothing is included for decoration.

| Technology | Role | How It's Used | Impact |
|-----------|------|---------------|--------|
| **Gemini 2.5 Flash** | AI Enhancement | Generates executive summaries, voice coach messages, chat responses, and planner suggestions via `@google/generative-ai` SDK | Provides natural language intelligence on top of deterministic orchestration. System functions fully without it — graceful degradation. |
| **Firebase Authentication** | User Identity | Google Sign-In and email/password authentication. Protects all Firestore data with user-scoped security rules. | Every user's data is isolated and secure. No cross-user leakage. |
| **Firestore** | Real-time Database | Stores tasks, goals, risk assessments, rescue plans, agent logs, memory, predictions, simulations, and user profiles. Real-time listeners push updates to the dashboard instantly. | Enables real-time dashboard updates without polling. Every orchestration result is immediately visible. |
| **Cloud Functions** | Serverless Backend | Ready for background orchestration triggers, calendar sync, and scheduled risk reassessments. | Event-driven architecture without managing servers. |
| **Firebase Hosting** | Production Deployment | Deploys the Next.js application with a single command. Global CDN for fast loading. | Production-ready deployment with zero configuration. |
| **Google Calendar API** | Availability Data | Planned integration to read calendar events and compute available execution windows. | Unlocks Energy Agent's full capacity analysis and deep work window detection. |
| **Vertex AI** | Production AI | Planned migration path for higher-volume AI workloads. | Scales AI capabilities beyond client-side rate limits. |
| **Gemini Live** | Voice Interface | Planned integration for two-way voice conversation with the AI Chief of Staff. | Enables hands-free execution coaching. |

### How Google Technologies Work Together

```
User authenticates via Firebase Auth
        ↓
User ID scopes all Firestore data via security rules
        ↓
User creates commitment → Firestore write → Real-time listener
        ↓
API Route triggers orchestration → 10-agent pipeline runs
        ↓
Gemini 2.5 Flash enhances summary (optional, graceful fallback)
        ↓
Result written to Firestore → Dashboard updates in real-time
        ↓
User sees: Risk heatmap, timeline, future self, rescue plans
```

### Graceful Degradation

| Scenario | What Works | What's Limited |
|----------|-----------|----------------|
| No Gemini API key | Full orchestration, all agents, dashboard | Executive summaries use deterministic templates |
| No calendar connected | All agents except Calendar | Energy Agent shows "insufficient data" |
| No execution history | All agents, risk assessment | Confidence is "low," Future Self unavailable |
| Offline (no API) | Deterministic orchestration, cached data | Gemini enhancement, real-time updates |

### Firestore Data Model

```
users/{uid}
├── tasks/{taskId}        — title, deadline, estimatedHours, completedHours, priority, category, complexity
├── goals/{goalId}        — title, targetDate, tasks[], status
├── riskAssessments/{id}  — taskId, failureProbability, confidence, factors[], reasoning
├── rescuePlans/{id}      — taskId, actions[], roadmap[], voiceMessage
├── agentLogs/{id}        — agent, status, message, durationMs, output
├── memory/{id}           — behavior patterns, velocity, focus score
├── predictions/{id}      — predictedCompletionDate, confidence, factors
├── simulations/{id}      — scenario, projections[], summary
└── executionProfile/{id} — work hours, energy profile, preferences
```

**Security:** All data is user-scoped via Firestore security rules — `request.auth.uid == userId`.

---

## Appendix: Demo Scenario

### Default Demo Data

| Task | Deadline | Hours | Priority | Complexity | Category |
|------|----------|-------|----------|------------|----------|
| Hackathon Submission | 4 days | 16h | Critical | 8/10 | Hackathon |
| Final Exam | 7 days | 12h | High | 7/10 | Exam |
| Interview Prep | 5 days | 6h | High | 5/10 | Interview |
| Assignment | 3 days | 4h | Medium | 4/10 | Assignment |

### Expected Demo Output

| Metric | Value |
|--------|-------|
| Highest Risk | Hackathon Submission: 89% |
| Rescue Threshold Crossed | Yes (≥65%) |
| Rescue Plans Generated | 1 (Hackathon Submission) |
| Commitment Score | ~62/100 |
| Trend | Declining |
| Future Self (Day 7) | 2 missed deadlines projected |
| Confidence | Limited (no execution history) |

---

*Built for Google VIBE2SHIP Hackathon*

**Stack:** Gemini 2.5 Flash · Firebase Auth · Firestore · Cloud Functions · Firebase Hosting · Next.js 16 · TypeScript