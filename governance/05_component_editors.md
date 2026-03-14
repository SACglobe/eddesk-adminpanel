# Component Editors

Each component requires a dedicated editor UI.

Editors are implemented in the codebase.

Editors are **not stored in the database**.

---

# 1. Editor Mapping

Example mapping:

| Component | Editor        |
| --------- | ------------- |
| hero      | HeroEditor    |
| faculty   | FacultyEditor |
| gallery   | GalleryEditor |

---

# 2. Editor File Location

```
/components/editors
```

Example:

```
HeroEditor.tsx
FacultyEditor.tsx
GalleryEditor.tsx
```

---

# 3. Example Mapping Code

```ts
const componentEditors={
 hero:HeroEditor,
 faculty:FacultyEditor,
 gallery:GalleryEditor
}
```

---

# 4. Editor Responsibilities

Editors allow administrators to:

* create content
* update content
* delete content
* reorder content

---

# 5. Editor Goal

Editors provide a consistent interface for managing component data.
