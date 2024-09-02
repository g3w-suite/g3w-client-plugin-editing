import { getRelationFieldsFromRelation } from '../utils/getRelationFieldsFromRelation';

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
 * 
 * Get Relation in editing
 *
 * @param { Object } opts
 * @param opts.layerId
 * @param opts.relations
 * @param opts.feature
 *
 * @returns { Array }
 * 
 * @since g3w-client-plugin-editing@v3.8.0
 */
export function getRelationsInEditingByFeature({
  layerId,
  relations = [],
  feature,
} = {}) {
  const service = g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing');

  let relationsinediting = [];
  let relationinediting;
  relations.forEach(relation => {
    const child  = relation.getChild ? relation.getChild() : relation.child;
    const father = relation.getFatherField ? relation.getFatherField() : relation.fatherField;
    const relationLayerId = (child === layerId) ? father: child; // get relation LayerId
    //check if the layer is editable
    if (service.getLayerById(relationLayerId)) {
      const layer                       = service.getToolBoxById(relationLayerId).getLayer();
      const fatherLayer                 = service.getLayerById(relation.getFather ? relation.getFather() : relation.father);
      const { ownField, relationField } = getRelationFieldsFromRelation({ layerId: relationLayerId, relation });
      // get features of relation child layers
      // Loop relation fields
      // In case of new feature, need to check if field is pk field
      const values = relationField.map(field => feature.isNew() && fatherLayer.isPkField(field) ? feature.getId() : feature.get(field));

      relationinediting = {
        relation: relation.getState(),
        // get relation attributes by feature
        relations: service
          .getLayerById(relationLayerId)
          .readEditingFeatures()
          .filter(feature => ownField.every((field, i) => feature.get(field) == values[i])) // get relations by feature
          .map(relation => ({
            fields: layer.getFieldsWithValues(relation, { relation: true }),
            id:     relation.getId(),
            select: false, /** @since v3.9.0 Used to set relation select or not **/
          }))
      };
      relationinediting.validate = { valid: true };
      relationsinediting.push(relationinediting);
    }
  });
  return relationsinediting;
}