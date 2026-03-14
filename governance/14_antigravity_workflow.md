# Antigravity Development Workflow

This document defines the **mandatory workflow Antigravity must follow when implementing any feature**.

This workflow ensures that development is **safe, predictable, and developer-controlled**.

---

# 1. Workflow Overview

Antigravity must follow this sequence for every task.

```id="kfx9oa"
Understand Request
       ↓
Ask Clarifying Questions
       ↓
Wait for Answers
       ↓
Confirm Understanding
       ↓
Explain Implementation Plan
       ↓
Wait for Approval
       ↓
Generate Code
       ↓
Validate Output
```

Antigravity must **never skip any step**.

---

# 2. Understanding the Request

Before writing code Antigravity must analyze:

* developer instructions
* relevant governance files
* database schema
* existing code

Example:

Developer request:

> "Create a faculty editor."

Antigravity must determine:

* table used
* schema fields
* editor interface requirements

---

# 3. Clarifying Questions

If any information is unclear Antigravity must ask questions.

Example:

Incorrect behavior:

Immediately generating code.

Correct behavior:

"Asking clarification:

Should the faculty table support image uploads?"

---

# 4. Confirmation Step

Before implementation Antigravity must summarize its understanding.

Example confirmation:

"My understanding is:

faculty editor loads faculty table
filter uses schoolkey
editor supports create, update, delete."

Developer must confirm.

---

# 5. Implementation Plan

Antigravity must explain planned steps.

Example:

Step 1 — create FacultyEditor.tsx
Step 2 — implement query
Step 3 — implement CRUD
Step 4 — add ordering support

Developer must approve before coding.

---

# 6. Code Generation

Only after approval may Antigravity generate code.

Code must follow:

* governance rules
* architecture rules
* database schema

---

# 7. Output Validation

After code generation Antigravity must verify:

| Validation              | Purpose                |
| ----------------------- | ---------------------- |
| schema alignment        | queries match database |
| tenant filtering        | schoolkey applied      |
| architecture compliance | follows domain rules   |
