var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var EditingStep = require('./editingstep');
var AddFeatureTask = require('./tasks/addfeaturetask');

var AddFeatureStep = function(options) {
  options = options || {};
  options.task = new AddFeatureTask();
  options.help = "Clicca su una feature per poterla editare";
  base(this, options)
};

inherit(AddFeatureStep, EditingStep);

module.exports = AddFeatureStep;
