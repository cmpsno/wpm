# Critical Hit

**Level:** E5 · **Type:** Application
**Concepts:** conditionals, comparisons, arithmetic

## Prompt
Double base damage when roll is strictly less than critChance; otherwise keep base damage.

## Input
Three integers: base damage, critical chance, and roll.

## Output
`Damage: X`

## Examples

### Example 1
Input:
```text
10 25 10
```
Output:
```text
Damage: 20
```

### Example 2
Input:
```text
10 25 25
```
Output:
```text
Damage: 10
```

### Example 3
Input:
```text
7 0 0
```
Output:
```text
Damage: 7
```

## Constraints and edge cases
Follow the stated input constraints and match output text, capitalization, spacing, and decimal precision exactly.

## Hint
The comparison is strictly less than.
