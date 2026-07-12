---
name: OpenAPI nullable object generates invalid Zod
description: Using type ["object","null"] in OpenAPI 3.1 generates zod.looseObject which doesn't exist in Zod v3.
---

## Rule
`type: ["object","null"]` in an OpenAPI 3.1 schema generates `zod.looseObject(...)` in Orval's Zod output. `zod.looseObject` does not exist in Zod v3.

**Why:** Zod v3 uses `z.object()` not `z.looseObject()`. Orval 8.x maps the nullable object union to `looseObject` which breaks at compile time.

**How to apply:** Only use scalar nullable types in OpenAPI schemas: `type: ["string","null"]`, `type: ["integer","null"]`, etc. If you need to return a nullable object, return only the object's scalar ID field as nullable instead (e.g., `cartItemId: integer|null` instead of `cartItem: object|null`).
