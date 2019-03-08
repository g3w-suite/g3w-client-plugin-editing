const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const Step = g3wsdk.core.workflow.Step;
const t = g3wsdk.core.i18n.tPlugin;
const OpenFormTask = require('./tasks/openformtask');

//creato uno step per apriore il form
const OpenFormStep = function(options={}) {
  options.task = new OpenFormTask({
    editattribute: options.editattribute
  });
  options.help = t("editing.steps.help.insert_attributes_feature");
  base(this, options)
};

inherit(OpenFormStep, Step);

module.exports = OpenFormStep;
