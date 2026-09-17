# Potion Cooldown

**Level:** E5 · **Type:** Application
**Concepts:** conditionals, subtraction

## Prompt
Report whether a potion is ready. If it is not, state the whole seconds remaining.

## Input
Three integers: current time, last-used time, and cooldown.

## Output
`Ready` or `Wait X seconds`

## Examples

### Example 1
Input:
```text
100 90 15
```
Output:
```text
Wait 5 seconds
```

### Example 2
Input:
```text
100 90 10
```
Output:
```text
Ready
```

### Example 3
Input:
```text
20 20 1
```
Output:
```text
Wait 1 seconds
```

## Constraints and edge cases
Follow the stated input constraints and match output text, capitalization, spacing, and decimal precision exactly.

## Hint
First calculate elapsed time.
