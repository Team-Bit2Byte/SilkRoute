# SilkRoute - Remaining Improvements

This document tracks the identified issues that were NOT fixed in the critical fixes round. These are lower priority but should be addressed in future iterations.

## High Priority (Not Blocking)

### 1. CSRF Protection
**Status**: Not implemented (csurf package is deprecated)

**Issue**: No CSRF protection for state-changing operations

**Solution Options**:
- Implement double-submit cookie pattern
- Use `@fastify/csrf-protection` (requires migration to Fastify)
- Implement custom CSRF middleware with SameSite cookies

**Effort**: 2-4 hours

---

### 2. Complete authorizeResourceOwner Middleware
**File**: `backend/src/middleware/auth.js:169-203`

**Issue**: Middleware exists but has TODO comment, no actual permission checks

**Current Code**:
```javascript
// TODO: Add actual resource ownership check
```

**What's Needed**:
- Verify user owns the resource being accessed
- Check product ownership for sellers
- Check order ownership for buyers
- Return 403 Forbidden if not authorized

**Effort**: 2-3 hours

---

### 3. Cursor-based Pagination for Messages
**File**: `backend/src/socket/socketHandlers.js:247-256`

**Issue**: Uses offset/limit pagination which is inefficient for large datasets

**Current**:
```javascript
LIMIT 50 OFFSET ${offset}
```

**Proposed**:
```javascript
WHERE created_at < ? ORDER BY created_at DESC LIMIT 50
```

**Benefits**:
- Consistent results during concurrent inserts
- Better performance on large tables
- Eliminates offset scan cost

**Effort**: 3-4 hours

---

## Medium Priority

### 4. Frontend Re-render Optimization
**File**: `frontend/src/contexts/AuthContext.tsx:26-41`

**Issue**: Reads localStorage on every render without memoization

**Solution**:
```typescript
const user = useMemo(() => {
  const stored = localStorage.getItem('user');
  return stored ? JSON.parse(stored) : null;
}, []);
```

**Effort**: 1-2 hours

---

### 5. Socket Room Membership Verification
**File**: `backend/src/socket/socketHandlers.js:156`

**Issue**: `io.to(roomId).emit()` broadcasts without verifying room membership

**Current Risk**: Users could theoretically listen to rooms they haven't joined

**Solution**:
- Maintain server-side room membership map
- Verify user in room before broadcast
- Or rely on Socket.IO's built-in room management (already somewhat secure)

**Effort**: 2-3 hours

---

### 6. Proper Socket Error Emission
**File**: `backend/src/socket/socketHandlers.js:159-176`

**Issue**: Database errors logged but not emitted to client

**Current**:
```javascript
} catch (error) {
  logger.error('Failed to store message', error);
  // Client never knows it failed
}
```

**Proposed**:
```javascript
} catch (error) {
  logger.error('Failed to store message', error);
  socket.emit('error', {
    message: 'Failed to send message',
    code: 'MESSAGE_STORE_FAILED'
  });
}
```

**Effort**: 1 hour

---

## Low Priority

### 7. Consolidate Validation Logic
**File**: `backend/src/middleware/validation.js:77-90, 181-197`

**Issue**: Email validation duplicated across validators

**Solution**: Create reusable validation rules

**Effort**: 1-2 hours

---

### 8. Request Body Size Validation
**File**: `backend/src/server.js:83-84`

**Issue**: Sets 10MB limit but doesn't validate actual size

**Solution**: Add middleware to check `req.headers['content-length']`

**Effort**: 1 hour

---

### 9. Database Query Timeouts for SQLite
**Status**: PostgreSQL has timeouts, SQLite doesn't

**Issue**: Long-running SQLite queries could hang indefinitely

**Solution**: Implement timeout wrapper for SQLite queries

**Effort**: 2-3 hours

---

### 10. Refresh Token Implementation
**File**: `backend/src/controllers/authController.js:131-145`

**Issue**: Refresh token endpoint exists but doesn't use refresh tokens

**Current Behavior**: Just generates a new access token from the existing one

**What's Needed**:
- Implement refresh token generation on login
- Store refresh tokens in database or Redis
- Validate refresh tokens before issuing new access tokens
- Implement refresh token rotation

**Effort**: 4-6 hours

---

## Code Quality Improvements

### 11. Remove Mock/Dead Code
**Files**:
- `backend/src/routes/apiRoutes.js:38-65` - Mock products endpoint

**Action**: Either implement or remove

**Effort**: 30 minutes

---

### 12. Add Comprehensive Error Handling
**Various Files**: Many try-catch blocks don't properly handle all error cases

**Action**: Audit error handling and add proper fallbacks

**Effort**: 4-6 hours

---

## Testing & Documentation

### 13. Add Unit Tests
**Status**: No tests exist

**Priority**: High (but time-consuming)

**Coverage Needed**:
- Auth service (login, register, OAuth)
- Token blacklist service
- Database adapters
- Validation middleware
- Socket handlers

**Effort**: 20+ hours

---

### 14. Add Integration Tests
**Coverage Needed**:
- API endpoints
- Socket.IO events
- Database transactions
- Authentication flow

**Effort**: 15+ hours

---

### 15. API Documentation
**Tool**: Swagger/OpenAPI

**Coverage Needed**:
- All REST endpoints
- Request/response schemas
- Authentication requirements
- Error codes

**Effort**: 6-8 hours

---

## Infrastructure

### 16. Database Migrations System
**Status**: Tables created on startup, no versioning

**Need**: Proper migration system (e.g., Knex.js, Sequelize migrations)

**Effort**: 8-10 hours

---

### 17. Monitoring & Alerting
**Tools**: Prometheus, Grafana, Sentry

**Metrics Needed**:
- Request latency
- Error rates
- Database connection pool usage
- Redis hit rates
- Socket.IO connections

**Effort**: 10-15 hours

---

### 18. Rate Limiting by User/IP
**Current**: Global rate limits only

**Need**: Per-user and per-IP rate limiting in Redis

**Effort**: 4-6 hours

---

## Estimated Total Effort
- High Priority: ~12 hours
- Medium Priority: ~10 hours  
- Low Priority: ~12 hours
- Testing: ~35+ hours
- Infrastructure: ~30 hours

**Grand Total**: ~100 hours of development work remaining

## Priority Order Recommendation

1. Complete `authorizeResourceOwner` (security)
2. CSRF protection (security)
3. Socket error emission (UX)
4. Cursor pagination (performance)
5. Frontend optimization (performance)
6. Unit tests (quality)
7. Everything else as time permits
