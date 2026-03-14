# Editor Interface Standard

All editors must follow a consistent interface.

---

# 1. Required Props

Editors must accept:

```
schoolKey
screenSlug
componentCode
```

---

# 2. Example Editor Structure

```tsx
function HeroEditor({schoolKey,screenSlug}){
 const [data,setData]=useState([])
}
```

---

# 3. Editor Layout

```
Header
 ↓
Content List
 ↓
Edit Form
 ↓
Actions
```
