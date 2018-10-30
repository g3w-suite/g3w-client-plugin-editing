var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var Step = g3wsdk.core.workflow.Step;
var AddFeatureTableTask = require('./tasks/addfeaturetabletask');

//creato uno step per apriore il form
var AddTableFeatureStep = function(options) {
  options = options || {};
  options.task = new AddFeatureTableTask();
  options.help = "editing.steps.help.new";
  base(this, options)
};

inherit(AddTableFeatureStep, Step);

module.exports = AddTableFeatureStep;
