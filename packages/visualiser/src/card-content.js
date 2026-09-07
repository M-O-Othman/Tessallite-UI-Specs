/** Semantic card summaries. Never evaluate bindings or fetch document icon URLs. */
import { componentOf, effectiveNode } from './model.js';
import { getCardIcon } from './card-icons.js';
import viewerConfig from './viewer-config.json' with { type: 'json' };

const content = viewerConfig.card.content;
const captions = viewerConfig.captions.card;
const nonempty = (value) => typeof value === 'string' && value.trim() ? value : undefined;
const rootOf = (model, name) => model.componentRoots.get(name)?.node;

function withInstanceBindings(node, authored) {
  const data = { ...node.data };
  for (const key of content.literalProps) if (nonempty(authored.props?.[key]) && !authored.data?.[key]) delete data[key];
  return { ...node, data };
}

/** A component instance may supply literal props or children over its root anatomy. */
function sourceNode(model, authored, seen = new Set()) {
  if (!authored) return undefined;
  const node = effectiveNode(model, authored);
  const component = componentOf(authored);
  const structure = authored.$ref?.startsWith('#/structures/') ? model.structureRoots.find((r) => r.owner === authored.$ref.slice(13).replace(/~1/g, '/').replace(/~0/g, '~'))?.node : undefined;
  const root = structure || (component && !seen.has(component) ? rootOf(model, component) : undefined);
  if (!root || authored.children?.length) return node;
  if (authored.$ref) return withInstanceBindings({ ...node, type: authored.type === 'container' ? root.type : node.type }, authored);
  return withInstanceBindings({ ...sourceNode(model, root, new Set([...seen, component])), ...node,
    type: node.type === 'container' ? root.type : node.type,
    children: root.children, props: { ...root.props, ...node.props } }, authored);
}

function cardNode(vnode, model) {
  return sourceNode(model, vnode.entry?.node || vnode.node || (vnode.card && rootOf(model, vnode.card.id)));
}

/** Unwrap only a single neutral wrapper; do not borrow a child's unrelated type. */
function representedNode(node, model, seen = new Set()) {
  if (!node || seen.has(node.id)) return node;
  seen.add(node.id);
  if (node.kind === 'logical' || !content.wrapperTypes.includes(node.type) || node.label || node.events?.length) return node;
  const children = node.children || [];
  if (children.length !== 1 || children[0].repeat || children[0].condition) return node;
  return representedNode(sourceNode(model, children[0]), model, seen);
}

function ownText(node) {
  if (!node || node.kind === 'logical') return [];
  // Icon/image labels are accessible names, not visible text inside the control.
  if (content.accessibleNameTypes.includes(node.type)) return [];
  for (const key of content.literalProps) {
    const literal = nonempty(node.props?.[key]);
    if (literal && !node.data?.[key]) return [literal];
  }
  const label = nonempty(node.label);
  return label && label !== node.i18n ? [label] : [];
}

/** Only inline text belongs to its owner: skip other controls, overlays and alternatives. */
export function cardText(vnode, model) {
  const root = cardNode(vnode, model);
  if (!root) return { text: [], accessibleName: undefined };
  const seen = new Set();
  const collect = (node, isRoot = false) => {
    if (!node || seen.has(node.id)) return [];
    seen.add(node.id);
    if (!isRoot && (node.condition || node.repeat || node.presentation === 'overlay')) return [];
    if (!isRoot && componentOf(node) && !content.textTypes.includes(representedNode(node, model)?.type)) return [];
    if (!isRoot && node.kind !== 'logical' && !content.inlineTypes.includes(node.type)) return [];
    const literal = ownText(node);
    if (literal.length) return literal;
    return (node.children || []).flatMap((child) => collect(sourceNode(model, child)));
  };
  const represented = representedNode(root, model);
  const literal = ownText(root);
  const text = literal.length ? literal : collect(represented, true);
  const accessibleName = content.accessibleNameTypes.includes(represented?.type)
    ? nonempty(represented.label) : undefined;
  return { text, accessibleName };
}

export function cardPresentation(vnode, model) {
  const node = cardNode(vnode, model);
  const represented = representedNode(node, model);
  const section = vnode.section;
  const category = (section === 'events' || vnode.data?.event) ? 'event' : vnode.kind;
  const icon = getCardIcon({ type: represented?.type, kind: node?.kind, category, section });
  const { text, accessibleName } = cardText(vnode, model);
  const events = node?.events || represented?.events || vnode.card?.definition?.events || vnode.card?.definition?.['x-events'] || [];
  const eventCount = category === 'event' ? 0 : events.length;
  const literal = text.join(captions.textSeparator);
  const preview = literal || (accessibleName ? `${captions.accessibleName}: ${accessibleName}` : '');
  const lines = [...vnode.lines];
  const description = [icon.label, ...lines, preview, eventCount ? `${eventCount} ${captions.events}` : ''].filter(Boolean).join(', ');
  return { icon, eventCount, preview, lines, ariaLabel: description, title: description,
    text, accessibleName, node };
}
