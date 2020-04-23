const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const Step = g3wsdk.core.workflow.Step;
const t = g3wsdk.core.i18n.tPlugin;
const AddFeatureTableTask = require('./tasks/addfeaturetabletask');

//creato uno step per apriore il form
var AddTableFeatureStep = function(options={}) {
  options.task = new AddFeatureTableTask();
  options.help = t("editing.steps.help.new");
  base(this, options)
};

inherit(AddTableFeatureStep, Step);

module.exports = AddTableFeatureStep;
