var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var Step = g3wsdk.core.workflow.Step;
var OpenTableFormTask = require('./tasks/opentableformtask');

//creato uno step per apriore il form
var AddTableFeatureStep = function(options) {
  options = options || {};
  options.task = new OpenTableFormTask();
  options.help = "Inserisci gli attributi della feature";
  base(this, options)
};

inherit(AddTableFeatureStep, Step);

module.exports = AddTableFeatureStep;
