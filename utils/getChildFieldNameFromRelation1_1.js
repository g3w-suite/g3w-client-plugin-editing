/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@3.7.1
 * 
 * Check if relation has prefix.
 *
 * that's how 1:1 relation fields are marked
 *
 * @param opts.relation Relation Object
 * @param opts.field    father field
 *
 * @return name of father field
 *
 * @since g3w-client-plugin-editing@v3.7.0
 */
export function getChildFieldNameFromRelation1_1({
  relation,
  field,
} = {}) {
  return relation.getPrefix() ? field.name.split(relation.getPrefix())[1] : field.name;
}