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
          // @since g3w-client-plugin-editin@v3.7.0
          relations: options.layer
            .getRelations()
            .getArray().filter(r =>
              (
                (layerId === r.getFather())               && // @since v3.7.0 current layer in editing need to get only child relation features
                EditingService.getLayerById(r.getChild()) && // child layer is in editing
                'ONE' !== r.getType()                        // is not a ONE relation (Join 1:1)
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
