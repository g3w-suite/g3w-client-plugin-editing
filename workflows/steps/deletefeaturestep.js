const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const t = g3wsdk.core.i18n.tPlugin;
const EditingStep = require('./editingstep');
const DeleteFeatureTask = require('./tasks/deletefeaturetask');

const DeleteFeatureStep = function(options={}) {
  options.task = new DeleteFeatureTask();
  options.help = t("editing.steps.help.double_click_delete");
  base(this, options)
};

inherit(DeleteFeatureStep, EditingStep);

module.exports = DeleteFeatureStep;
