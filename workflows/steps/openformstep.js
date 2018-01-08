const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const Step = g3wsdk.core.workflow.Step;
const OpenFormTask = require('./tasks/openformtask');

//creato uno step per apriore il form
const OpenFormStep = function(options) {
  options = options || {};
  options.task = new OpenFormTask();
  options.help = "Inserisci gli attributi della feature";
  base(this, options)
};

inherit(OpenFormStep, Step);

module.exports = OpenFormStep;
