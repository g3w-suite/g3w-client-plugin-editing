var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var Step = g3wsdk.core.workflow.Step;
var PickFeatureTask = require('./tasks/pickfeaturetask');

//creato uno step per permettere di fare il pickfeature
var PickFeatureStep = function(options) {
  options = options || {};
  options.task = new PickFeatureTask();
  options.help = "Clicca su una feature per poterla editare";
  base(this, options)
};

inherit(PickFeatureStep, Step);

module.exports = PickFeatureStep;
