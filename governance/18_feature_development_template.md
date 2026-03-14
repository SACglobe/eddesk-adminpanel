# Feature Development Template

This document defines the **standard process for building new features**.

Antigravity must follow this structure for every feature.

---

# 1. Feature Definition

Example feature:

Faculty Management

Purpose:

Allow administrators to manage faculty members.

---

# 2. Domain Creation

Create domain folder:

```id="l4k7z4"
/domains/faculty
```

---

# 3. Queries

Define read queries.

Example:

```id="k7p2ut"
getFaculty
```

Query file:

```id="4myt3t"
/domains/faculty/queries/getFaculty.ts
```

---

# 4. Mutations

Define write operations.

Example:

```id="b0idpd"
createFaculty
updateFaculty
deleteFaculty
```

---

# 5. UI Components

Example components:

| Component     |
| ------------- |
| FacultyTable  |
| FacultyForm   |
| FacultyEditor |

---

# 6. Validation Checklist

Before completing a feature verify:

| Check                 | Purpose                |
| --------------------- | ---------------------- |
| schema verified       | database alignment     |
| tenant filtering      | school isolation       |
| governance compliance | architecture integrity |

---

# 7. Feature Workflow Diagram

```id="fgic3d"
Define Feature
      ↓
Create Domain
      ↓
Write Queries
      ↓
Write Mutations
      ↓
Build UI
      ↓
Validate Implementation
```

This template ensures all features are implemented consistently.
