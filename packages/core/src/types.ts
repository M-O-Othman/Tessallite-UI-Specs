/** Types of a Tessallite-UI-Specs document. Field meanings are in SPEC.md. */

export type NodeKind = 'visible' | 'logical';
export type Presentation = 'inline' | 'overlay';

export interface Event {
  event: string;
  handler?: string;
  actions: string[];
  effect: string;
  target?: string;
  emits?: string;
  keys?: string[];
  condition?: string;
}

export interface StateObject {
  name: string;
  description?: string;
  present?: string[];
}
export type State = string | StateObject;

export interface Slot {
  name: string;
  description?: string;
}

export interface Column {
  id: string;
  name?: string;
  type?: string;
  sortable?: boolean;
  description?: string;
}

export type TrackList = number | string[];
export interface Tracks {
  columns: TrackList;
  rows?: TrackList;
}

export interface Placement {
  column?: number | string;
  row?: number | string;
  columnSpan?: number;
  rowSpan?: number;
}

export interface Implementation {
  technology?: string;
  file?: string;
  symbol?: string;
  tag?: string;
}

export interface A11y {
  role?: string;
  aria?: Record<string, string | boolean | number>;
  keyboard?: { key: string; effect: string }[];
}

export interface Node {
  id: string;
  type: string;
  kind?: NodeKind;
  name?: string;
  description?: string;
  label?: string;
  i18n?: string;
  icon?: string;
  component?: string;
  $ref?: string;
  props?: Record<string, unknown>;
  implementation?: Implementation[];
  data?: Record<string, string>;
  a11y?: A11y;
  tokens?: string[];
  states?: State[];
  events?: Event[];
  slots?: Slot[];
  slot?: string;
  columns?: Column[];
  column?: string;
  tracks?: Tracks;
  placement?: Placement;
  repeat?: boolean;
  presentation?: Presentation;
  children?: Node[];
}

export interface EventDefinition {
  name: string;
  description?: string;
  type?: string;
}

export interface Component {
  description: string;
  package?: string;
  group?: string;
  example?: string;
  props?: Record<string, unknown>;
  events?: EventDefinition[];
  'x-events'?: EventDefinition[];
  states?: State[];
  'x-states'?: State[];
  slots?: Slot[];
  'x-slots'?: Slot[];
  structure?: Node;
  'x-structure'?: Node;
}

export interface Structure {
  description: string;
  root: Node;
}

export interface UiSpecDocument {
  name: string;
  version: string;
  description: string;
  tuis?: string;
  components: Record<string, Component>;
  structures?: Record<string, Structure>;
  'x-structures'?: Record<string, Structure>;
}

/** One validation problem. `rule` is the SPEC rule (R1..R26) or `schema`. */
export interface Issue {
  rule: string;
  message: string;
  /** JSON Pointer to the offending value. */
  path: string;
  /** Id of the node concerned, when there is one. */
  id?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Issue[];
}

export const stateName = (s: State): string => (typeof s === 'string' ? s : s.name);
