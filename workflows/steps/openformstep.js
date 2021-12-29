const {base, inherit} = g3wsdk.core.utils;
const Step = g3wsdk.core.workflow.Step;
const OpenFormTask = require('./tasks/openformtask');

const OpenFormStep = function(options={}) {
  options.task = new OpenFormTask(options);
  options.help = "signaler_iim.steps.help.insert_attributes_feature";
  base(this, options)
};

inherit(OpenFormStep, Step);

module.exports = OpenFormStep;
