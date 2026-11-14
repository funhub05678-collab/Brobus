# Security Specification & Payload-First TDD

## 1. Data Invariants
1. **Restricted User Allowlist**: Only authenticated Firebase users matching `admin@ledgerflow.local` (role: `admin`) or `niraj@ledgerflow.local` (role: `user`) may create their `/users/{userId}` profile; only `admin@ledgerflow.local` may create `/admins/{adminId}`.
2. **Self-Role Escalation Ban**: Users cannot modify their own `role` or `username` on `/users/{userId}`, nor can `niraj` create an `/admins/{adminId}` document.
3. **Immutable Audit Ownership**: `createdByUid`, `createdByUsername`, `workspaceId`, and `createdAt` on `/transactions/{id}` and `/inventory/{id}` are strictly immutable after creation.
4. **Temporal Integrity**: All `createdAt` and `updatedAt` timestamps must equal `request.time`.
5. **Budget Allocation Sum Invariant**: `advertisingPct + brandingPct + reinvestmentPct + savingsPct` in `/budget_config/{configId}` must strictly equal `100`, with each field between `0` and `100`.
6. **Strict Schema Enforcement**: Every write requires exact allowlisted keys (`hasAll` + `hasOnly` on create, `affectedKeys().hasOnly(...)` on update) and explicit string `.size()` bounds.
7. **Inventory Non-Negativity**: `totalStockLevel`, `stockRemaining`, `reorderLevel`, `unitCost`, and `unitPrice` must be numbers `>= 0`.
8. **Admin-Only Destructive Operations**: Deleting transactions, deleting inventory items, and updating global budget allocation percentages are restricted to `isAdmin()`.

## 2. Dirty Dozen Payloads (Must Return PERMISSION_DENIED)
1. **Unauthenticated Read**: `GET /transactions/tx-1` with `auth = null` -> DENIED.
2. **Shadow Field Injection on Transaction Create**: `{ ..., isApproved: true }` -> DENIED by `hasOnly`.
3. **Role Self-Escalation on User Create**: `niraj` tries `POST /users/{uid}` with `role: "admin"` -> DENIED.
4. **Admin Marker Spoofing**: `niraj` tries `POST /admins/{uid}` -> DENIED.
5. **Identity Spoofing on Transaction Create**: `niraj` sets `createdByUid` to `admin`'s UID -> DENIED (`createdByUid == request.auth.uid`).
6. **Timestamp Forgery**: Client sends `createdAt: Timestamp(2020-01-01)` instead of `serverTimestamp()` -> DENIED (`createdAt == request.time`).
7. **Resource Exhaustion / ID Poisoning**: Creating `/transactions/{1500_char_id}` -> DENIED by `isValidId()`.
8. **Budget Allocation Sum Tampering**: Updating `advertisingPct: 90, brandingPct: 50, reinvestmentPct: 50, savingsPct: 35` (sum 225) -> DENIED.
9. **Unauthorized Transaction Deletion**: `niraj` attempts `DELETE /transactions/tx-1` -> DENIED (`isAdmin()` required).
10. **Unauthorized Budget Config Update**: `niraj` attempts `UPDATE /budget_config/default` -> DENIED (`isAdmin()` required).
11. **Negative Stock / Amount Poisoning**: Creating transaction with `amount: -500` or inventory with `stockRemaining: -10` -> DENIED.
12. **PII Cross-User Read**: `niraj` attempts `GET /users/{adminUid}` -> DENIED (owner or admin only).
