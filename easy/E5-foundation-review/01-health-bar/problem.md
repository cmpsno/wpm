# Health Bar

**Level:** E5 · **Type:** Application
**Concepts:** `int`, conditionals, loops, integer arithmetic

## Prompt
Read `current max`. Clamp current to the range 0 through max, then print a 10-slot health bar and integer percent. Filled slots are `current * 10 / max`.

## Input
Two integers: current health and maximum health. Maximum health is positive.

## Output
`[##########] P%`, where P is the clamped integer percent.

## Examples

### Example 1
Input:
```text
50 100
```
Output:
```text
[#####-----] 50%
```

### Example 2
Input:
```text
0 100
```
Output:
```text
[----------] 0%
```

### Example 3
Input:
```text
150 100
```
Output:
```text
[##########] 100%
```

## Constraints and edge cases
Follow the stated input constraints and match output text, capitalization, spacing, and decimal precision exactly.

## Hint
Use a loop to print ten bar characters.
