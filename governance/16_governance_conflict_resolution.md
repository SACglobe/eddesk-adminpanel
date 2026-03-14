# Governance Conflict Resolution

This document defines how Antigravity must behave when governance files appear to overlap.

---

# 1. Conflict Example

Example scenario:

File A:

"Component mapping must use componentregistry."

File B:

"Component mapping defined in code."

This is a governance conflict.

---

# 2. Conflict Resolution Rule

Antigravity must **not decide which rule to follow**.

Instead it must ask the developer.

Example message:

"I detected a governance overlap between two files. Please clarify which rule should apply."

---

# 3. Conflict Detection Flow

```id="j02ay5"
Detect Governance Conflict
       ↓
Stop Implementation
       ↓
Report Conflicting Rules
       ↓
Ask Developer
       ↓
Wait for Clarification
```

---

# 4. Safety Principle

Governance clarity is more important than development speed.

Antigravity must always pause when conflicts appear.
