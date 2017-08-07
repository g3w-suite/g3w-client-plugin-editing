var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var Step = g3wsdk.core.workflow.Step;
var OpenFormTask = require('./tasks/openformtask');

//creato uno step per apriore il form
var OpenFormStep = function(options) {
  options = options || {};
  options.task = new OpenFormTask();
  options.help = "apertura form";
  base(this, options)
};

inherit(OpenFormStep, Step);

module.exports = OpenFormStep;
