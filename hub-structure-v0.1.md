# Personal Hub — structure v0.1

Working draft for review. The main PC and phone handle planning; the Surface displays the accepted plan and supports quick actions. Google Calendar supplies commitments, Notion supplies tasks, and the hub stores proposals and accepted plans. No calendar or Notion writes in this version.

## 1. Navigation

### Today
Default Surface screen. Show current date, Now, Next, a daily timeline, must-do tasks, progress, and last successful synchronization time. Quick actions: start/pause a task, complete a task, record remaining time, and request a revised plan. Starting a task is optional; completion does not require using a timer. Show an explicit empty state when no plan has been accepted. Offline mode displays the saved plan and queues local actions for synchronization.

### Planner
Primary PC screen. Three regions: backlog, today's selection, and timeline/proposals. On phone, use sequential screens and Add to Today buttons instead of requiring drag-and-drop.

Backlog supports search and filters for source, project, priority, due date, and status. Task cards show title, duration estimate, deadline, and source link.

Today's selection distinguishes Required Today from Optional Today. A task can be preferred for today without changing its actual deadline. Show selected task duration, available time, and unscheduled work separately.

Generate Focus, Balanced, and Essentials proposals. Each reports included tasks, deferred tasks with reasons, time left free, and estimate uncertainty. Adjust blocks and pin them before accepting. Infeasible selections produce an explanation and partial plans, never overlapping blocks to hide overload.

### Tasks
Unified view of imported and hub-created tasks. Task detail shows source information, scheduling information, notes, and scheduled sessions. Open the original Notion record from here. Keep hub completion distinct from imported Notion status until write-back is deliberately introduced.

### Settings
Working hours and day boundaries, breaks, preferred focus-session length, scheduling buffer, optional category time preferences, selected Google calendars, Notion database mappings, device display mode, and integration status. Calendar events marked busy block availability; transparent/free events do not. Preserve event time zones and distinguish all-day reminders from all-day commitments through a setting.

## 2. Daily planning loop

1. Refresh source tasks and calendar commitments; display source freshness.
2. Select a planning date and choose required and optional tasks, or ask for suggestions from the backlog.
3. Resolve missing duration estimates. Offer editable suggestions, visibly marked as unconfirmed.
4. Generate proposals within working hours, respecting commitments, pinned blocks, deadlines, dependencies when configured, breaks, and buffers.
5. Compare and edit proposals. Choosing one saves a versioned accepted plan in the hub.
6. Display the accepted plan across devices. Record completion or remaining work.
7. Replan only unfinished work. Preserve completed sessions, fixed commitments, and pinned blocks. Preview changes before replacing the accepted plan.

Source changes can mark a plan as needing review. Do not silently replace the accepted plan. A new calendar conflict should be visible immediately after synchronization.

## 3. Task fields

### Minimum fields

| Field | Owner | Requirement |
|---|---|---|
| Title | Notion or hub | Required |
| Source record ID and URL | Integration | Required for imported tasks; prevents duplicates |
| Source status | Notion | Map available values to actionable / inactive / completed |
| Estimated minutes | Notion if mapped; otherwise hub | Required before scheduling; may be a confirmed estimate or tentative suggestion |
| Priority | Notion if mapped; otherwise hub | Optional; default Normal |
| Due date/time | Notion if mapped; otherwise hub | Optional; preserve date-only vs exact deadline |
| Project/category | Notion if mapped; otherwise hub | Optional; helps filter and explain proposals |

### Hub scheduling fields

| Field | Purpose | Initial default |
|---|---|---|
| Selected planning date | Which day the user is considering | Unselected |
| Required today | Mandatory selection for the proposal, subject to feasibility | False |
| Remaining minutes | Supports partial progress and replanning | Estimated minutes |
| Splittable | Whether work can span multiple blocks | False |
| Minimum session minutes | Avoids unusably short pieces of split tasks | 25 when splitting is enabled; editable |
| Estimate confidence | Separates confirmed values from suggestions | Unconfirmed until reviewed |
| Hub completion | Tracks completion without changing Notion | Incomplete |

### Later fields, only if useful

Energy demand, preferred time window, prerequisites, location, recurrence, earliest start, and estimate history. Fitness can initially use hub-created tasks with a Fitness category and a duration. Recurring routines and music integrations follow after daily planning works.

If a field is mapped to Notion, imported updates refresh that field. A deliberate hub override must be stored separately and labeled; it must not silently overwrite the source value.

## 4. Separate tasks from time blocks

A task describes work. A plan block describes a session at a particular time. One task can have several sessions. Moving a session does not change the task deadline.

Core records:

- Task: source identity, descriptive fields, scheduling attributes, remaining work, hub completion.
- Calendar commitment: external calendar/event identity, start/end, busy state, source version.
- Day selection: date, task identity, required/optional choice.
- Plan: date, proposal strategy, draft/accepted/superseded status, version, generation time, input freshness.
- Plan block: plan identity, optional task identity, start/end, task/break/buffer type, pinned state.
- Activity: task identity, optional block identity, actual start/end, completion or progress update.
- Preferences: availability, breaks, buffer, session rules, time zone.
- Integration mapping: Notion data source identity, property mappings, status mappings, and selected calendars.

Store planning time zone explicitly. Use stable external IDs rather than task titles for matching. Deduplicate recurring calendar instances using provider identifiers and occurrence identity.

## 5. Proposal behavior

All strategies must satisfy the same hard constraints. Differences come from ranking and placement preferences:

- Focus: prioritize important work and longer uninterrupted sessions.
- Balanced: spread work across the day and honor category preferences while retaining breaks and free capacity.
- Essentials: prioritize required tasks and urgent deadlines; leave more optional work unscheduled.

Explain each omitted task: insufficient total time, no sufficiently long window, missing estimate, unmet prerequisite, or deadline conflict. Suggestions from the backlog must exclude inactive and completed tasks. Proposals may be similar if constraints leave little choice; do not manufacture variety.

Use deterministic scheduling rules to validate feasibility. AI may suggest estimates, task breakdowns, rankings, and explanations, but generated proposals must pass overlap, availability, duration, and dependency checks.

## 6. First implementation scope

- One Notion task database initially, with reusable property mapping for later databases.
- Selected Google calendars, read-only.
- Hub-created tasks to cover work absent from Notion.
- Backlog, today selection, three proposals, manual adjustment, and accepted plan.
- Surface dashboard with completion and replan actions.
- Authenticated cross-device access, persistent sessions, and offline cached viewing.
- Source refresh on reconnect and visible synchronization errors.
- No external writes, autonomous plan replacement, music control, or full recurring-routine system yet.

## 7. Proposed stack

React + TypeScript + Vite; Tailwind CSS; Supabase Auth, PostgreSQL, and Realtime; server functions for integration credentials, synchronization, and hosted AI calls; a TypeScript scheduling module; Dexie and a PWA service worker for cached viewing. Offline writes and reconciliation require explicit implementation, not just a local cache. Desktop packaging is optional later.

## 8. Review decisions

Confirm navigation and the Planner layout first. Then decide the default scheduling rules and which optional task attributes are valuable. Only after those decisions map Notion properties. The minimum source information is title, stable identity, and an actionable-status interpretation; scheduling estimates can be maintained in the hub.
