const {base, inherit} = g3wsdk.core.utils;
const {GUI} = g3wsdk.gui;
const {FormComponent} = g3wsdk.gui.vue;
const EditingFormService = require('./editingformservice');

function EditingFormComponent(options={}) {
  base(this, options);
  const EditingService = require('../services/editingservice');
  const relationsOptions = options.context_inputs || null;
  const {layer} = options;
  const layerId = layer.getId();
  if (relationsOptions) {
    const feature = relationsOptions.inputs.features[relationsOptions.inputs.features.length-1];
    const promise =  feature.isNew() ? Promise.resolve() : EditingService.getLayersDependencyFeatures(layerId, {
      feature,
      filterType: 'fid'
    });
    promise.then(() => {
      relationsOptions.formEventBus = this.getService().getEventBus();
      const service = new EditingFormService(relationsOptions);
      const RelationComponents = service.buildRelationComponents();
      const customFormComponents = EditingService.getFormComponentsById(layerId);
      //check if add components to add
      customFormComponents.length && this.addFormComponents(customFormComponents);
      // add relation component
      RelationComponents.length && this.addFormComponents(RelationComponents);
      this.getService().handleRelation = async function({relation, layerId, feature}){
        GUI.setLoadingContent(true);
        const {name: relationId} = relation;
        await EditingService.setLayerUniqueFieldValues(layer.getRelationById(relationId).getChild());
        this.setCurrentComponentById(relationId);
        GUI.setLoadingContent(false);
      };
    })
  }
}

inherit(EditingFormComponent, FormComponent);

module.exports = EditingFormComponent;
