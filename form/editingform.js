import SIGNALER_IIM_CONFIG from '../constant';
import EditVertexComponent from './components/editvertex/editvertex.vue';
import EditFeaturesComponent from './components/editfeatures/editfeatures.vue';
const {base, inherit} = g3wsdk.core.utils;
const {isPointGeometryType} = g3wsdk.core.geometry.Geometry;
const FormComponent = g3wsdk.gui.vue.FormComponent;

function EditingFormComponent(options={}) {
  const {signaler_layer_id, vertex_layer_id} = SIGNALER_IIM_CONFIG;
  const {layer, isnew} = options;
  const layerId = layer.getId();
  let component;
  if (layerId === signaler_layer_id){
    if (!isnew) component = EditFeaturesComponent;
  } else if (!isPointGeometryType(layer.getGeometryType()) && vertex_layer_id) component = EditVertexComponent;
  base(this, options);
  this.addBodyFormComponent({
    component,
    where: 'after'
  });
}

inherit(EditingFormComponent, FormComponent);

module.exports = EditingFormComponent;
