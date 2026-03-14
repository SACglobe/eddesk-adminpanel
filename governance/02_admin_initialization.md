# Admin Panel Initialization

This document explains how the admin panel loads initial data.

---

# 1. Initialization RPC

When the admin panel loads it must call:

```
get_admin_initial_data
```

Example:

```ts
const { data } = await supabase.rpc("get_admin_initial_data")
```

---

# 2. RPC Response

The RPC returns the following information:

| Data               | Description                 |
| ------------------ | --------------------------- |
| admin              | logged in admin information |
| school             | tenant school details       |
| templatescreens    | list of screens             |
| templatecomponents | components per screen       |

Example response:

```
{
 admin:{},
 school:{},
 templatescreens:[],
 templatecomponents:[]
}
```

---

# 3. Initialization Flow

```
Admin Login
   ↓
Call RPC get_admin_initial_data
   ↓
Receive School Details
   ↓
Receive Screens
   ↓
Receive Components
   ↓
Render Admin Layout
```

---

# 4. Why RPC Initialization Exists

The purpose of this RPC is to avoid multiple database queries.

Instead of:

```
Query school
Query screens
Query components
```

Everything is returned in one response.

---

# 5. Admin Startup Data

Admin panel must store:

```
schoolkey
templatescreens
templatecomponents
```

These values drive the entire admin UI.
