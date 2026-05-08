# Security Spec: Trading App

## 1. Data Invariants
- A `UserAccount` must match `request.auth.uid`.
- A user can only set `planType` to valid enums. Only an admin can set `planType` to `subscription` bypassing normal flows, but for now we'll allow users to "purchase" it via an action. We will assume the system handles the purchase.
- `DataListing` must trace its `sellerId` to the current user's UID when creating it.
- Updates to `DataListing` can only affect specific fields (e.g. `status`, `price`).

## 2. The "Dirty Dozen" Payloads
1. **Shadow Update Test**: User updates `gasBalance` without an action allowing it.
2. **Shadow Field Injection**: User adds `isAdmin: true` to their user account.
3. **ID Poisoning Guard**: User creates a listing with a 1MB string for `title`.
4. **Spoof Attack**: User creates a listing with `sellerId` of someone else.
5. **Value Poisoning**: Updating `price` to a string instead of number.
6. **State Shortcutting**: Updating `createdAt` timestamp.
7. **Size Attack**: Sending a `description` that is 50,000 characters long.
8. **Invalid Schema**: Creating a UserAccount missing `planType`.
9. **Unverified Reader**: User tries to list marketplace entries while unauthenticated.
10. **False Identity**: User creates account where document ID does not match auth UID.
11. **Spoofed Timestamps**: User sends a future `updatedAt` instead of `request.time`.
12. **Role Injection**: Attempting to set an undefined field on `UserAccount`.
