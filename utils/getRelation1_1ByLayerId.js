const { CatalogLayersStoresRegistry } = g3wsdk.core.catalog;

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
 * 
 * Get Relation 1:1 from layerId
 *
 * @param layerId
 *
 * @returns { Array } relations related to layerId that are Join 1:1 (Type ONE)
 *
 * @since g3w-client-plugin-editing@v3.7.0
 */
export function getRelation1_1ByLayerId(layerId) {
  return CatalogLayersStoresRegistry
    .getLayerById(layerId)
    .getRelations()
    .getArray()
    .filter(relation => 'ONE' === relation.getType()); // 'ONE' == join 1:1
}