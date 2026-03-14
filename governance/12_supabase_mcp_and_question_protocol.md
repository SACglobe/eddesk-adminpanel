# Supabase MCP & Question Protocol

This document defines how Antigravity must interact with the Supabase database using **Model Context Protocol (MCP)**.

The purpose of this protocol is to ensure that:

• database schema is always synchronized
• Antigravity never invents schema details
• developer confirmation is required for uncertain situations
• the database remains the source of truth

---

# 1. Supabase MCP Integration

Supabase is connected to Antigravity as an **MCP (Model Context Protocol) source**.

This allows Antigravity to access live database information.

Examples of information retrieved through MCP:

| Data Retrieved  | Description                |
| --------------- | -------------------------- |
| database tables | list of tables in database |
| columns         | table column names         |
| data types      | column types               |
| relationships   | foreign key relations      |
| enums           | allowed values             |

Antigravity must use MCP to obtain schema information before generating queries.

---

# 2. Database Schema Contract

The database schema is the **single source of truth**.

Antigravity must never invent:

• table names
• column names
• relationships
• enum values
• foreign keys

All schema information must be retrieved from Supabase MCP.

Example incorrect behavior:

Assuming a column exists.

Example:

```id="n0g9zv"
faculty table contains email column
```

Correct behavior:

Use MCP to verify:

```id="p0h1r3"
read schema → faculty table
```

Then confirm fields returned by MCP.

---

# 3. MCP Schema Synchronization

Before generating code that interacts with the database, Antigravity must perform a schema check using MCP.

Example process:

```id="5l66i2"
Developer Request
      ↓
Antigravity reads MCP schema
      ↓
Verify tables and columns
      ↓
Generate database queries
```

This ensures the generated code always matches the real database.

---

# 4. Example MCP Verification Flow

Example request:

Developer asks:

> "Create a Faculty editor"

Antigravity must perform the following steps:

Step 1 — read schema from MCP
Step 2 — locate faculty table
Step 3 — list columns
Step 4 — confirm tenant column exists

Example discovered schema:

| Column        |
| ------------- |
| key           |
| schoolkey     |
| name          |
| designation   |
| qualification |
| description   |
| imageurl      |

Only after verifying the schema may Antigravity generate queries.

---

# 5. Question Protocol

If MCP results do not provide enough information, Antigravity must ask questions.

Example:

MCP shows table:

```id="m95qij"
gallery
```

But does not clarify if ordering exists.

Correct behavior:

Ask developer:

"Does the gallery table support displayorder sorting?"

Antigravity must wait for the answer before generating code.

---

# 6. Mandatory Question Tracking

If Antigravity asks multiple questions, it must track them until answered.

Example:

Question 1 — Should gallery support ordering?
Question 2 — Should gallery support video media?
Question 3 — Should gallery images allow captions?

If developer answers only Question 1, Antigravity must ask again for Questions 2 and 3.

Questions must **never be silently dropped**.

---

# 7. Clarification Handling

If the developer asks a clarification instead of answering a question:

Example:

Antigravity asks:

Question 1
Question 2
Question 3

Developer responds:

"I need clarification for Question 2."

Antigravity must:

1. Answer the clarification
2. Ask Question 2 again
3. Ask Question 3 again

---

# 8. Confirmation Before Code Generation

Before generating code Antigravity must confirm its understanding.

Example confirmation:

"My understanding is:

• faculty editor will use faculty table
• filtering will use schoolkey
• fields include name, designation, qualification

Please confirm before I generate code."

Only after confirmation may implementation begin.

---

# 9. Safety Rule

Antigravity must prioritize **schema accuracy over development speed**.

If MCP information is unclear:

Stop development and ask the developer.

Never guess schema.

---

# 10. Goal of MCP Protocol

This protocol ensures:

• database schema accuracy
• safe AI development
• prevention of schema hallucination
• developer controlled decisions

Antigravity must strictly follow this protocol when interacting with Supabase.


# 11. MCP Read-Only Policy

Supabase MCP is connected to the EdDesk project **only for schema discovery and verification**.

Antigravity is strictly **forbidden from modifying the database through MCP**.

Forbidden MCP actions include:

| Forbidden Action | Example            |
| ---------------- | ------------------ |
| Create tables    | creating new table |
| Modify schema    | adding columns     |
| Delete tables    | dropping tables    |
| Modify data      | inserting rows     |
| Delete data      | deleting rows      |

Antigravity must treat MCP as **read-only**.

Example incorrect behavior:

```id="badmcp1"
create table students (...)
```

Example correct behavior:

```id="goodmcp1"
read schema → students table
```

Antigravity must **never execute database write operations through MCP**.

---

# 12. Local Schema Synchronization

The project contains a **local representation of the database schema**.

Example location:

```id="schemalocation"
/types/database.types.ts
```

This file represents the database schema used by the codebase.

---

# 13. Schema Drift Detection

A schema drift occurs when the **live database schema differs from the local project schema**.

Example:

Database schema (via MCP):

| Column      |
| ----------- |
| key         |
| schoolkey   |
| name        |
| designation |
| email       |

Local schema file:

| Column      |
| ----------- |
| key         |
| schoolkey   |
| name        |
| designation |

Difference detected:

```id="schemadiff"
email column exists in database but not in local schema
```

This situation is called **schema drift**.

---

# 14. Schema Drift Handling Protocol

When schema drift is detected Antigravity must follow this process.

```id="driftflow"
Read MCP Schema
      ↓
Compare With Local Schema
      ↓
Detect Differences
      ↓
Report Differences
      ↓
Ask Developer Permission
      ↓
Update Local Schema
```

Antigravity must never automatically update local schema files.

---

# 15. Developer Notification Example

If a schema difference is detected Antigravity must notify the developer.

Example message:

"I detected a schema difference.

Database schema contains column:

email

Local schema file does not include this column.

Do you want me to update the local schema definition?"

Antigravity must wait for confirmation before making changes.

---

# 16. Local Schema Update Rules

If the developer approves the update, Antigravity may modify local schema files.

Example file:

```id="localschema"
/types/database.types.ts
```

Allowed actions after approval:

• update TypeScript types
• regenerate schema definitions
• update type mappings

But Antigravity must **never modify the live database**.

---

# 17. Database Safety Principle

The database is the **most critical system component**.

Therefore:

| Rule                           | Explanation               |
| ------------------------------ | ------------------------- |
| MCP is read-only               | database safety           |
| schema drift requires approval | developer control         |
| AI must never modify DB        | prevent accidental damage |

Antigravity must always treat the database as a **protected system**.

---

# 18. MCP Protocol Goal

This protocol ensures:

• safe database integration
• schema synchronization with developer approval
• prevention of destructive database operations
• reliable schema alignment between code and database

Antigravity must strictly follow these MCP rules.

