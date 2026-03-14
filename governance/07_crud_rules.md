# CRUD Rules

CRUD operations modify content tables.

CRUD must be performed using the Supabase SDK.

---

# 1. Allowed Operations

| Operation | Method   |
| --------- | -------- |
| Create    | insert() |
| Read      | select() |
| Update    | update() |
| Delete    | delete() |

---

# 2. Example Insert

```ts
supabase
.from("faculty")
.insert({
 schoolkey:schoolKey,
 name:"John",
 designation:"Math Teacher"
})
```

---

# 3. Example Update

```ts
supabase
.from("faculty")
.update({name:"Updated"})
.eq("key",facultyId)
.eq("schoolkey",schoolKey)
```

---

# 4. Safety Rule

Every mutation must include tenant filtering.

```
.eq("schoolkey",schoolKey)
```
