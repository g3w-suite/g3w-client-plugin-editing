var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var FormComponent = g3wsdk.gui.vue.FormComponent;
var RelationsComponent = require('../components/relations/vue/relations');
var RelationsService = require('../components/relations/relationsservice');

function EditingFormComponent(options) {
  options = options || {};
  base(this, options);
  var relations = options.relations || [];
  // verifico che ci siano le relazioni
  if (relations.length) {
    _.forEach(relations, function(relation) {
      RelationsService.addRelation(relation.getState());
      //RelationsComponent.state.relations.push(relation.getState());
    });
    // qui vado ad aggiungere il compoente relations
    this.addComponentAfterBody(RelationsComponent);
  }
  console.log(RelationsService.state)
}

inherit(EditingFormComponent, FormComponent);

module.exports = EditingFormComponent;