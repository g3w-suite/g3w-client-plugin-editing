import EditVertexComponent from './components/editvertex/editvertex.vue';
import EditFeaturesComponent from './components/editfeatures/editfeatures.vue';
const {base, inherit} = g3wsdk.core.utils;
const FormComponent = g3wsdk.gui.vue.FormComponent;

function EditingFormComponent(options={}) {
  const EditingService = require('../services/editingservice');
  const {layer, isnew} = options;
  const layerId = layer.getId();
  let component;
  if (layerId === EditingService.getLayerSegnalazioniId()){
    if (!isnew) component = EditFeaturesComponent;
  } else component = EditVertexComponent;
  base(this, options);
  this.addBodyFormComponent({
    component,
    where: 'after'
  });
}

inherit(EditingFormComponent, FormComponent);

module.exports = EditingFormComponent;
