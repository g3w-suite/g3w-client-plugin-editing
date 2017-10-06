var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var Step = g3wsdk.core.workflow.Step;
var OpenTableTask = require('./tasks/opentabletask');

//creato uno step per apriore il form
var OpenTableStep = function(options) {
  options = options || {};
  options.task = new OpenTableTask();
  options.help = "Edita le features della tabella";
  base(this, options)
};

inherit(OpenTableStep, Step);

module.exports = OpenTableStep;
