var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var FormComponent = g3wsdk.gui.vue.FormComponent;
var EditingFormService = require('./editingformservice');

function EditingFormComponent(options) {
  options = options || {};
  base(this, options);
  // solo tutte le informazini relative alle relazioni di quella toolbox/layer
  var relationsOptions = options.relationsOptions;
  // recuprare l'event bus del form
  relationsOptions.formEventBus = this.getService().getEventBus();
  // vado a creare il servizio delle relazioni
  var service = new EditingFormService(relationsOptions);
  // mi restituisce il componente Vue da passare al form
  var RelationsComponent = service.buildRelationsComponents();
  // qui vado ad aggiungere il componente relations
  this.addComponentAfterBody(RelationsComponent);
}

inherit(EditingFormComponent, FormComponent);

module.exports = EditingFormComponent;