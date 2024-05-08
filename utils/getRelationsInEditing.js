import { getRelationId } from '../utils/getRelationId';

/**
 * @param { Object } opts
 * @param opts.layerId
 * @param opts.relations
 *
 * @returns { Array }
 *
 */
export function getRelationsInEditing({
  layerId,
  relations = [],
}) {
  const service = g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing'); //get editing service
  return relations.filter(r => service.getToolBoxById(getRelationId({ layerId, relation: r })));
}