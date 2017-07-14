var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var EditingTool = require('./editingtask');

function EditAttributes() {
  base(this);
}
inherit(EditAttributes, EditingTool);

module.exports = EditAttributes;
