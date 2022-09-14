const { base, inherit }  = g3wsdk.core.utils;
const EditingTool = require('./editingtask');

function EditAttributesTask() {
  base(this);
}
inherit(EditAttributesTask, EditingTool);

module.exports = EditAttributesTask;
