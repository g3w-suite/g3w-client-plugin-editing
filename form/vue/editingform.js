var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var FormComponent = g3wsdk.gui.vue.FormComponent;

var RelationsService = require('../components/relations/relationsservice');

function EditingFormComponent(options) {
  options = options || {};
  base(this, options);
  // solo tutte le informazini relative alle relazioni di quella toolbox/layer
  var relationsoptions = options.relations;
  // vado a creare il servizio delle relazioni
  var service = new RelationsService(relationsoptions);
  // mi restituisce il componente Vue da passare al form
  var RelationsComponent = service.buildRelationsComponents();
  // qui vado ad aggiungere il componente relations
  this.addComponentAfterBody(RelationsComponent);

}

inherit(EditingFormComponent, FormComponent);

module.exports = EditingFormComponent;