# States

A state names a condition a node can be in. It is not a visual style and
carries no visual information. A state not listed is written
`custom:<name>`. A node with no `states` is in `default` only.

| State | Meaning |
|---|---|
| `default` | The ordinary condition. |
| `loading` | Waiting for data; content may be replaced by a `skeleton` or `progress`. |
| `streaming` | Content is arriving incrementally and is not yet complete. |
| `error` | The last operation failed; an error is shown. |
| `empty` | There is nothing to show; an empty message may replace content. |
| `disabled` | Present but not operable. |
| `readonly` | Visible value that cannot be edited. |
| `required` | A value must be supplied before submission. |
| `invalid` | The current value fails validation. |
| `selected` | This item is the current one among its siblings. |
| `checked` | A binary control is on. |
| `indeterminate` | A binary control is neither on nor off. |
| `pressed` | A toggle button is on. |
| `expanded` | Collapsible content is shown. |
| `collapsed` | Collapsible content is hidden. |
| `open` | An overlay or disclosure is shown. |
| `closed` | An overlay or disclosure is hidden. |
| `active` | Currently in use or in focus of activity (an active tab panel, an active profile). |
| `focused` | Has keyboard focus. |
| `hover` | The pointer is over it. |
| `dragging` | Being dragged. |
| `dropping` | A valid drop target with a drag over it. |
| `editing` | An inline editor is open on it. |
| `pending` | Awaiting confirmation or completion of a submitted action. |
| `success` | The last operation completed. |
| `hidden` | Not present in the current condition. |
| `offline` | Disconnected from its data source. |
| `online` | Connected to its data source. |

## Using `present`

A state object may list `present`: the ids of the descendants that exist in
that state. Descendants not listed are absent in that state. When `present`
is omitted, the state does not change which children exist.

```json
{ "name": "empty", "present": ["kpi-empty-message"] }
```
