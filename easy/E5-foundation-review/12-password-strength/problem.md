# Password Strength

**Level:** E5 · **Type:** Application
**Concepts:** `string`, `getline`, character classification

## Prompt
Rate one input line by four checks: length at least eight, a digit, uppercase letter, and non-alphanumeric symbol. Zero or one checks is weak, two is medium, and three or four is strong.

## Input
One full line: password text.

## Output
`Weak`, `Medium`, or `Strong`.

## Examples

### Example 1
Input:
```text
abcD123!
```
Output:
```text
Strong
```

### Example 2
Input:
```text
abcdefg
```
Output:
```text
Weak
```

### Example 3
Input:
```text
abc12345
```
Output:
```text
Medium
```

## Constraints and edge cases
Follow the stated input constraints and match output text, capitalization, spacing, and decimal precision exactly.

## Hint
Use `std::getline` and examine every character.
