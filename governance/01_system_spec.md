# EdDesk System Specification

## 1. Introduction

EdDesk is a **multi-tenant School Website CMS platform**.

The platform allows multiple schools to manage and publish their websites using predefined templates.

Each school operates as an independent tenant in the system.

Tenant = School

Example:

| School              | Tenant ID |
| ------------------- | --------- |
| ABC Public School   | school_1  |
| Green Valley School | school_2  |
| St Mary's School    | school_3  |

Each tenant can manage its own:

* website pages
* media
* faculty
* events
* announcements
* content sections

All tenant data is isolated using the column:

```
schoolkey
```

---

# 2. Core Platform Model

The system follows a **template driven content architecture**.

Structure hierarchy:

```
Template
   ↓
Template Screens (Pages)
   ↓
Template Components
   ↓
Component Registry
   ↓
Content Tables
```

Example:

```
Template: Classic

Page: Home
   ↓
Components
   hero
   broadcast
   leadership
   gallery
```

Each component loads content from a specific database table.

---

# 3. Template Structure Tables

These tables define **website structure**.

Admin panel must **never modify them**.

| Table              | Purpose                      |
| ------------------ | ---------------------------- |
| templates          | list of website templates    |
| templatescreens    | pages inside templates       |
| templatecomponents | components assigned to pages |
| componentregistry  | component → table mapping    |

Example:

templatescreens

| screenslug | route    |
| ---------- | -------- |
| home       | /        |
| about      | /about   |
| gallery    | /gallery |

---

# 4. Content Tables

Content tables store **tenant editable data**.

Example content tables:

| Table       | Purpose             |
| ----------- | ------------------- |
| herocontent | hero banners        |
| faculty     | teacher profiles    |
| gallery     | media items         |
| events      | school events       |
| leadership  | leadership messages |

Example schema:

```
faculty
--------
key
schoolkey
name
designation
qualification
description
imageurl
displayorder
```

---

# 5. Admin Panel Responsibility

The admin panel allows schools to manage content.

Admin panel features:

* edit hero banners
* manage faculty
* manage events
* upload gallery images
* edit contact information

Admin panel **only modifies content tables**.

---

# 6. Frontend Page Loading

Frontend pages load using a Supabase RPC.

Example RPC:

```
get_screen_data(domain, screen_slug, template_slug)
```

Flow:

```
Domain
   ↓
Resolve School
   ↓
Resolve Template
   ↓
Resolve Screen
   ↓
Resolve Components
   ↓
Fetch Content
   ↓
Return JSON
```

---

# 7. System Goal

EdDesk aims to provide:

* scalable multi-tenant architecture
* predictable template driven content
* secure tenant isolation
* maintainable code structure
