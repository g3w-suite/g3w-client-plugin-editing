import { Workflow }                 from '../g3wsdk/workflow/workflow';
import { promisify }                from '../utils/promisify';
import { setFeaturesSelectedStyle } from '../utils/setFeaturesSelectedStyle';

const { Layer } = g3wsdk.core.layer;

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
 * 
 * Method that set selected style to current editing features and
 * reset original style when workflow (tool) is done.
 * 
 * @param promise jQuery promise
 * @param { Object } inputs
 * @param { ol.style.Style }  style
 */
export function setAndUnsetSelectedFeaturesStyle({ promise, inputs, style } = {}) {
  
  /** @FIXME temporary add in order to fix issue on pending promise (but which issue ?) */
  const {
      layer,
      features = [],
  } = inputs;

  /**
   * @TODO if coming from relation ( Workflow.Stack.getLength() > 1 )
   *       no need setTimeout because we already it has selected style
   *       so original is the same selected. In case of current layer
   *       need to wait.
   */
  const selectOriginalStyleHandle = () => {
    const originalStyle = setFeaturesSelectedStyle(features, style);
    promisify(promise).finally(() => { features.flat().forEach((feature => feature.setStyle(originalStyle))) });
  };

  const is_vector = Layer.LayerTypes.VECTOR === layer.getType();
  const is_single = Workflow.Stack.getLength();

  if (is_vector && is_single) {
    setTimeout(() => selectOriginalStyleHandle());
  } else if (is_vector) {
    selectOriginalStyleHandle();
  }
}