import { setFeaturesSelectedStyle } from './setFeaturesSelectedStyle';

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@3.7.1
 * 
 * Method that set selected style to current editing features and
 * reset original style when workflow (tool) is done.
 * 
 * @param promise jQuery promise
 */
export function setAndUnsetSelectedFeaturesStyle({ promise, inputs } = {}) {
  
  /** @FIXME temporary add in order to fix issue on pending promise (but which issue ?) */
  const {
      layer,
      features = [],
  } = inputs;

  /**
   * @TODO if coming from relation ( WorkflowsStack.getLength() > 1 )
   *       no need setTimeout because we already it has selected style
   *       so original is the same selected. In case of current layer
   *       need to wait.
   */
  const selectOriginalStyleHandle = () => {
    const originalStyle = setFeaturesSelectedStyle(features);
    promise.always(() => { features.flat().forEach((feature => feature.setStyle(originalStyle))) });
  };

  const is_vector = g3wsdk.core.layer.Layer.LayerTypes.VECTOR === layer.getType();
  const is_single = WorkflowsStack.getLength();

  if (is_vector && is_single) {
    setTimeout(() => { selectOriginalStyleHandle(); });
  } else if(is_vector) {
    selectOriginalStyleHandle();
  }
};