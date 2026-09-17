# Simple ATM

**Level:** E5 · **Type:** Application
**Concepts:** `double`, conditionals, fixed formatting

## Prompt
Reject a withdrawal larger than the balance; otherwise print the remaining balance.

## Input
Two nonnegative amounts: balance and withdrawal.

## Output
`Insufficient funds` or `Remaining balance: X.XX`.

## Examples

### Example 1
Input:
```text
100.00 30
```
Output:
```text
Remaining balance: 70.00
```

### Example 2
Input:
```text
50.00 75
```
Output:
```text
Insufficient funds
```

### Example 3
Input:
```text
20.00 20
```
Output:
```text
Remaining balance: 0.00
```

## Constraints and edge cases
Follow the stated input constraints and match output text, capitalization, spacing, and decimal precision exactly.

## Hint
Compare before subtracting.
