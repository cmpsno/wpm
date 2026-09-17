# Coin Conversion

**Level:** E5 · **Type:** Application
**Concepts:** `long long`, division, modulo

## Prompt
Convert a copper amount into gold, silver, and copper. One gold is 100 silver and one silver is 100 copper.

## Input
One nonnegative integer: copper.

## Output
`G gold, S silver, C copper`

## Examples

### Example 1
Input:
```text
12345
```
Output:
```text
1 gold, 23 silver, 45 copper
```

### Example 2
Input:
```text
99
```
Output:
```text
0 gold, 0 silver, 99 copper
```

### Example 3
Input:
```text
10000
```
Output:
```text
1 gold, 0 silver, 0 copper
```

## Constraints and edge cases
Follow the stated input constraints and match output text, capitalization, spacing, and decimal precision exactly.

## Hint
Take the largest denomination first.
