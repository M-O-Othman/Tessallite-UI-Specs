# Event actions

The `actions` array of an Event names what happens, from this list. An
action not listed is written `custom:<name>`. Several actions may combine:
a submit button may `submit` and then `navigate`.

| Action | Meaning | `target` |
|---|---|---|
| `navigate` | Moves the user to another screen, structure or external location. | The destination node, when it is in the document. |
| `open` | Shows an overlay or expands a region. | The node opened. |
| `close` | Hides an overlay or collapses a region. | The node closed. |
| `toggle` | Switches a two-state condition (expanded/collapsed, on/off, shown/hidden). | The node toggled, if not this node. |
| `select` | Makes one option the current one (tab, list item, project, persona). | The node whose selection changes, if not this node. |
| `set-state` | Puts a node into a named state; name the state in `effect`. | The node whose state changes. |
| `submit` | Sends the values of a form or a composer. | The form, if not this node. |
| `call` | Invokes a service, API, host function or command; name it in `effect`. | none |
| `emit` | Raises a component event to the parent; `emits` names it. | none |
| `copy` | Puts a value on the clipboard. | none |
| `insert` | Writes a value into the host document (a worksheet, an editor). | none |
| `refresh` | Re-fetches or recomputes data. | The node refreshed, if not this node. |
| `focus` | Moves keyboard focus. | The node focused. |
| `remove` | Deletes an item from a collection or a value from a selection. | The node removed, if not this node. |
| `filter` | Narrows a collection by a criterion. | The list or table filtered. |
| `sort` | Orders a collection by a criterion. | The list or table sorted. |
| `move` | Reorders or relocates an item (drag and drop, arrow keys). | The container that receives it. |

`effect` is REQUIRED on every event and says, in plain words, what the user
observes; `actions` is the machine-readable summary of the same thing.
