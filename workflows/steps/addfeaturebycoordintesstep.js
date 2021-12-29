const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const EditingStep = require('./editingstep');
const AddFeatureTask = require('./tasks/addfeaturetask');

const SetFeatureCoordinatesStep = function(options={}) {
  options.task = new AddFeatureTask(options);
  options.help = "signaler_iim.steps.help.draw_new_feature";
  base(this, options)
};

inherit(SetFeatureCoordinatesStep, EditingStep);

module.exports = SetFeatureCoordinatesStep;
