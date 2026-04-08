# Dashboard Component Configuration & Complex Filtering Deep-Dive

This document is the **Mandatory Implementation Reference** for the AI assistant (Antigravity). When building dashboard editors, you must consult this guide to ensure 100% architectural compliance with the Eddesk Component System.

---

## 1. Variable Reference

### `group` (string)
The `group` variable is used to link disparate component registry entries into a single functional unit in the UI. 
- **Example**: If `Hero (Image)` and `Hero (Video)` both have `group: "hero"`, the sidebar will treat them as a single "Hero Section" entry.
- **AI Action**: Always check if a component is part of a group. If it is, the editor might need to support "variant toggling" (switching between image and video).

### `groupmode` (`exclusive` | `merged`)
Determines how components within the same `group` interact.
- **`exclusive` (Default)**: Only ONE component from the group can be active at a time for a given screen. Enabling one disables the others. Used for type-toggles (e.g., Image vs Video).
- **`merged`**: All components in the group are displayed together as a single list.
- **AI Action**: If `groupmode` is `exclusive`, ensure the editor provides a way to switch between components in the group.

### `selectionmethod` (`auto` | `manual`)
Defines how the component retrieves its content.
- **`auto`**: The component fetches data directly from its `datasource` table, applying `filters` and limiting by `itemcount`. No slotting logic is needed.
- **`manual`**: The component uses "slots". Data is pulled via the `componentplacement` table, which links a specific `template_component` to specific `content_keys`.
- **AI Action**: For `manual` mode, you **must** implement a "Selector Dialog" that allows users to pick which records from the source table occupy which slots.

---

## 2. Operator Deep Dive

Each operator handles both **Server-Side (Supabase)** and **Client-Side (Local State)** logic.

### `equals`
- **JSON**: `{ "field": "category", "operator": "equals", "value": "sports" }`
- **Behavior**: Exact match. Case-sensitive in JS, usually case-sensitive in Postgres unless using `citext`.
- **Initialization**: Records created via `handleAddNew` **must** inherit this value.

### `notequals`
- **JSON**: `{ "field": "designation", "operator": "notequals", "value": "Principal" }`
- **Behavior**: Excludes specific records.
- **AI Action**: Ensure "Principal" records are never shown in lists using this filter.

### `contains`
- **JSON**: `{ "field": "name", "operator": "contains", "value": "John" }`
- **Behavior**: 
    - **SQL**: `column ilike '%John%'`
    - **JS**: `item.name.toLowerCase().includes('john')`
- **Use Case**: Search bars or keyword-based collections.

### `startswith` / `endswith`
- **JSON**: `{ "field": "code", "operator": "startswith", "value": "ACAD_" }`
- **Behavior**:
    - **SQL**: `column like 'ACAD_%'`
    - **JS**: `item.code.startsWith('ACAD_')`

### `in`
- **JSON**: `{ "field": "status", "operator": "in", "value": ["live", "draft"] }`
- **Behavior**:
    - **SQL**: `column.in(['live', 'draft'])`
    - **JS**: `['live', 'draft'].includes(item.status)`
- **AI Action**: This value **must** be an array.

---

## 3. Mandatory Implementation Procedure

When asked to "Create/Update a Component Editor", follow this exact sequence:

### Phase 1: Context Gathering
1.  **Read Registry**: Identify `tablename` and `config` from the `componentregistry` table.
2.  **Verify Schema**: Check the database for the columns mentioned in `config.filters`.
3.  **Check Screen Context**: Identify the `screenslug` (e.g., "home", "about-us").

### Phase 2: Data Implementation
1.  **Initialize Hook**: Call `useComponentData` within the editor component.
    ```typescript
    const { records, saveRecord, removeRecord } = useComponentData({
        tableName: config.datasource || registry.tablename,
        schoolKey,
        filters: config.filters
    });
    ```
2.  **Extract Initial Values**: Use the shared utility to prepare for record creation.
    ```typescript
    const initialValues = getInitialValuesFromFilters(config.filters);
    ```

### Phase 3: CRUD UI Logic
1.  **Add New Record**:
    ```typescript
    const handleAddNew = () => {
        setEditingItem({
            key: crypto.randomUUID(),
            schoolkey: schoolKey,
            ...initialValues, // CRITICAL: Ensures record matches filters
            ...otherDefaults
        });
    };
    ```
2.  **Handle Manual Slots**: If `selectionmethod === 'manual'`, iterate through `itemcount` and map `componentplacement` keys to records found in the `records` array.

### Phase 4: UI Refinement
1.  **BaseEditor**: Wrap the content in `<BaseEditor>` to ensure consistent header, actions, and layout.
2.  **Skeleton States**: Provide visual feedback for empty slots in `manual` mode.

---

## 4. Troubleshooting Filter Mismatches

If a user reports that "New records are not appearing", check the following:
1.  Is `getInitialValuesFromFilters` being called?
2.  Does the `FilterConfig` have a field that is NOT present in the database table?
3.  Is there a case-sensitivity mismatch between the filter `value` and the database content?

> [!CAUTION]
> **Never** hardcode filter logic (e.g., `records.filter(r => r.category === 'board')`) inside the editor. Always pass the filter to `useComponentData` so the logic remains centralized and synced with the database.
