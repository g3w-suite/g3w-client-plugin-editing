const { base, inherit }  = g3wsdk.core.utils;
const { GUI }            = g3wsdk.gui;
const { FormComponent }  = g3wsdk.gui.vue;
const EditingFormService = require('./editingformservice');

function EditingFormComponent(options = {}) {

  base(this, options);

  const EditingService   = require('../services/editingservice');
  const relationsOptions = options.context_inputs || null;
  const layerId          = options.layer.getId();
  const feature          = (
    relationsOptions &&
    relationsOptions.inputs &&
    relationsOptions.inputs.features &&
    relationsOptions.inputs.features[relationsOptions.inputs.features.length - 1]
  );
  if (feature) {
    (
      feature.isNew()
        ? Promise.resolve()
        : EditingService.getLayersDependencyFeatures(layerId, {
          //@since v3.7.0 filter ONE (Join 1:1) relations
          // and with layer in editing
          relations: options.layer
            .getRelations()
            .getArray().filter(r =>
              (
                EditingService.getLayerById(r.getChild()) && //Child layer need to be in editing
                'ONE' !== r.getType() //nad relation has no a ONE (Join Relation)
              )
            ),
          feature, filterType: 'fid'
        })
    ).then(() => {
      relationsOptions.formEventBus = this.getService().getEventBus();

      const service                 = new EditingFormService(relationsOptions);
      const RelationComponents      = service.buildRelationComponents();
      const customFormComponents    = EditingService.getFormComponentsById(layerId);

      // check if add components to add
      if (customFormComponents.length > 0) {
        this.addFormComponents(customFormComponents);
      }

      // add relation component
      if (RelationComponents.length > 0)  {
        this.addFormComponents(RelationComponents);
      }

      // overwrite click on relation handler
      this.getService().handleRelation = async function({ relation }) {
        GUI.setLoadingContent(true);
        await EditingService.setLayerUniqueFieldValues(options.layer.getRelationById(relation.name).getChild());
        this.setCurrentComponentById(relation.name);
        GUI.setLoadingContent(false);
      };

    });
  }
}

inherit(EditingFormComponent, FormComponent);

module.exports = EditingFormComponent;
