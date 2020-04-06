const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const FormComponent = g3wsdk.gui.vue.FormComponent;
const GUI = g3wsdk.gui.GUI;
const EditingFormService = require('./editingformservice');

function EditingFormComponent(options={}) {
  base(this, options);
  const EditingService = require('../services/editingservice');
  const relationsOptions = options.context_inputs || null;
  const {layer} = options;
  const layerId = layer.getId();
  if (relationsOptions) {
    const feature = relationsOptions.inputs.features[relationsOptions.inputs.features.length-1];
    GUI.setLoadingContent(true);
    EditingService.getLayersDependencyFeatures(layerId, {
      feature,
      filterType: 'field'
    }).then(()=> {
      relationsOptions.formEventBus = this.getService().getEventBus();
      const service = new EditingFormService(relationsOptions);
      const RelationComponents = service.buildRelationComponents();
      const customFormComponents = EditingService.getFormComponentsById(layerId);
      //check if add components to add
      customFormComponents.length && this.addFormComponents(customFormComponents);
      // add relation component
      RelationComponents.length &&this.addFormComponents(RelationComponents);
      Vue.nextTick(()=>{
        GUI.setLoadingContent(false);
      })
    })
  }

}

inherit(EditingFormComponent, FormComponent);

module.exports = EditingFormComponent;
