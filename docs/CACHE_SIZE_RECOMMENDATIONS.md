# Order History Cache Size Recommendations

## Storage Analysis

### Order Size Estimates

- **Small order** (1-2 items, no extras): ~1-1.5 KB
- **Average order** (3-5 items, some options): ~2-3 KB
- **Large order** (5+ items, many options/extras): ~4-8 KB
- **Complex order** (10+ items, lots of modifications): ~10-15 KB

**Conservative average: ~3 KB per order**

### AsyncStorage Limits

- **iOS**: ~6 MB total (shared with all app data)
- **Android**: ~10 MB total (shared with all app data)
- **Safe usage**: Keep under 50% of limit = 3-5 MB for order history

## Recommended Cache Sizes

### Current Setup (100 orders)

- **Storage**: 100 × 3 KB = ~300 KB ✅ Very safe
- **Coverage**: ~1-2 days (assuming 50-100 orders/day)
- **Memory**: 50 orders in RAM = ~150 KB

### Recommended Options

#### Option 1: Small Restaurant (50-100 orders/day)

```typescript
const MEMORY_LIMIT = 50; // Last 50 orders in RAM
const CACHE_LIMIT = 200; // Last 200 orders on disk (~600 KB)
```

- **Coverage**: ~2-4 days
- **Storage**: ~600 KB
- **Best for**: Small cafes, low-volume restaurants

#### Option 2: Medium Restaurant (100-200 orders/day) ⭐ RECOMMENDED

```typescript
const MEMORY_LIMIT = 75; // Last 75 orders in RAM
const CACHE_LIMIT = 500; // Last 500 orders on disk (~1.5 MB)
```

- **Coverage**: ~2-5 days
- **Storage**: ~1.5 MB
- **Best for**: Most restaurants, moderate volume

#### Option 3: Large Restaurant (200-500 orders/day)

```typescript
const MEMORY_LIMIT = 100; // Last 100 orders in RAM
const CACHE_LIMIT = 1000; // Last 1000 orders on disk (~3 MB)
```

- **Coverage**: ~2-5 days
- **Storage**: ~3 MB
- **Best for**: High-volume restaurants, busy locations

#### Option 4: Maximum (for very busy restaurants)

```typescript
const MEMORY_LIMIT = 150; // Last 150 orders in RAM
const CACHE_LIMIT = 2000; // Last 2000 orders on disk (~6 MB)
```

- **Coverage**: ~4-10 days
- **Storage**: ~6 MB (approaching iOS limit)
- **Best for**: Very high volume, need extended history

## Performance Considerations

### Memory (RAM) Impact

- **50 orders**: ~150 KB - Minimal impact ✅
- **100 orders**: ~300 KB - Still good ✅
- **150 orders**: ~450 KB - Acceptable ✅
- **200+ orders**: ~600 KB+ - May impact performance ⚠️

### Disk (AsyncStorage) Impact

- **< 1 MB**: Instant load (< 50ms) ✅
- **1-3 MB**: Fast load (50-100ms) ✅
- **3-5 MB**: Acceptable (100-200ms) ✅
- **> 5 MB**: Slower (200-500ms) ⚠️

## Recommendations by Use Case

### For Most Restaurants (Default)

```typescript
const MEMORY_LIMIT = 75;
const CACHE_LIMIT = 500;
```

**Why**: Good balance of coverage (2-5 days), storage (~1.5 MB), and performance

### For Low-End Devices

```typescript
const MEMORY_LIMIT = 50;
const CACHE_LIMIT = 200;
```

**Why**: Lower memory usage, faster performance on older devices

### For High-Volume Restaurants

```typescript
const MEMORY_LIMIT = 100;
const CACHE_LIMIT = 1000;
```

**Why**: Extended history coverage, still within safe limits

## Implementation Notes

1. **Monitor actual usage**: Check AsyncStorage size in production
2. **Adjust based on data**: If orders are consistently larger/smaller, adjust estimates
3. **Consider pagination**: For very large datasets, implement pagination instead of loading all
4. **Cache cleanup**: Implement automatic cleanup of old cache if needed

## Testing Recommendations

Test with your actual order data:

1. Calculate average order size from real data
2. Monitor AsyncStorage usage
3. Test on low-end devices
4. Measure load times
