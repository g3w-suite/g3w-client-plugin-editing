/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@3.7.1
 * 
 * @param layer
 * @param feature
 */
export function setNullMediaFields({
 layer,
 feature,
} = {}) {
 layer
   .getEditingMediaFields({})
   .forEach(field => feature.set(field, null))
}