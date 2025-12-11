# Scanning Error Fix - License Registration Issue

## Problem

Users were experiencing a "scanning error yang menyebabkan tidak mendapatkan license" (scanning error that prevents obtaining a license) during IP asset registration.

## Root Causes

### Issue 1: Vision Detection Endpoint Response Format Mismatch

**File**: `server/routes/vision-image-detection.ts`

**Problem**:

- The vision-image-detection endpoint was returning `{ ok: true, analysis, fileName }`
- The registration hook (`useIPRegistrationAgent`) was expecting a response with `blocked: true/false` property
- Since the response lacked this property, the check was unreliable

**Solution**:

- Updated the endpoint to return the correct response format: `{ ok: true, blocked: false, ... }`
- Implemented whitelist matching logic to detect if images are similar to registered IPs
- Added proper error handling to allow registration to continue if vision service is unavailable

### Issue 2: Hash Whitelist Check Response Format Mismatch

**File**: `server/routes/remix-hash-whitelist.ts`

**Problem**:

- The hash whitelist endpoint was returning `{ found: true, type: "exact", metadata: {...}, derivativesAllowed }`
- The registration hook was expecting `{ found: true, ipId: "...", title: "..." }`
- The missing `ipId` and `title` properties caused the remix offer flow to fail

**Solution**:

- Updated both the exact match and phash match responses to include `ipId` and `title` at the top level
- Preserved the full `metadata` object for backward compatibility

## Changes Made

### 1. server/routes/vision-image-detection.ts

```typescript
// Now returns proper response format:
{
  ok: true,
  blocked: false,  // ✅ New: returns blocked status
  message?: string,  // ✅ New: returns error message if blocked
  analysis: {...},
  fileName: string
}
```

### 2. server/routes/remix-hash-whitelist.ts

```typescript
// Now returns both top-level properties AND metadata:
{
  found: true,
  type: "exact" | "phash",
  ipId: "0x...",  // ✅ New: added at top level
  title: "...",   // ✅ New: added at top level
  metadata: {...}, // Preserved for backward compatibility
  similarity?: number,
  derivativesAllowed?: boolean
}
```

## Testing the Fix

### To verify vision-image-detection works:

```bash
curl -X POST http://localhost:8080/api/vision-image-detection \
  -F "image=@test.jpg"
```

Expected response:

```json
{
  "ok": true,
  "blocked": false,
  "analysis": {...},
  "fileName": "test.jpg"
}
```

### To verify hash-check works:

```bash
curl -X POST http://localhost:8080/api/check-remix-hash \
  -H "Content-Type: application/json" \
  -d '{"hash":"abc123..."}'
```

Expected response when match found:

```json
{
  "found": true,
  "ipId": "0x...",
  "title": "Asset Title",
  "type": "exact",
  "metadata": {...},
  "derivativesAllowed": true
}
```

## Impact

✅ **Fixed**: License registration scanning errors
✅ **Fixed**: Remix offer detection when identical images are found
✅ **Improved**: Error handling - graceful degradation if vision service is unavailable
✅ **Maintained**: Backward compatibility with existing code using full metadata objects

## Files Modified

1. `server/routes/vision-image-detection.ts` - Added blocked status and whitelist checking
2. `server/routes/remix-hash-whitelist.ts` - Added ipId and title to response objects
