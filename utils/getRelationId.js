/**
 * Based on layer id and relation, return the layer id
 * of the other layer that is in relation with layerId
 * @param { Object } opts
 * @param opts.layerId
 * @param opts.relation
 *
 * @returns {*|{configurable: boolean}|{configurable}|boolean|(function(): *)}
 */
export function getRelationId({
  layerId,
  relation,
} = {}) {
  const fatherId = relation.getFather ? relation.getFather() : relation.father;
  const childId  = relation.getChild  ? relation.getChild()  : relation.child;

  return fatherId === layerId ? childId: fatherId;
}