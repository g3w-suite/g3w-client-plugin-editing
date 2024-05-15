import { setFeaturesSelectedStyle } from '../utils/setFeaturesSelectedStyle';

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/selectelementstask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/selectelementsstep.js@v3.7.1
 *
 * @since g3w-client-plugin-editing@v3.8.0
 */
export function addRemoveToMultipleSelectFeatures(features, inputs, selected, task) {
  (features || []).forEach(f => {
    const selIndex = selected.indexOf(f);
    if (selIndex < 0) {
      task._originalStyle = setFeaturesSelectedStyle([f]);
      selected.push(f);
    } else {
      selected.splice(selIndex, 1);
      f.setStyle(task._originalStyle);
    }
    inputs.features = selected;
  });

  const steps = task.getSteps();
  const buttonnext = steps.select.buttonnext;

  buttonnext.disabled = buttonnext.condition ? buttonnext.condition({ features: selected }) : 0 === selected.length;

  if (undefined !== steps.select.dynamic) {
    steps.select.dynamic = selected.length;
  }
}