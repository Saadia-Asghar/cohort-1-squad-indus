---
name: Orders API field naming
description: API returns camelCase; frontend pages use snake_case from the original Base44 schema. The ordersApi.js shim handles normalization.
---

# Orders API field naming convention

The database/API layer uses camelCase (Drizzle ORM convention). The migrated frontend pages use snake_case (original Base44 convention). These must be bridged.

**How to apply:** Any new frontend code that reads order data should use snake_case field names (e.g. `order.customer_name`, `order.delivery_date`). Any data sent TO the API (create/update) must use camelCase (e.g. `customerName`, `deliveryDate`).

**Where the bridge lives:** `artifacts/bakery-app/src/api/ordersApi.js` — the `toSnake()` function converts API responses; create/update methods manually map snake_case form fields to camelCase before sending.

**Why:** The original Base44 app stored and returned snake_case. All 6+ page components and several sub-components reference `order.customer_name`, `order.cake_type`, etc. Rewriting all field references would be higher risk than normalizing at the API boundary.
