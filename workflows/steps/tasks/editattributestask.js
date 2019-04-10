const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const EditingTask = require('./editingtask');

function EditAttributesTask() {
  base(this);
}
inherit(EditAttributesTask, EditingTask);

module.exports = EditAttributesTask;
