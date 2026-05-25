# Security Specification: Product Management & Ad Placements

## 1. Data Invariants
- **Public Read Access**: Anonymous and authenticated users can view/read all products and ad placements. No login required for retrieval (`get` or `list`).
- **No Client RBAC Escalation**: Regular users cannot write, modify, or delete any products or ads.
- **Admin Authorizations**: Only the designated admin (bootstrapped with email `ma6922249@gmail.com` with `email_verified == true`) is allowed to edit database records (create, update, delete).
- **Format Hardening**:
  - Every ID used must match alphanumeric format.
  - Prices must be >= 0.
  - Image URLs and link targets must be non-empty strings under reasonable length restrictions.

---

## 2. The "Dirty Dozen" Payloads (Threat Matrix)

### Payload 1: Anonymous Create Product (Identity Bypass)
Attempting to post a brand new product to `/products` without login.
- **Method**: `create`
- **Path**: `/products/hack_prod`
- **Payload**: `{ "title": "Free Item", "description": "Steal", "price": 0, "category": "Free", "imageUrl": "http://evil.com/pic.jpg", "createdAt": "request.time" }`
- **Actor**: `anonymous` (unauthenticated)
- **Constraint**: Must return `PERMISSION_DENIED`.

### Payload 2: Authenticated Non-Admin Create Advertisement (Privilege Escalation)
Attempting to create an ad from a non-admin account (e.g. user `visitor123` with verified email `guest@gmail.com`).
- **Method**: `create`
- **Path**: `/ads/header`
- **Payload**: `{ "slot": "header", "imageUrl": "http://evil.com/ad.png", "targetUrl": "http://scam.org", "title": "Buy", "createdAt": "request.time", "updatedAt": "request.time" }`
- **Actor**: uid: `visitor123`, email: `guest@gmail.com` (verified is true/false)
- **Constraint**: Must return `PERMISSION_DENIED`.

### Payload 3: Spoofed Admin Create (Unverified Email Attack)
An attacker registers an account with email `ma6922249@gmail.com` on a standard login, but the email is NOT verified.
- **Method**: `create`
- **Path**: `/products/unverified_hack`
- **Payload**: `{ "title": "Fake Brand", "description": "Fake", "price": 99, "category": "Fake", "imageUrl": "http://pic.png" }`
- **Actor**: uid: `attacker`, email: `ma6922249@gmail.com`, `email_verified: false`
- **Constraint**: Must return `PERMISSION_DENIED`.

### Payload 4: Price Corruption (Value Poisoning)
An authenticated admin tries to submit a negative price or a boolean value for price.
- **Method**: `create`
- **Path**: `/products/bad_price_prod`
- **Payload**: `{ "title": "Broken Item", "description": "Bad", "price": -50.5, "category": "Invalid", "imageUrl": "http://pic.jpg" }`
- **Actor**: uid: `admin_uid`, email: `ma6922249@gmail.com`, `email_verified: true`
- **Constraint**: Must return `PERMISSION_DENIED`.

### Payload 5: Unknown Field Injection (Shadow Update)
Attempting to inject a non-existent parameter `shadowAdmin: true` or `discount: 90` into the product doc to compromise UI or security variables.
- **Method**: `create` / `update`
- **Path**: `/products/prod_1`
- **Payload**: `{ "title": "A Product", "description": "B", "price": 10, "category": "C", "imageUrl": "http://pic.jpg", "shadowAdmin": true }`
- **Actor**: uid: `admin_uid`, email: `ma6922249@gmail.com`, `email_verified: true`
- **Constraint**: Must return `PERMISSION_DENIED`.

### Payload 6: Field Type Mismatch (Resource Injection)
A malicious actor tries to insert an array instead of a string for a text field to crash parsing loops.
- **Method**: `create`
- **Path**: `/products/wrong_type`
- **Payload**: `{ "title": ["Subversive Array", "Text"], "description": "B", "price": 10, "category": "C", "imageUrl": "http://pic.jpg" }`
- **Actor**: uid: `admin_uid`, email: `ma6922249@gmail.com`, `email_verified: true`
- **Constraint**: Must return `PERMISSION_DENIED`.

### Payload 7: Over-sized Text Bomb (Denial of Wallet)
Admin (or someone attempting client bypass) uploads a 2MB base64 image representation directly inside the `title` field instead of a URL.
- **Method**: `create`
- **Path**: `/products/text_bomb`
- **Payload**: `{ "title": "VERY_LONG_STRING_OVER_2KB...", "description": "Safe desc", "price": 5, "category": "G", "imageUrl": "http://pic.jpg" }`
- **Actor**: uid: `admin_uid`, email: `ma6922249@gmail.com`, `email_verified: true`
- **Constraint**: Must return `PERMISSION_DENIED` since `title.size() <= 128` constraint is violated.

### Payload 8: Immutable Field Tampering (Temporal Hijack)
An admin attempts to alter the `createdAt` timestamp of a product during update to bypass sorting order.
- **Method**: `update`
- **Path**: `/products/prod_1`
- **Payload**: `{ "title": "Updated", "description": "New", "price": 10, "category": "Books", "imageUrl": "http://pic.jpg", "createdAt": "request.time", "updatedAt": "request.time" }` (where existing `createdAt` was different)
- **Actor**: uid: `admin_uid`, email: `ma6922249@gmail.com`, `email_verified: true`
- **Constraint**: Must return `PERMISSION_DENIED` if `incoming().createdAt != existing().createdAt`.

### Payload 9: Client-Side Timestamp Bypassing (Temporal Integrity Failure)
Uploading custom client timestamps for `updatedAt` far in the future rather than using the correct server `request.time` marker.
- **Method**: `update`
- **Path**: `/products/prod_1`
- **Payload**: `{ "title": "Normal Product", "description": "B", "price": 10, "category": "C", "imageUrl": "http://pic.jpg", "updatedAt": "9999-12-31" }`
- **Actor**: uid: `admin_uid`, email: `ma6922249@gmail.com`, `email_verified: true`
- **Constraint**: Must return `PERMISSION_DENIED` since `updatedAt` must be strictly set to `request.time`.

### Payload 10: Ad Slot Bypass (Schema Violation)
An attacker attempts to set an ad slot with an unsupported string value, e.g., `slot": "pop-under"`.
- **Method**: `create`
- **Path**: `/ads/evil_slot`
- **Payload**: `{ "slot": "pop-under", "imageUrl": "http://ad.png", "targetUrl": "http://ad.com", "title": "Buy now", "createdAt": "request.time", "updatedAt": "request.time" }`
- **Actor**: uid: `admin_uid`, email: `ma6922249@gmail.com`, `email_verified: true`
- **Constraint**: Must return `PERMISSION_DENIED`.

### Payload 11: Bulk Read Poison (Secure Query Bypass)
A list query targeting `/products` or `/ads` or checking a secret path is executed under anonymous session rules expecting direct access override.
- **Method**: `list`
- **Path**: `/products`
- **Actor**: anonymous
- **Constraint**: Allowed, since product listing is public.

### Payload 12: Direct ID Poisoning
An attacker injects junk characters in the document ID path to pollute document names (e.g., `<script>alert(1)</script>`).
- **Method**: `create`
- **Path**: `/products/script_injection_id`
- **Actor**: uid: `admin_uid`, email: `ma6922249@gmail.com`, `email_verified: true`
- **Constraint**: Must return `PERMISSION_DENIED` since path IDs must match `'^[a-zA-Z0-9_\\-]+$'` regex.

---

## 3. Test Runner Schema (Mock Proof)
The above invariant checks can be evaluated against the rules via the Firestore local emulator using standard test scripts verifying:
- **Write security** (denied to everyone unless auth email is exactly `ma6922249@gmail.com` AND `email_verified` is `true`).
- **Type verification** (rejects any write not conforming to schema keys, types, sizes, and timestamps).
