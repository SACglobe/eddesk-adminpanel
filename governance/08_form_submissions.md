# Form Submissions

User submitted forms are stored in:

```
formsubmissions
```

---

# 1. Example Form Types

| Form Type         |
| ----------------- |
| admission_enquiry |
| contact_request   |
| campus_tour       |

---

# 2. Table Schema

```
formsubmissions
---------------
key
schoolkey
formtype
payload
status
createdat
```

payload contains form data as JSON.

---

# 3. Admin Features

Admins must be able to:

* view submissions
* change submission status
* mark submissions resolved
