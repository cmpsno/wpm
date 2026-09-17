# Inventory Check

**Level:** E5 · **Type:** Application
**Concepts:** conditionals, comparisons

## Prompt
Classify inventory capacity: over capacity when used is greater than max, full when equal, almost full when used is at least max minus two, otherwise space available.

## Input
Two integers: used slots and maximum slots.

## Output
One status line.

## Examples

### Example 1
Input:
```text
8 10
```
Output:
```text
Almost full
```

### Example 2
Input:
```text
10 10
```
Output:
```text
Full
```

### Example 3
Input:
```text
11 10
```
Output:
```text
Over capacity
```

## Constraints and edge cases
Follow the stated input constraints and match output text, capitalization, spacing, and decimal precision exactly.

## Hint
Check the most restrictive condition first.
