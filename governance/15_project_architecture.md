# EdDesk Project Architecture

This document defines the **high-level architecture of the EdDesk platform**.

It establishes the structural foundation of the system.

Detailed domain implementation rules are defined in:

```id="1t1p6q"
17_domain_layer_rules.md
```

---

# 1. Architecture Model

EdDesk follows three architectural principles:

| Principle       | Description                        |
| --------------- | ---------------------------------- |
| Feature-First   | features organized by domain       |
| Domain-Oriented | business logic isolated per domain |
| Tenant-Aware    | data isolated per school           |

---

# 2. Architecture Diagram

```id="z0g9fy"
Next.js App Router
        ↓
Feature Domains
        ↓
Tenant Context Layer
        ↓
Supabase Queries
        ↓
Database
```

---

# 3. Tenant Model

Tenant = School

Tenant column:

```id="4yewre"
schoolkey
```

Example dataset:

| schoolkey | student |
| --------- | ------- |
| school_1  | John    |
| school_1  | Sarah   |
| school_2  | Rahul   |

Query for school_1 returns only:

John
Sarah

---

# 4. Project Folder Structure

```id="c94h1v"
/app
/domains
/shared
/lib
/middleware
/types
/governance
```

Explanation:

| Folder     | Purpose                 |
| ---------- | ----------------------- |
| app        | Next.js routes          |
| domains    | feature domains         |
| shared     | reusable components     |
| lib        | infrastructure services |
| middleware | request processing      |

---

# 5. Tenant Context Layer

Tenant identification handled in:

```id="wdyew7"
/lib/tenant
```

Example files:

```id="p6v4tf"
get-tenant.ts
tenant-context.ts
```

---

# 6. Architecture Goal

The architecture ensures:

* scalable SaaS platform
* strong tenant isolation
* maintainable codebase
