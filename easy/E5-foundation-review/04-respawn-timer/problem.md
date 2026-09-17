# Respawn Timer

**Level:** E5 · **Type:** Application
**Concepts:** `int`, division, modulo, formatting

## Prompt
Convert seconds into a zero-padded `MM:SS` respawn timer.

## Input
One integer from 0 through 3599: seconds.

## Output
Time in `MM:SS` format.

## Examples

### Example 1
Input:
```text
125
```
Output:
```text
02:05
```

### Example 2
Input:
```text
0
```
Output:
```text
00:00
```

### Example 3
Input:
```text
3599
```
Output:
```text
59:59
```

## Constraints and edge cases
Follow the stated input constraints and match output text, capitalization, spacing, and decimal precision exactly.

## Hint
Use `std::setw` and `std::setfill`.
