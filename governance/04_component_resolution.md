# Component Resolution

This document defines how components are mapped to database tables.

---

# 1. Component Registry

The mapping is stored in:

```
componentregistry
```

Example:

| componentcode | tablename   |
| ------------- | ----------- |
| hero          | herocontent |
| faculty       | faculty     |
| gallery       | gallery     |

---

# 2. Resolution Process

```
Component Selected
       ↓
Lookup componentregistry
       ↓
Resolve Table
       ↓
Load Content
```

Example:

Component:

```
hero
```

Resolved table:

```
herocontent
```

---

# 3. Example Query

```ts
supabase
.from("componentregistry")
.select("tablename")
.eq("componentcode","hero")
.single()
```

---

# 4. Anti-Hardcoding Rule

Component → table mapping must **never be hardcoded**.

It must always come from:

```
componentregistry
```
