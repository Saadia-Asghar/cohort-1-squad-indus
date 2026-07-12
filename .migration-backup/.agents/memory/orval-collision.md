---
name: Orval TS2308 collision fix
description: When Orval generates hooks for routes that have BOTH path params and query params, it creates duplicate Get*Params types causing TS2308.
---

## Rule
Operations with BOTH path params AND query params generate a `Get*Params` type in both `api.ts` and `types/`, causing TS2308 (duplicate identifier).

**Why:** Orval creates `Get{OperationId}Params` for path params AND for query params when both exist on the same operation. The type names collide.

**How to apply:** When defining OpenAPI operations that need both path params and query params, convert one of the "logically optional" query params to a path param. For example:
- `/analytics/baker/{bakerId}/{period}` (period was originally a query param)
- `/chat/{bakerId}/history/{buyerId}` (buyerId was originally a query param)
