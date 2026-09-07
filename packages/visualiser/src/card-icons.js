/** Static, offline semantic icons used by graph cards. */
import catalogue from './card-icons.json' with { type: 'json' };

const own = (object, key) => typeof key === 'string' && Object.prototype.hasOwnProperty.call(object, key);

function mapped(object, key) {
  return own(object, key) ? object[key] : undefined;
}

function iconFor(key) {
  const definition = catalogue.icons[key] || catalogue.icons[catalogue.fallback];
  return {
    key,
    label: definition.label,
    paths: [...definition.paths],
    viewBox: catalogue.viewBox,
  };
}

/**
 * Resolve a card's semantic icon without consulting authored icon URLs.
 * Precedence is logical kind, event/structure category, section/category,
 * then the known node type and finally the generic component fallback.
 */
export function getCardIcon(input = {}) {
  const { type, kind, category, section } = input && typeof input === 'object' ? input : {};
  if (kind === 'logical') return iconFor('logical');
  if (category === 'event') return iconFor('event');
  if (category === 'structure') {
    if (type === 'dialog' || type === 'drawer') return iconFor(type);
    return iconFor('window');
  }
  if (category === 'surface') return iconFor('surface');

  const sectionKey = mapped(catalogue.sections, section);
  if (sectionKey && (!type || category === 'section')) return iconFor(sectionKey);

  const typeKey = mapped(catalogue.types, type);
  if (typeKey) return iconFor(typeKey);

  // An authored custom type has no viewer-specific semantics. Keep it as the
  // generic component icon even if a broader, incidental category was passed.
  if (typeof type === 'string' && type.length > 0) return iconFor(catalogue.fallback);

  const categoryKey = mapped(catalogue.categories, category);
  if (categoryKey) return iconFor(categoryKey);
  if (sectionKey) return iconFor(sectionKey);
  return iconFor(catalogue.fallback);
}
