# Dependency Analysis

## BFS Traversal

Breadth-First Search for complete dependency mapping.

### Algorithm

```
1. Start with target entity
2. Visit all direct dependencies (depth 1)
3. Visit all dependencies of dependencies (depth 2)
4. Continue until no new dependencies found
5. Return complete dependency set
```

### Implementation

```typescript
function bfsDependencies(entity: string, graph: Graph): Set<string> {
  const visited = new Set<string>();
  const queue = [entity];
  
  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    
    visited.add(current);
    
    const deps = graph.getDependencies(current);
    for (const dep of deps) {
      if (!visited.has(dep)) {
        queue.push(dep);
      }
    }
  }
  
  return visited;
}
```

## Blast Radius

Total number of files/modules affected by a change.

### Calculation

```
Blast Radius = |Direct Dependents| + |Transitive Dependents|
```

### Categories

| Radius | Size | Risk | Strategy |
|--------|------|------|----------|
| Small | 1-3 files | Low | Direct modification |
| Medium | 4-10 files | Medium | Feature flag + incremental |
| Large | 10+ files | High | Refactor + deprecation |

## Dependency Types

### Direct Dependencies

Files that directly import the entity:

```typescript
// auth.ts imports utils.ts
import { helper } from './utils';
```

### Transitive Dependencies

Dependencies of dependencies:

```
auth.ts → utils.ts → constants.ts
                  → types.ts
```

### Dynamic References

Runtime imports (harder to detect):

```typescript
// Dynamic import
const module = await import('./utils');

// Require
const utils = require('./utils');
```

## Circular Dependencies

When A depends on B and B depends on A.

### Detection

```bash
sem graph --entity <entity> --format json | jq 'select(.circular != null)'
```

### Resolution

1. Extract shared code to new module
2. Use dependency injection
3. Restructure imports

## Best Practices

- Run impact analysis before modifying shared entities
- Consider transitive dependencies, not just direct
- Check for circular dependencies
- Use depth limit for large codebases
- Document blast radius in PR descriptions
