import { getRelationsAttributesByFeature } from '../utils/getRelationsAttributesByFeature';

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
      relationinediting = {
        relation: relation.getState(),
        relations: getRelationsAttributesByFeature({
          layerId: relationLayerId,
          relation,
          feature
        })
      };
      relationinediting.validate = {
        valid:true
      };
      relationsinediting.push(relationinediting);
    }
  });
  return relationsinediting;
}