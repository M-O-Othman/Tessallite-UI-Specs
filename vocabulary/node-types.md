# Node types

The `type` of a node. A type not listed here is written `custom:<name>`
(pattern `^custom:[A-Za-z][A-Za-z0-9_-]*$`) and MAY contain any node.

"Contains" says what the type may have as children. "Parent" says where the
type may sit. Rules marked MUST are enforced by the validator (SPEC R15);
"leaf" types MUST NOT have children.

| Type | Meaning | Contains | Parent |
|---|---|---|---|
| `container` | A region that groups other nodes: a screen, a pane, a section, a bar. | any | any |
| `group` | A set of related controls presented together: a button group, a chip group, a field with its label. | any | any |
| `text` | A run of text the user reads: a paragraph, a caption, a value, a message. `label` holds the text or its i18n key. | `text`, `link`, `icon` | any |
| `heading` | A title that names the region it starts. | `text`, `icon` | any |
| `icon` | A pictogram. `icon` holds the URI; `label` is REQUIRED (the accessible name, or the reason it is decorative). | leaf | any |
| `image` | A picture from data. `label` is REQUIRED. | leaf | any |
| `link` | Navigation to another place. | `text`, `icon` | any |
| `button` | A control that performs an action when activated. | `text`, `icon`, overlays it owns | any |
| `icon-button` | A button whose only content is an icon. `label` is REQUIRED. | `icon`, overlays it owns | any |
| `toggle` | A two-state button (pressed or not). | `text`, `icon` | any |
| `input` | A single-line text entry. | leaf | any |
| `textarea` | A multi-line text entry. | leaf | any |
| `select` | A closed choice from a list; the list is its `menu` child or a repeat `list-item`. | `menu`, `list-item` | any |
| `combobox` | An editable entry with a suggestion list. | `input`, `menu`, `list` | any |
| `checkbox` | A binary choice. | leaf | any |
| `radio-group` | A single choice among `radio` children. | `radio`, `text` | any |
| `radio` | One option of a `radio-group`. | leaf | MUST be `radio-group` |
| `switch` | An on/off control that applies immediately. | leaf | any |
| `slider` | A value chosen along a range. | leaf | any |
| `tablist` | A strip of tabs. | `tab` | any |
| `tab` | One tab. `events` say which `tabpanel` it selects via `target`. | `text`, `icon` | MUST be `tablist` |
| `tabpanel` | The content shown for one tab. | any | any |
| `chip` | A compact token that names a value, filter or selection; may carry a remove action. | `text`, `icon`, `icon-button` | any |
| `badge` | A small status or count marker. | `text`, `icon` | any |
| `list` | An ordered set of items. Declares `data.collection` and one repeat `list-item`. | `list-item`, `group`, `text` | any |
| `list-item` | One item of a list. | any | MUST be `list` |
| `table` | Rows of cells under column definitions. Declares `columns` and `data.collection`; `data.columns` when a column is `repeat`. | `row`, logical groups of rows | any |
| `row` | One row of a table. Header rows carry `props.role: header`. | `cell` | MUST be `table` (or a `logical` node under one) |
| `cell` | One cell of a row. `column` names its column. | any | MUST be `row` |
| `grid` | Children arranged on named or counted tracks. Declares `tracks`; children carry `placement`. | any | any |
| `card` | A bounded surface that presents one item or one summary. | any | any |
| `dialog` | A modal or non-modal window over its owner. `presentation` MUST be `overlay`. | any | its owner |
| `drawer` | A panel that slides over its owner from an edge. `presentation` MUST be `overlay`. | any | its owner |
| `menu` | A list of commands or choices shown on demand. `presentation` MUST be `overlay`. | `menu-item`, `divider`, `group` | its owner |
| `menu-item` | One command or choice in a menu. | `text`, `icon`, `menu` (submenu) | MUST be `menu` |
| `tooltip` | Short explanatory text shown on hover or focus. `presentation` MUST be `overlay`. | `text` | its owner |
| `toast` | A transient notification. `presentation` MUST be `overlay`. | `text`, `icon`, `button` | its owner |
| `banner` | A persistent message across a region: an alert, an offline notice. | `text`, `icon`, `button` | any |
| `progress` | An indicator of an activity in progress or of completion. | leaf | any |
| `skeleton` | A placeholder shown while content loads. | leaf | any |
| `chart` | A data visualisation. `label` is REQUIRED; `data` names the series. | `text` | any |
| `divider` | A separator between siblings. | leaf | any |
| `form` | A set of inputs submitted together. | any | any |

## Choosing a type

- Prefer the most specific type whose meaning matches. A row of three
  buttons is a `group`; a screen is a `container`.
- A node that exists to group children for reading but has no
  user-perceivable identity is `kind: logical`, whatever its type.
- Use `custom:<name>` only when no type fits. Give the custom type a
  `description` on its first use.
