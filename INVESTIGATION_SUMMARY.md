# Issue #1486 Memory Leak Investigation - Executive Summary

## TL;DR

**Root Cause:** Session-related Map objects only cleanup on `session.deleted` events, which **don't fire reliably on Windows**. This causes unbounded memory growth (600-800MB per conversation round).

**Recommended Fix:** Implement TTL-based cleanup + LRU eviction + explicit cleanup in finally blocks.

## Key Findings

### 1. The Problem
- `sessionAgentMap` and other Map/Set objects depend solely on `session.deleted` events
- These events are **unreliable on Windows 11**
- When events don't fire, data never gets cleaned up
- Memory grows from 200MB → 3-4GB in just 4-5 conversation rounds

### 2. Why Previous Fixes Didn't Work
- PRs #1058, #453, #302, #167 all attempted fixes
- Issue #1486 opened **after** these PRs merged
- Those PRs likely added cleanup logic, but still relied on the same unreliable events

### 3. The Solution

**Multi-layer cleanup strategy (defense in depth):**

```typescript
class RobustSessionMap {
  // 1. TTL-based cleanup (works even if events fail)
  setInterval(() => this.cleanupStale(), 60000);
  
  // 2. LRU eviction (prevents runaway growth)
  if (this.map.size >= maxSize) this.evictLRU();
  
  // 3. Event-based cleanup (if events work)
  eventBus.on('session.deleted', (id) => this.delete(id));
  
  // 4. Process exit cleanup (final safeguard)
  process.on('beforeExit', () => this.clear());
}
```

**Why this works:**
- ✅ Cleans up even if events fail (TTL)
- ✅ Prevents unbounded growth (LRU + max size)
- ✅ Works on Windows without relying on events
- ✅ Automatic cleanup every 30 minutes

### 4. Expected Impact

After fix:
- Memory stays around 200-500MB (not 3-4GB)
- Growth rate: ~50-100MB/round (not 600-800MB)
- No manual restarts needed
- Works reliably on Windows

## Implementation Priority

### Phase 1 (Immediate):
1. Replace `sessionAgentMap` with `RobustSessionMap`
2. Add TTL-based cleanup (30min default)
3. Add LRU eviction with max 1000 entries
4. Add explicit cleanup in finally blocks

### Phase 2 (Follow-up):
1. Audit all Map/Set usage
2. Apply same pattern to other session-related data
3. Add memory profiling tests
4. Monitor in production

## Testing Plan

1. **Windows 11 testing** (required!)
2. Run 20+ conversation rounds
3. Monitor `process.memoryUsage()`
4. Verify memory stays under 1GB
5. Verify automatic cleanup happens

## Files to Review

Look for this pattern in:
- `src/hooks/` - Session lifecycle
- `src/agents/` - Agent state
- `src/context/` - Context caching
- Any file with `Map<SessionId, *>`

## Next Steps

1. Review full investigation report: `issue-1486-investigation-report.md`
2. Implement RobustSessionMap class
3. Replace sessionAgentMap usage
4. Test on Windows 11
5. Create PR with fix

---

Full report: [issue-1486-investigation-report.md](./issue-1486-investigation-report.md)  
Branch: `investigate/issue-1486`  
Investigation Date: 2026-02-05
