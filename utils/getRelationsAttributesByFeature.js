/**
 * @param { Object } opts
 * @param opts.layerId
 * @param opts.relation
 * @param opts.feature
 *
 * @returns { BigUint64Array }
 */
export function getRelationsAttributesByFeature({
  layerId,
  relation,
  feature,
} = {}) {
  const service = g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing');

  const layer = service.getToolBoxById(layerId).getLayer();
  const fatherLayer = service.getLayerById(relation.getFather ? relation.getFather() : relation.father);
  const { ownField, relationField } = getRelationFieldsFromRelation({ layerId, relation });
  // get features of relation child layers
  // Loop relation fields
  // In case of new feature, need to check if field is pk field
  const values = relationField.map(field => feature.isNew() && fatherLayer.isPkField(field) ? feature.getId() : feature.get(field));
  return service
    .getLayerById(layerId)
    .readEditingFeatures()
    .filter(feature => ownField.every((field, i) => feature.get(field) == values[i])) // get relations by feature
    .map(relation => ({
      fields: layer.getFieldsWithValues(relation, { relation: true }),
      id: relation.getId()
    }))
}