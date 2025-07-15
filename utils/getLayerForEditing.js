import { promisify } from './promisify';
import Editor        from '../g3w-editor';

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
    
    // get layer editing config (from server)
    try {
      const {
      vector,
      constraints = {},
      capabilities,
      style,
    } = await promisify(layer.getProvider('data').getConfig());

      layer.state.editing =  {
        started:  false,
        modified: false,
        ready:    false
      }
          
      await g3wsdk.core.utils.waitFor(() => window.g3wsdk.core.hasOwnProperty('editing'), g3wsdk.constant.TIMEOUT);    // wait until "editing" plugin is loaded
      
      // add editing configurations
      layer.config.editing = {
        fields:                      vector.fields || [],
        format:                      vector.format,
        constraints,
        capabilities:                capabilities || window.g3wsdk.constant.DEFAULT_EDITING_CAPABILITIES, // default editing capabilities
        form:                        { perc: null },                                                      // set editing form `perc` to null at beginning
        style:                       vector.style,                                                        // get vector layer style
        geometrytype:                vector.geometrytype,                                                 // whether is a vector layer,
        visible:                     (vector.editing || { visible: true }).visible,                       //@since 3.11.0 let know if layer should be editable directly (true) or through relation layer (false)
        layer_style:                 (vector.editing || { layer_style: null }).layer_style,               // @since v4.0.0 check if has a layer style to for editing form
      };

      // set vector layer color 
      if (vector.style) {                              
        layer.setColor(vector.style.color);
      }

      layer._editor = new Editor({ layer }); // create an instance of editor
      layer.state.editing.ready = true;
    } catch(e) {
      console.warn(e);
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
      return layer.clone(); // cloned editable layer
    }
  }