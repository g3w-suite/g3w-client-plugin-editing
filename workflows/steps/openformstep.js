const {base, inherit} = g3wsdk.core.utils;
const {Step} = g3wsdk.core.workflow;
const OpenFormTask = require('./tasks/openformtask');

//creato uno step per apriore il form
const OpenFormStep = function(options={}) {
  options.task = new OpenFormTask(options);
  options.help = "editing.steps.help.insert_attributes_feature";
  base(this, options)
};

inherit(OpenFormStep, Step);

module.exports = OpenFormStep;
