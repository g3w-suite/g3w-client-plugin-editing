var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var FormComponent = g3wsdk.gui.vue.FormComponent;
var RelationsComponent = require('../components/relations/vue/relations');

function EditingFormComponent(options) {
  base(this, options);
  this.addComponentAfterBody(RelationsComponent);
}

inherit(EditingFormComponent, FormComponent);

module.exports = EditingFormComponent;