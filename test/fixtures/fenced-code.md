# Fenced Code Blocks Test

The table inside this fenced code block must NOT be touched or formatted:

```markdown
| raw_col1 | raw_col2 |
|---|---|
| a | b |
```

And inside tilde code fences:

~~~python
# Python block
| not | formatted |
| - | - |
~~~

However, the real table below MUST be formatted:

| Name  | Score |
| :---- | ----: |
| Alice |   100 |
| Bob   |    85 |
