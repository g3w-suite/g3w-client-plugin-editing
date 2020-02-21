const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const FormComponent = g3wsdk.gui.vue.FormComponent;
const EditingFormService = require('./editingformservice');

function EditingFormComponent(options={}) {
  base(this, options);
  let RelationComponents = [];
  const EditingService = require('../services/editingservice');
  const relationsOptions = options.context_inputs || null;
  if (relationsOptions) {
    relationsOptions.formEventBus = this.getService().getEventBus();
    const service = new EditingFormService(relationsOptions);
    RelationComponents = service.buildRelationComponents();
  }
  const layerId = options.layer.getId();
  const customFormComponents = EditingService.getFormComponentsById(layerId);
  //check if add components to add
  customFormComponents.length && this.addFormComponents(customFormComponents);
  // add relation component
  RelationComponents.length &&this.addFormComponents(RelationComponents);
}

inherit(EditingFormComponent, FormComponent);

module.exports = EditingFormComponent;
