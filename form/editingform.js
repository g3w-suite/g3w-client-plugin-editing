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
  const RelationsComponent = service.buildRelationsComponents();
  // qui vado ad aggiungere il componente relations
  if (service.hasRelations())
    this.addComponentAfterBody({
      id: "relations",
      component:RelationsComponent
    });
}

inherit(EditingFormComponent, FormComponent);

module.exports = EditingFormComponent;
