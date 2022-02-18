import SIGNALER_IIM_CONFIG from '../global_plugin_data';
import EditVertexComponent from './components/edifeature/editvertex/editvertex.vue';
import EditRadiusComponent from './components/edifeature/editradius/editradius.vue';
import EditFeaturesComponent from './components/editfeatures/editfeatures.vue';
const {base, inherit} = g3wsdk.core.utils;
const {isPointGeometryType} = g3wsdk.core.geometry.Geometry;
const FormComponent = g3wsdk.gui.vue.FormComponent;

function EditingFormComponent(options={}) {
  const {signaler_layer_id, vertex_layer_id} = SIGNALER_IIM_CONFIG;
  const {layer, isnew, can_edit_signaler_feature, edit_feature_geometry} = options;
  const layerId = layer.getId();
  let component;
  if (layerId === signaler_layer_id){
    if (!isnew && can_edit_signaler_feature) component = EditFeaturesComponent;
  } else if (vertex_layer_id)
    switch(edit_feature_geometry) {
      case 'vertex':
        component = EditVertexComponent;
        break;
      case 'radius':
        component = EditRadiusComponent;
        break;
    }
  base(this, options);
  component && this.addBodyFormComponent({
    component,
    where: 'before'
  });
}

inherit(EditingFormComponent, FormComponent);

module.exports = EditingFormComponent;
