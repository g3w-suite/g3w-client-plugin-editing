/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
 * 
 * Get Father layer fields related (in Relation) to Child Layer,
 *
 * ie. father fields having same `vectorjoin_id` attribute to `relation.id` value
 *
 * @param { Relation } relation
 *
 * @returns { Array } fields Array bind to child layer
 *
 * @since g3w-client-plugin-editing@v3.7.0
 */
export function getRelation1_1EditingLayerFieldsReferredToChildRelation(relation) {
  return g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing')
    .getLayerById(relation.getFather())
    .getEditingFields()
    .filter(field => field.vectorjoin_id && field.vectorjoin_id === relation.getId());
}