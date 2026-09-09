---
name: Seed identity and foreign keys
description: Deterministic seed records must preserve explicit IDs when other seed rows reference them.
---

When seeding relational demo data, keep explicit IDs in the inserted rows that are referenced by availability windows, bookings, or other fixtures. Insert schemas that intentionally omit primary keys are useful for user-created rows, but parsing seed fixtures through them can silently generate new IDs and break foreign keys.

**Why:** A first preview needs repeatable, relational data across restarts, and foreign-key failures are otherwise easy to misdiagnose as availability or API problems.

**How to apply:** Use deterministic seed IDs with conflict-safe inserts, then keep seed-backed endpoints scoped to those IDs if an earlier failed seed attempt left duplicate development rows.