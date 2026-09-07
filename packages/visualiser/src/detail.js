import { componentOf, effectiveNode, pathOf } from './model.js';
import viewerConfig from './viewer-config.json' with { type: 'json' };

const captions = viewerConfig.captions.inspector;
const element = (tag, text, className) => Object.assign(document.createElement(tag), { textContent: text ?? '', className: className ?? '' });
const display = (value) => typeof value === 'string' ? value : JSON.stringify(value, null, 2);

/** Render authored facts as readable sections; source remains available separately. */
export function renderInspector(vnode, model, onSelect, onTarget) {
  const detail = document.querySelector('#detail');
  const crumbs = document.querySelector('#breadcrumb');
  detail.replaceChildren(); crumbs.replaceChildren();
  document.querySelector('#detail-title').textContent = vnode?.lines[0] || captions.emptyTitle;
  document.querySelector('#detail-subtitle').textContent = vnode?.lines[1] || captions.emptySubtitle;
  document.querySelector('#json').textContent = vnode ? JSON.stringify(vnode.data, null, 2) : captions.emptySource;
  if (!vnode) return;
  for (const ancestor of pathOf(vnode, model)) {
    const button = element('button', ancestor.lines[0], 'crumb');
    button.type = 'button';
    button.addEventListener('click', () => onSelect(ancestor.vid));
    crumbs.append(button);
  }
  const section = (title) => {
    const node = element('section', '', 'detail-section');
    node.append(element('h3', title)); detail.append(node); return node;
  };
  const fields = (title, values) => {
    const entries = Object.entries(values).filter(([, value]) => value !== undefined);
    if (!entries.length) return;
    const dl = element('dl');
    for (const [name, value] of entries) dl.append(element('dt', name), element('dd', display(value)));
    section(title).append(dl);
  };
  const node = effectiveNode(model, vnode.entry?.node || vnode.node || vnode.data || {});
  const definition = vnode.card?.definition || model.cards.get(componentOf(node))?.definition;
  const description = node.description || definition?.description;
  if (description) section(captions.sectionTitles.purpose).append(element('p', description));
  fields(captions.sectionTitles.identity, { id: node.id, type: node.type, component: vnode.card?.id || node.component, label: node.label, i18n: node.i18n, condition: node.condition, repeat: node.repeat, presentation: node.presentation });
  const events = node.events || definition?.events || definition?.['x-events'];
  if (events?.length) {
    const parent = section(captions.sectionTitles.behaviour);
    for (const event of events) {
      const item = element('article', '', 'event');
      item.append(element('strong', event.event || event.name));
      if (event.effect || event.description) item.append(element('p', event.effect || event.description));
      if (event.handler) item.append(element('code', event.handler));
      if (event.actions) item.append(element('p', event.actions.join(captions.actionSeparator), 'muted'));
      if (event.condition) item.append(element('p', event.condition));
      if (event.target) {
        const button = element('button', captions.goTo + event.target, 'target'); button.type = 'button';
        button.addEventListener('click', () => onTarget(event.target)); item.append(button);
      }
      parent.append(item);
    }
  }
  fields(captions.sectionTitles.instanceProperties, node.props || {});
  if (definition?.props && definition.props !== node.props) fields(captions.sectionTitles.componentProperties, definition.props);
  for (const key of captions.additionalSections) {
    const value = node[key] ?? definition?.[key] ?? definition?.['x-' + key];
    if (value !== undefined) fields(key, Array.isArray(value) ? Object.fromEntries(value.map((item, i) => [item.name || item.id || String(i + 1), item])) : typeof value === 'object' ? value : { value });
  }
  if (vnode.card?.usedBy.length) fields(captions.sectionTitles.usedBy, Object.fromEntries(vnode.card.usedBy.map((use) => [use.nodeId, use.owner])));
  if (!detail.children.length) section(captions.sectionTitles.details).append(element('p', display(vnode.data)));
}
