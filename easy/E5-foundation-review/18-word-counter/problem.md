# Word Counter

**Level:** E5 · **Type:** Application
**Concepts:** `string`, `getline`, loops

## Prompt
Count words in a full line and count all characters except spaces. Consecutive spaces do not create extra words.

## Input
One full line of text.

## Output
`Words: W` and `Characters: C`.

## Examples

### Example 1
Input:
```text
hello world
```
Output:
```text
Words: 2
Characters: 10
```

### Example 2
Input:
```text
  one   two  
```
Output:
```text
Words: 2
Characters: 6
```

### Example 3
Input:
```text
single
```
Output:
```text
Words: 1
Characters: 6
```

## Constraints and edge cases
Follow the stated input constraints and match output text, capitalization, spacing, and decimal precision exactly.

## Hint
A new word begins after whitespace when the next character is not whitespace.
