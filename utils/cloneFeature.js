/**
 * Clone a feature by Primary Key
 * 
 * @param { Feature } feature  to be cloned
 * @param { TableLayer } layer from which obtain the primary key field
 * 
 * @returns { Feature }
 * 
 * @since g3w-client-plugin-editing@v3.7.0
 */
export function cloneFeature(feature, layer) {
  const clone = feature.cloneNew();
  const pk    = layer && layer.getEditingFields().find(f => f.pk); // get PK field (of value-relation widget?)
  /** @FIXME add description */
  if (pk && false === pk.editable) {
    clone.set(pk.name, null);
  }
  return clone;
};