/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@3.7.1
 * 
 * @returns { undefined | { feature: * , qgs_layer_id: * } }
 */
export function getParentFormData() {
  // skip when ..
  if (!(g3wsdk.core.workflow.WorkflowsStack.getLength() > 1)) {
    return;
  }

  const {
    features,
    layer,
    fields = [],
  } = g3wsdk.core.workflow.WorkflowsStack.getParent().getInputs();

  // in case of temporary fields (setted by form) set temporary value to feature (cloned) parent
  const feature = features[features.length -1].clone();

  fields.forEach(({ name, value }) => { feature.set(name, value) });

  return {
    feature,
    qgs_layer_id: layer.getId(),
  };
};