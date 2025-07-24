const { Layer } = g3wsdk.core.layer;

/**
 * ORIGINAL SOURCE: g3w-client/src/map/layers/layer.js@v4.0.0
 *  
 * @returns {*} editing version of layer
 */
export function getEditingLayer(layer) {
  if (Layer.LayerTypes.TABLE === layer.getType()) {
    return layer;
  }
  if (Layer.LayerTypes.VECTOR === layer.getType()) {
    return layer.getMapLayer().getOLLayer();
  }
}