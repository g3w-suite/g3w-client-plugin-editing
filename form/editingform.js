const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const FormComponent = g3wsdk.gui.vue.FormComponent;
const EditingFormService = require('./editingformservice');

function EditingFormComponent(options={}) {
  base(this, options);
  // solo tutte le informazini relative alle relazioni di quella toolbox/layer
  const relationsOptions = options.relationsOptions;
  // recuprare l'event bus del form
  relationsOptions.formEventBus = this.getService().getEventBus();
  // vado a creare il servizio delle relazioni
  const service = new EditingFormService(relationsOptions);
  // mi restituisce il componente Vue da passare al form
  const RelationComponents = service.buildRelationComponents();
  const layerId = options.layer.getId();
  const EditingService = require('../services/editingservice');
  const customFormComponents = EditingService.getFormComponentsById(layerId);
  // qui vado ad aggiungere il componente relations
  if (customFormComponents.length)
    this.addFormComponents(customFormComponents);
  if (RelationComponents.length)
    this.addFormComponents(RelationComponents);
}

inherit(EditingFormComponent, FormComponent);

module.exports = EditingFormComponent;
