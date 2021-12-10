import EditVertexComponent from './components/editvertex/editvertex.vue';
import EditFeaturesComponent from './components/editfeatures/editfeatures.vue';
const { base, inherit } = g3wsdk.core.utils;
const FormComponent = g3wsdk.gui.vue.FormComponent;

function EditingFormComponent(options={}) {
  const layerId = options.layer.getId();
  base(this, options);
  this.addBodyFormComponent({
    component: layerId === 'segnalazioni_d581ae5a_adce_4fab_aa33_49ebe1074163' ?  EditFeaturesComponent : EditVertexComponent,
    where: 'after'
  });
}

inherit(EditingFormComponent, FormComponent);

module.exports = EditingFormComponent;
