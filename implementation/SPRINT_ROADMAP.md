# Sprint Roadmap - Mock IT Marketplace Platform

## Overview

This project is organized into **4 sprints** using Scrum methodology. Each sprint delivers a potentially shippable increment of the platform.

### Sprint Duration
- Each sprint: 4-6 hours of focused development
- Total project: ~20-30 hours
- Recommended: Complete 1 sprint per day or split across 2 days

---

## Sprint 0: Foundation & Setup
**Goal:** Establish project infrastructure and database

**Deliverables:**
- Initialized Node.js/TypeScript project
- SQLite database with migrations
- Seed data (product catalog)
- Development environment ready

**Stories:** 2 | **Tasks:** 5 | **Estimated Time:** 3-4 hours

**Status:** ✅ Completed

**See:** `done/sprint-0-foundation.md`

---

## Sprint 1: Core Platform Services
**Goal:** Implement event and inventory management

**Deliverables:**
- Event service (create, query, replay)
- Inventory service (CRUD operations)
- Authentication service (JWT)
- Core API endpoints (public + admin)

**Stories:** 4 | **Tasks:** 12 | **Estimated Time:** 8-10 hours

**Status:** ✅ Completed

**See:** `done/sprint-1-core-services.md`

---

## Sprint 2: Dashboard & APIs
**Goal:** Build staff dashboard and complete API routes

**Deliverables:**
- Staff dashboard (HTML/CSS/JS)
- Complete API routes (public + admin)
- Middleware (auth, mode enforcement)
- Chat service

**Stories:** 4 | **Tasks:** 10 | **Estimated Time:** 6-8 hours

**Status:** ✅ Completed

**See:** `done/sprint-2-dashboard-apis.md`

---

## Sprint 3: Bot & Hardening
**Goal:** Add customer bot, chaos features, and error handling

**Deliverables:**
- Customer bot service
- Chaos event support (duplicates, delays, out-of-order)
- Comprehensive error handling
- Logging system
- Mode enforcement (dev/judging)

**Stories:** 3 | **Tasks:** 8 | **Estimated Time:** 4-6 hours

**Status:** ✅ Completed

**See:** `done/sprint-3-bot-hardening.md`

---

## Sprint 4: Testing & Deployment
**Goal:** Ensure quality and deployability

**Deliverables:**
- Unit tests for services
- Integration tests for APIs
- Docker containerization
- Documentation
- Deployment scripts

**Stories:** 3 | **Tasks:** 8 | **Estimated Time:** 4-6 hours

**Status:** ✅ Completed

**See:** `done/sprint-4-testing-deployment.md`

---

## Definition of Done (DoD)

Each story is **complete** when:
- [ ] Code is written and follows TypeScript best practices
- [ ] Code is committed to git with descriptive message
- [ ] Manual testing confirms functionality works
- [ ] Edge cases are handled (errors, validation)
- [ ] Code is documented with comments where complex

Each sprint is **complete** when:
- [ ] All stories in sprint meet DoD
- [ ] Sprint goals are achieved
- [ ] No critical bugs remain
- [ ] Platform is in a deployable state

---

## Sprint Progress Tracking

| Sprint | Status | Stories Complete | Tasks Complete | Notes |
|--------|--------|------------------|----------------|-------|
| Sprint 0 | ✅ Completed | 2/2 | 5/5 | Initial setup |
| Sprint 1 | ✅ Completed | 4/4 | 12/12 | Core features |
| Sprint 2 | ✅ Completed | 4/4 | 10/10 | Dashboard & APIs |
| Sprint 3 | ✅ Completed | 3/3 | 8/8 | Bot & polish |
| Sprint 4 | ✅ Completed | 3/3 | 8/8 | Testing & deployment |

---

## Quick Reference

### User Story Format
```
**As a** [role]
**I want** [feature]
**So that** [benefit]

**Acceptance Criteria:**
- [ ] Criteria 1
- [ ] Criteria 2

**Tasks:**
1. [ ] Task 1
2. [ ] Task 2
```

### Task Breakdown Principles
- Tasks should be 1-2 hours of work
- Tasks should be independently testable
- Tasks should have clear completion criteria
- Group related changes into single tasks

---

## Dependencies

**Sprint 0** must be completed before **Sprint 1** (database required for services)

**Sprint 1** must be completed before **Sprint 2** (services required for APIs)

**Sprint 2** and **Sprint 3** can be done in parallel (dashboard and bot are independent)

**Sprint 4** should be done last (testing requires complete features)

---

## Risk Management

| Risk | Impact | Mitigation |
|------|--------|------------|
| SQLite performance issues | Medium | Use WAL mode, optimize queries |
| Dashboard complexity | Medium | Keep it simple, use vanilla JS |
| JWT security issues | High | Use strong secrets, validate scopes |
| Time constraints | High | Focus on MVP features first |
| Mode enforcement gaps | High | Server-side validation only |

---

**Last Updated:** 2026-01-03
**Status:** All Sprints Completed! Platform is ready for hackathon!
