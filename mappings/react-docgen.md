# Mapping: react-docgen

react-docgen (github.com/reactjs/react-docgen) and react-docgen-typescript
extract a component's description and props from source. The output seeds
`components` in a Tessallite-UI-Specs document; structures are authored
separately.

## Component definition fields

| react-docgen output | Tessallite-UI-Specs (`components.<Name>`) | Note |
|---|---|---|
| `displayName` | key of `components` | |
| `description` | `description` | JSDoc above the component. |
| `props.<name>.type.name` or `tsType.name` | `props.<name>.type` | `union` of string literals becomes `type: string` plus `enum`; `signature` (functions) becomes `type: function`. |
| `props.<name>.description` | `props.<name>.description` | |
| `props.<name>.defaultValue.value` | `props.<name>.default` | |
| `props.<name>.required` | `props.<name>.required` | |
| callback props named `on<Event>` | `events[].name` | The prop name is the event name; the function signature becomes `events[].type`. |
| `props.children` | `slots[]` with `name: ""` | The default slot. Named render props (`headerSlot`, `renderFooter`) become named slots. |

## Tessallite Excel plugin practice

The workspace generates declarations with
`npx tsc --declaration --emitDeclarationOnly` and reads the `Props`
interfaces from `build/ts/**/*.d.ts`. Prop names, types and optionality in
`components` come from those declarations; descriptions come from the JSDoc
on the interface members.

## What react-docgen does not carry

Neither tool sees which JSX the component renders. Containment, states and
node events are authored from the source, guided by the rules in SPEC.md.
