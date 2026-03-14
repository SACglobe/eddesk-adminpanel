# Domain Layer Architecture Rules

EdDesk uses **domain-based architecture** to separate business logic from UI.

---

# 1. Domain Concept

A domain represents a business entity.

Examples:

| Domain   |
| -------- |
| schools  |
| students |
| faculty  |
| events   |
| gallery  |

Each domain owns its own logic.

---

# 2. Domain Folder Structure

```id="uqltt6"
/domains
  /schools
  /students
  /faculty
  /gallery
```

Example domain:

```id="h8yprh"
/domains/students
  queries
  mutations
  types
  components
```

---

# 3. Query Example

```ts id="p5qz1y"
export async function getStudents(supabase, schoolKey){
 return supabase
 .from("students")
 .select("*")
 .eq("schoolkey",schoolKey)
}
```

---

# 4. Mutation Example

```ts id="se42d5"
export async function createStudent(supabase,schoolKey,student){
 return supabase
 .from("students")
 .insert({...student,schoolkey:schoolKey})
}
```

---

# 5. Domain Isolation Rule

Domains must not directly access other domain queries.

Shared utilities must be placed in:

```id="7p0h70"
/shared
```
