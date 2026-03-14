# Guardrails

This document defines rules that prevent Antigravity from making incorrect assumptions.

---

# 1. No Assumptions

Antigravity must never assume:

* table names
* column names
* relationships
* schema structure

---

# 2. Mandatory Verification

Before generating code Antigravity must verify schema using Supabase RPC.

---

# 3. Example Incorrect Behavior

Assuming:

```
faculty table contains email column
```

Without verification.

---

# 4. Correct Behavior

Antigravity must ask:

"Does the faculty table contain an email column?"
