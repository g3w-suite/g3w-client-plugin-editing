const { Feature } = g3wsdk.core.layer.features;

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/addfeaturetabletask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/addtablefeaturestep.js@v3.7.1
 * 
 * @since g3w-client-plugin-editing@v3.8.0
 */
export async function addTableFeature(inputs, context) {
  let feature;

  if (inputs.features.length) {
    feature = inputs.features.at(-1);
  } else {
    feature = new Feature({
      feature: new ol.Feature(
        inputs.layer.getEditingFields().reduce((props, f) => { props[f.name] = null; return props }, {})
      )
    });
    feature.setNew();
  }

  feature.setTemporaryId();

  inputs.layer.getEditingLayer().getEditor().getEditingSource().addFeature(feature);

  context.session.pushAdd(inputs.layer.getId(), feature, false);

  inputs.features.push(feature);

  context.get_default_value = true;

  return { inputs, context };
}