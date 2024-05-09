import WorkflowsStack from '../g3wsdk/workflow/stack'

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
 * 
 * @returns { undefined | { feature: * , qgs_layer_id: * } }
 */
export function getParentFormData() {
  // skip when ..
  if (!(WorkflowsStack.getLength() > 1)) {
    return;
  }

  const {
    features,
    layer,
    fields = [],
  } = WorkflowsStack.getParent().getInputs();

  // in case of temporary fields (setted by form) set temporary value to feature (cloned) parent
  const feature = features[features.length -1].clone();

  fields.forEach(({ name, value }) => { feature.set(name, value) });

  return {
    feature,
    qgs_layer_id: layer.getId(),
  };
};