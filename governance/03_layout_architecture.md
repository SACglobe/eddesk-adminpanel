# Admin Panel Layout Architecture

The EdDesk admin panel uses a **three-column interface**.

```
---------------------------------------------------------
| NavigationRail | Component Panel | Component Editor |
---------------------------------------------------------
```

---

# 1. NavigationRail

Displays available screens.

Example:

| Screen    |
| --------- |
| Home      |
| About     |
| Gallery   |
| Events    |
| Admission |
| Contact   |

Screens are retrieved from:

```
templatescreens
```

Sorted using:

```
displayorder
```

---

# 2. Component Panel

Displays components belonging to the selected screen.

Example:

Home screen components:

| Component |
| --------- |
| hero      |
| broadcast |
| faculty   |
| gallery   |
| events    |

Data source:

```
templatecomponents
```

---

# 3. Component Editor

Displays the editor interface for a selected component.

Example:

Hero Editor
Faculty Editor
Gallery Editor

Each component has a dedicated editor UI.

---

# 4. Layout Interaction Flow

```
Select Screen
   ↓
Load Components
   ↓
Select Component
   ↓
Load Editor
```

---

# 5. Layout Goal

The layout ensures:

* predictable navigation
* easy content editing
* consistent admin experience
