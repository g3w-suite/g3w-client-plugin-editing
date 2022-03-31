import SIGNALER_IIM_CONFIG from '../global_plugin_data';
import EditVertexComponent from './components/edifeature/editvertex/editvertex.vue';
import EditRadiusComponent from './components/edifeature/editradius/editradius.vue';
import EditFeaturesComponent from './components/editfeatures/editfeatures.vue';
import ChildrenSignalerComponent from './components/childrensignaler/childrensignaler.vue';
const {base, inherit} = g3wsdk.core.utils;
const FormComponent = g3wsdk.gui.vue.FormComponent;

function EditingFormComponent(options={}) {
  const {signaler_layer_id, vertex_layer_id} = SIGNALER_IIM_CONFIG;
  const {layer, isnew, can_edit_signaler_feature, edit_feature_geometry, relation_signal_types} = options;
  const layerId = layer.getId();
  let component;
  let childrensignalercomponent;
  if (layerId === signaler_layer_id){
    if (!isnew && can_edit_signaler_feature) {
      component = EditFeaturesComponent;
    }
    // in case of not new and has a children signaler
    if (!isnew && relation_signal_types){
      childrensignalercomponent = ChildrenSignalerComponent;
    }
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
  
  childrensignalercomponent && this.addBodyFormComponent({
    component: childrensignalercomponent,
    where: 'after'
  });
  
  
}

inherit(EditingFormComponent, FormComponent);

module.exports = EditingFormComponent;
