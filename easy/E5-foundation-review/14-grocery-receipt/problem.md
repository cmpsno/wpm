# Grocery Receipt

**Level:** E5 · **Type:** Application
**Concepts:** `double`, arithmetic, fixed formatting

## Prompt
Print a receipt subtotal, tax, and total for one item price, quantity, and tax percentage.

## Input
Price, integer quantity, and tax percent.

## Output
Three fixed two-decimal lines: subtotal, tax, and total.

## Examples

### Example 1
Input:
```text
2.50 3 10
```
Output:
```text
Subtotal: 7.50
Tax: 0.75
Total: 8.25
```

### Example 2
Input:
```text
1.00 1 0
```
Output:
```text
Subtotal: 1.00
Tax: 0.00
Total: 1.00
```

### Example 3
Input:
```text
3.33 2 5
```
Output:
```text
Subtotal: 6.66
Tax: 0.33
Total: 6.99
```

## Constraints and edge cases
Follow the stated input constraints and match output text, capitalization, spacing, and decimal precision exactly.

## Hint
Calculate tax from the subtotal.
