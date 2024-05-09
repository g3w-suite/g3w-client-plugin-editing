import { getRelationId } from '../utils/getRelationId';

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
 * 
 * @param { Object } opts
 * @param opts.layerId
 * @param opts.relations
 *
 * @returns { Array }
 * 
 * @since g3w-client-plugin-editing@v3.8.0
 */
export function getRelationsInEditing({
  layerId,
  relations = [],
}) {
  const service = g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing'); //get editing service
  return relations.filter(r => service.getToolBoxById(getRelationId({ layerId, relation: r })));
}