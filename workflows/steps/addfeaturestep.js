var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var EditingStep = require('./editingstep');
var AddFeatureTask = require('./tasks/addfeaturetask');

var AddFeatureStep = function(options={}) {
  options.task = new AddFeatureTask(options);
  options.help = "editing.steps.help.draw_new_feature";
  base(this, options)
};

inherit(AddFeatureStep, EditingStep);

module.exports = AddFeatureStep;
