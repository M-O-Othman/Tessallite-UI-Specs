# Mapping: W3C Design Tokens

The Design Tokens Community Group format (design-tokens.github.io/community-group)
defines tokens in nested groups with `$value` and `$type`. Tessallite-UI-Specs
never carries token values; it carries token names so that a design tool can
join the structure to the token file.

## Rule

`tokens` on a node is an array of token names in dotted path form, the same
path a token file resolves with curly-brace references:
`{color.text.secondary}` in a token file is `color.text.secondary` here.

| Token file | Tessallite-UI-Specs | Note |
|---|---|---|
| Group path `color.text.secondary` | `"tokens": ["color.text.secondary"]` | Path only. |
| `$value`, `$type`, `$description` | not carried | Values are visual; the token file owns them. |
| Alias `{color.brand}` | the aliased name is not resolved here | A consumer resolves aliases in the token file. |

## What to record

Record the tokens a node consumes when they express a design decision a
reader needs: the token that marks a status badge as `error`, the token a
selected tab uses. Do not enumerate every spacing or font token; that is what
the implementation and the token file are for.

## Validation

The validator checks only that `tokens` is an array of unique strings. A
consumer that has the token file MAY check that every name resolves.
