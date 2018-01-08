const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const EditingTool = require('./editingtask');

function EditAttributesTask() {
  base(this);
}
inherit(EditAttributesTask, EditingTool);

module.exports = EditAttributesTask;
