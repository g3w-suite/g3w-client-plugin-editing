/**
 * @TODO remove reference to `this.getContext`
 * 
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/addfeaturetabletask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/addtablefeaturestep.js@v3.7.1
 * 
 * @since g3w-client-plugin-editing@v3.8.0
 */
export function addTableFeature(inputs, context) {
  const feature = inputs.features.length > 0 ? inputs.features[inputs.features.length -1 ] : inputs.layer.createNewFeature();

  feature.setTemporaryId();

  inputs.layer.getEditingLayer().getEditingSource().addFeature(feature);

  context.session.pushAdd(inputs.layer.getId(), feature, false);

  inputs.features.push(feature);

  this.getContext().get_default_value = true;

  return $.Deferred(d => d.resolve(inputs, context)).promise();
};