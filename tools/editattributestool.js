var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var EditingTool = require('./editingtool');

function EditAttributes() {
  base(this);
}
inherit(EditAttributes, EditingTool);

module.exports = EditAttributes;
