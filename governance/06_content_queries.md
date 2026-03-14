# Tenant Data Protection Rule

EdDesk is a **multi-tenant SaaS platform**.

Each tenant represents a **school**.

The tenant identifier used throughout the database is:

```
schoolkey
```

Every query that reads or modifies tenant data must include a filter for `schoolkey`.

This rule ensures that **one school cannot access another school's data**.

---

# 1. Mandatory Tenant Filter

All tenant-scoped database queries must include:

```
.eq("schoolkey", schoolKey)
```

Example correct query:

```ts
supabase
.from("faculty")
.select("*")
.eq("schoolkey", schoolKey)
```

This query returns only faculty members belonging to the current school.

---

# 2. Example of Incorrect Query

The following query is **forbidden**:

```ts
supabase
.from("faculty")
.select("*")
```

Reason:

This query returns data for **all schools**.

That would break tenant isolation.

---

# 3. Example Dataset

Example faculty table:

| schoolkey | name  |
| --------- | ----- |
| school_1  | John  |
| school_1  | Sarah |
| school_2  | Rahul |
| school_2  | Priya |

If `school_1` admin runs a correct query:

```ts
.eq("schoolkey","school_1")
```

Returned data:

| name  |
| ----- |
| John  |
| Sarah |

Without the tenant filter the result would include:

John
Sarah
Rahul
Priya

This must never happen.

---

# 4. Tenant Query Flow

All tenant queries follow this flow:

```
Admin Request
      ↓
Resolve Tenant (schoolkey)
      ↓
Apply schoolkey filter
      ↓
Execute Supabase Query
      ↓
Return Tenant Data
```

---

# 5. Tenant Filter Enforcement

Antigravity must verify every query before generating code.

Checklist:

| Validation                      | Required |
| ------------------------------- | -------- |
| table is tenant scoped          | yes      |
| query includes schoolkey filter | yes      |

If a query does not include a tenant filter, Antigravity must stop and correct it.

Example message:

"This query does not include tenant filtering using schoolkey. Tenant isolation must be applied."

---

# 6. Exceptions

Some tables are **global system tables** and may not contain `schoolkey`.

Example:

| Table             | Reason                |
| ----------------- | --------------------- |
| templates         | shared across schools |
| componentregistry | system configuration  |
| templatescreens   | template structure    |

These tables may be queried without tenant filtering.

However, Antigravity must verify schema using MCP before assuming a table is global.

---

# 7. Tenant Safety Principle

Tenant isolation is critical for SaaS security.

Without tenant filtering:

• schools could see other schools' data
• sensitive information could leak
• the system would violate SaaS security standards

Therefore tenant filtering using `schoolkey` is mandatory.

Antigravity must never generate queries that expose data across tenants.

---

# 8. Query Validation Before Execution

Before finalizing any query Antigravity must confirm:

| Check                      | Purpose      |
| -------------------------- | ------------ |
| table contains schoolkey   | tenant table |
| query filters by schoolkey | isolation    |
| developer confirmed logic  | safety       |

If any of these checks fail, Antigravity must pause and ask the developer.
