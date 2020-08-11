const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const EditingStep = require('./editingstep');
const AddFeatureTask = require('./tasks/addfeaturetask');

const AddFeatureStep = function(options={}) {
  options.task = new AddFeatureTask(options);
  options.help = "editing.steps.help.draw_new_feature";
  base(this, options)
};

inherit(AddFeatureStep, EditingStep);

module.exports = AddFeatureStep;
