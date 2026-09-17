# Grid Move

**Level:** E5 · **Type:** Application
**Concepts:** strings, conditionals, coordinates

## Prompt
Move one grid square from `x y dir`: N decreases y, S increases y, E increases x, and W decreases x.

## Input
Two integers and one direction letter.

## Output
New `X Y` coordinates.

## Examples

### Example 1
Input:
```text
0 0 E
```
Output:
```text
1 0
```

### Example 2
Input:
```text
4 3 N
```
Output:
```text
4 2
```

### Example 3
Input:
```text
-1 5 W
```
Output:
```text
-2 5
```

## Constraints and edge cases
Follow the stated input constraints and match output text, capitalization, spacing, and decimal precision exactly.

## Hint
Update only the coordinate named by the direction.
