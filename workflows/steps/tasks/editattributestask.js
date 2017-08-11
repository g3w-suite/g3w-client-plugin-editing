var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var EditingTool = require('./editingtask');

function EditAttributesTask() {
  base(this);
}
inherit(EditAttributesTask, EditingTool);

var proto = EditAttributesTask.prototype;

module.exports = EditAttributesTask;
