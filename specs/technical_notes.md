# Technical Notes

This document records technical challenges, solutions, and other important notes discovered during the development of the MCP-AfterEffects project.

## ExtendScript `PropertyType` Constants

- **Date:** 2025-09-29
- **Context:** During the implementation of the `getProperties` function in `host/index.jsx`.

### Issue
When attempting to check a property's type using the global ExtendScript constants `PropertyType.GROUP` or `PropertyType.PROPERTY`, the comparison consistently failed. For example, `property.propertyType === PropertyType.GROUP` would evaluate to `false` even for a property that was clearly a group (like the Transform group).

### Diagnosis
Through a series of diagnostic tests, we discovered the following:

1.  The `propertyType` attribute of a property object returns a numeric value (e.g., `6213` for a Transform group).
2.  The global constants `PropertyType.GROUP` and `PropertyType.PROPERTY` were not resolving to the expected numeric values within the script's execution context. The exact reason is unclear, but it's likely an environment or scope issue.

### Solution
Instead of relying on the named constants, we use their literal numeric values directly in the code for comparisons.

- `PropertyType.PROPERTY` = `6212`
- `PropertyType.GROUP` = `6213`

This ensures robust and reliable type checking regardless of the execution environment's state.

**Example (from `host/index.jsx`):**
```javascript
// NOTE: Using literal numbers for property types because the global constants 
// (PropertyType.PROPERTY, PropertyType.GROUP) were found to be unreliable in the ExtendScript context.
// 6212 corresponds to PropertyType.PROPERTY
// 6213 corresponds to PropertyType.GROUP
var PROPERTY_TYPE_PROPERTY = 6212;
var PROPERTY_TYPE_GROUP = 6213;

// ...

if (prop.propertyType === PROPERTY_TYPE_GROUP) {
    scanProperties(prop, currentPath);
}
```
