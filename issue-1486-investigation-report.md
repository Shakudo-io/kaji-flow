# Issue #1486 Memory Leak Investigation Report

## Investigation Overview

Date: February 5, 2026  
Issue: #1486 - Critical memory leak in Bun + oh-my-opencode  
Branch: `investigate/issue-1486`

## Background

**Severity:** CRITICAL  
Memory usage grows dramatically from ~200MB to 3-4GB after just 4-5 conversation rounds (~600-800MB per round), making the tool unusable for extended sessions on Windows 11.

## Previous Fix Attempts

The following PRs attempted to address memory leaks but did not fully resolve the issue:
- PR #1058
- PR #453
- PR #302
- PR #167

Issue #1486 was opened on 2026-02-04, **after** all these PRs were merged, indicating the problem persists.

## Key Findings

### 1. **Root Cause: Per-Session Map Objects with session.deleted Dependency**

The investigation identified that several Map and Set objects used for per-session data only perform cleanup when `session.deleted` events fire. This is problematic because:

- **session.deleted events may not fire reliably on Windows**
- When sessions don't clean up properly, all associated data remains in memory
- Multiple conversation rounds accumulate unbounded data structures

### 2. **Specific Problem Areas**

#### `sessionAgentMap` Cleanup Issue
- The `sessionAgentMap` relies solely on `session.deleted` events for cleanup
- If the event doesn't fire (especially on Windows), the Map continues to grow indefinitely
- Each session adds entries that are never removed

#### Other Potential Leak Points

Based on the investigation pattern analysis, other data structures likely affected:
- Session context caches
- Message history buffers
- Agent state maps
- Tool result caches
- Any Map/Set that only clears on session lifecycle events

### 3. **Windows-Specific Reliability Issue**

The `session.deleted` event appears to be **unreliable on Windows**, which explains why:
- The issue is reported specifically on Windows 11
- Memory grows much faster than expected
- Previous cleanup attempts didn't resolve the problem

## Proposed Solutions

### Solution 1: TTL-Based Cleanup (Recommended)

Implement time-to-live (TTL) based cleanup for session-related data structures:

```typescript
class TTLMap<K, V> extends Map<K, V> {
  private timestamps = new Map<K, number>();
  private ttl: number;
  
  constructor(ttl: number = 30 * 60 * 1000) { // 30 minutes default
    super();
    this.ttl = ttl;
    this.startCleanupTimer();
  }
  
  set(key: K, value: V): this {
    super.set(key, value);
    this.timestamps.set(key, Date.now());
    return this;
  }
  
  private startCleanupTimer() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, timestamp] of this.timestamps.entries()) {
        if (now - timestamp > this.ttl) {
          this.delete(key);
          this.timestamps.delete(key);
        }
      }
    }, 60000); // Check every minute
  }
}
```

**Advantages:**
- Works regardless of event reliability
- Automatic cleanup even if events fail
- Configurable TTL per use case
- Minimal performance impact

### Solution 2: WeakMap for Garbage-Collectable References

For objects that can be garbage collected when no longer referenced:

```typescript
// Replace: Map<SessionId, AgentData>
// With: WeakMap<Session, AgentData>

const sessionAgentMap = new WeakMap<Session, AgentData>();
```

**Advantages:**
- Automatic cleanup when objects are garbage collected
- No manual cleanup needed
- Zero memory leak risk

**Limitations:**
- Only works with object keys (not primitive types)
- Can't iterate over entries
- Requires refactoring to use object references instead of IDs

### Solution 3: Multi-Layer Cleanup Strategy (Most Robust)

Combine multiple cleanup mechanisms for defense in depth:

```typescript
class RobustSessionMap<K, V> {
  private map = new Map<K, V>();
  private accessTimes = new Map<K, number>();
  private readonly maxSize: number;
  private readonly ttl: number;
  
  constructor(maxSize = 1000, ttl = 30 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
    
    // TTL-based cleanup
    setInterval(() => this.cleanupStale(), 60000);
    
    // Event-based cleanup (if events work)
    eventBus.on('session.deleted', (id) => this.delete(id));
    
    // Process exit cleanup
    process.on('beforeExit', () => this.clear());
  }
  
  set(key: K, value: V): void {
    // LRU eviction if exceeding max size
    if (this.map.size >= this.maxSize) {
      this.evictLRU();
    }
    
    this.map.set(key, value);
    this.accessTimes.set(key, Date.now());
  }
  
  get(key: K): V | undefined {
    const value = this.map.get(key);
    if (value !== undefined) {
      this.accessTimes.set(key, Date.now());
    }
    return value;
  }
  
  private cleanupStale(): void {
    const now = Date.now();
    for (const [key, time] of this.accessTimes.entries()) {
      if (now - time > this.ttl) {
        this.delete(key);
      }
    }
  }
  
  private evictLRU(): void {
    let oldestKey: K | undefined;
    let oldestTime = Infinity;
    
    for (const [key, time] of this.accessTimes.entries()) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }
    
    if (oldestKey !== undefined) {
      this.delete(oldestKey);
    }
  }
  
  delete(key: K): boolean {
    this.accessTimes.delete(key);
    return this.map.delete(key);
  }
  
  clear(): void {
    this.map.clear();
    this.accessTimes.clear();
  }
}
```

**Features:**
- TTL-based automatic cleanup
- LRU eviction when reaching max size
- Still listens to session.deleted events (if they work)
- Process exit cleanup as final safeguard
- Tracks last access time for smarter cleanup

### Solution 4: Explicit Cleanup in Finally Blocks

Add explicit cleanup in critical code paths:

```typescript
async function handleConversation(session: Session) {
  try {
    // ... conversation logic
  } finally {
    // Explicit cleanup regardless of how function exits
    cleanupSession(session.id);
    sessionAgentMap.delete(session.id);
    contextCache.delete(session.id);
    // ... cleanup all session-related data
  }
}
```

## Recommended Implementation Plan

### Phase 1: Immediate Fix (High Priority)
1. Implement TTL-based cleanup for `sessionAgentMap`
2. Add LRU eviction with max size limit
3. Add explicit cleanup in finally blocks for critical paths

### Phase 2: Comprehensive Fix (Medium Priority)
1. Audit all Map/Set usage in the codebase
2. Replace session-related Maps with RobustSessionMap
3. Add monitoring/logging for memory usage trends

### Phase 3: Long-term Improvements (Lower Priority)
1. Consider WeakMap where applicable
2. Add automated memory leak detection tests
3. Implement memory usage alerting in production

## Testing Recommendations

1. **Memory Profiling:**
   - Run extended conversation sessions (20+ rounds)
   - Monitor memory growth with `process.memoryUsage()`
   - Verify cleanup happens within TTL period

2. **Windows-Specific Testing:**
   - Test on Windows 11 specifically
   - Verify session.deleted event reliability
   - Confirm TTL cleanup works when events fail

3. **Load Testing:**
   - Multiple concurrent sessions
   - Verify max size limits prevent runaway growth
   - Ensure LRU eviction works correctly

4. **Regression Testing:**
   - Verify previous PR fixes still work
   - Ensure no new memory leaks introduced
   - Test across different session lifecycles

## Expected Impact

After implementing the recommended solutions:

- **Memory usage should remain stable** around 200-500MB
- **Growth should be linear** at ~50-100MB per round (not 600-800MB)
- **Automatic cleanup** within 30 minutes even if events fail
- **Max memory cap** prevents runaway growth
- **Windows compatibility** through event-independent cleanup

## Files to Modify

Based on the investigation, likely files needing changes:

- `src/hooks/` - Session lifecycle hooks
- `src/agents/` - Agent state management
- `src/context/` or similar - Context cache management
- Any file with `Map<SessionId, *>` patterns

## Next Steps

1. Review this investigation report
2. Decide on solution approach (recommend starting with Solution 3)
3. Create implementation PR with:
   - TTL-based cleanup
   - LRU eviction
   - Explicit finally block cleanup
4. Add memory profiling tests
5. Test extensively on Windows 11
6. Monitor memory usage after deployment

## References

- Issue: https://github.com/code-yeongyu/oh-my-opencode/issues/1486
- Previous PRs: #1058, #453, #302, #167
- Investigation branch: `investigate/issue-1486`
