# Mapping: Custom Elements Manifest

The Custom Elements Manifest (CEM, github.com/webcomponents/custom-elements-manifest)
describes web components: their attributes, properties, events, slots and CSS
parts. Tessallite-UI-Specs reuses its event and slot shapes so that a CEM can be
turned into component definitions without invention.

## Component definition fields

| CEM (`CustomElementDeclaration`) | Tessallite-UI-Specs (`components.<Name>`) | Note |
|---|---|---|
| `name` | key of `components` | The class name; `tagName` goes to `implementation.tag` on instances. |
| `description` | `description` | Verbatim. |
| `members[kind=field]` with `attribute` | `props.<name>` | `type.text` becomes `type`; `default` becomes `default`; a union of string literals becomes `enum`. |
| `events[]` | `events[]` | `name`, `description`, `type.text` map to `name`, `description`, `type`. |
| `slots[]` | `slots[]` | `name` (empty string for the default slot) and `description` map one to one. |
| `cssParts`, `cssProperties` | not mapped | Visual; out of scope. Token references belong in `tokens` on nodes. |

## Instances

A node that instantiates a web component sets `component` to the class name
and `implementation: [{ "technology": "web-component", "tag": "<tagName>" }]`.
Content placed in a named slot is a child node with `slot` set to the CEM slot
name; content in the default slot uses `"slot": ""` or no `slot` when the
component declares only a default slot.

## Events on nodes

A CEM event is what the component emits. A node Event (SPEC section 7) is
what the product does with it. A node whose component emits `change` and
whose handler switches project writes:

```json
{ "event": "change", "handler": "onProjectChange", "actions": ["select", "call"],
  "effect": "Selects the project and reloads models for it." }
```

No converter ships in v0.1; the mapping is documented so that one can be
written mechanically.
