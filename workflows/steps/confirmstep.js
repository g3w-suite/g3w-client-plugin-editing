var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var EditingStep = require('./editingstep');
var ConfirmTask = require('./tasks/confirmtask');

var ConfirmStep = function(options) {
  options = options || {};
  options.task = new ConfirmTask(options);
  //options.help = "editing.steps.help.action_confirm";
  base(this, options)
};

inherit(ConfirmStep, EditingStep);

module.exports = ConfirmStep;
