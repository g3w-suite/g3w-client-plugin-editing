const { LayerTypes } = g3wsdk.core.layer.Layer;

/**
   *
   * Used by the following plugins: "plugin"
   * @TODO Move it on  https://github.com/g3w-suite/g3w-client-plugin-editing
   *
   *
   * @param layer
   * @param force
   * @param vectorurl
   * @param project_type
   * @param project
   * @return {Promise<any|null>}
   */
  export async function getLayerForEditing({
    layer,
    force = false,
    vectorurl,
    project_type,
  } = {}) {

    if (!force && !layer.isEditable()) {
      return null;
    }

    //IMAGE LAYER
    if (LayerTypes.IMAGE === layer.getType()) {
      // set editing layer
      try {
      return await (new g3wsdk.core.layer.VectorLayer(layer.config, {
        vectorurl,
        project_type,
        project: g3wsdk.core.ApplicationState.project,
      })).layerForEditing;
        
      } catch(e) {
        console.warn(e);
        return Promise.reject(e);
      }
    }

    //TABLE LAYER
    if (LayerTypes.TABLE === layer.getType()) {
      return layer;
    }
  }