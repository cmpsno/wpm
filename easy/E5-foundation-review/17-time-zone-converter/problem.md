# Time Zone Converter

**Level:** E5 · **Type:** Application
**Concepts:** arithmetic, modulo

## Prompt
Apply an hour offset and wrap the resulting hour into the 0 through 23 range.

## Input
Two integers: hour and offset.

## Output
One adjusted hour.

## Examples

### Example 1
Input:
```text
23 2
```
Output:
```text
1
```

### Example 2
Input:
```text
1 -3
```
Output:
```text
22
```

### Example 3
Input:
```text
12 0
```
Output:
```text
12
```

## Constraints and edge cases
Follow the stated input constraints and match output text, capitalization, spacing, and decimal precision exactly.

## Hint
Use the double-modulo expression to handle negative offsets.
