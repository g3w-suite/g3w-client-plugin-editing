const {base, inherit, createSingleFieldParameter, resolve} = g3wsdk.core.utils;
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
    promise.then(()=> {
      relationsOptions.formEventBus = this.getService().getEventBus();
      const service = new EditingFormService(relationsOptions);
      const RelationComponents = service.buildRelationComponents();
      const customFormComponents = EditingService.getFormComponentsById(layerId);
      //check if add components to add
      customFormComponents.length && this.addFormComponents(customFormComponents);
      // add relation component
      RelationComponents.length && this.addFormComponents(RelationComponents);
      this.getService().handleRelation = function({relation, layerId, feature}){
        const {name: relationId, nmRelationId} = relation;
        if (nmRelationId) {
          const sessionOwner = EditingService.getToolboxSelected().getSession();
          const relations = layer.getRelations().getArray().filter(relation => relation.getId() === relationId);
          const featuresrelations = EditingService.getRelationsInEditing({layerId, relations, feature})[0].relations || [];
          const {referencedLayer, fieldRef:{referencedField, referencingField}} = EditingService.getRelationById(nmRelationId);
          const values = [];
          featuresrelations.forEach(featurerelation => {
            const field = featurerelation.fields.find(field => field.name === referencingField);
            values.push(field.value)
          });
          const toolbox = EditingService.getToolBoxById(referencedLayer);
          toolbox.setDisabled(true);
          const isStarted = toolbox.isStarted();
          let promise;
          if (isStarted) promise = resolve();
          else promise = toolbox.start();
          promise.then(() => {
            EditingService.setVisibilityOlLayerFeatureByFilterFields(referencedLayer, {
              field: referencedField,
              values
            });
            const tool = toolbox.getToolById('edittable');
            toolbox.setActiveTool(tool, {
              context: {
                nmRelation: true,
                isChild: true,
                session: sessionOwner
              },
            });
            tool.once('stop', () => {
              EditingService.resetVisibilityOfLayerFeatures(referencedLayer);
              toolbox.setDisabled(false);
            });
          });
        } else this.setCurrentComponentById(relationId);
      };
    })
  }
}

inherit(EditingFormComponent, FormComponent);

module.exports = EditingFormComponent;
