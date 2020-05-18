const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const EditingStep = require('./editingstep');
const t = g3wsdk.core.i18n.tPlugin;
const AddFeatureTask = require('./tasks/addfeaturetask');

var AddFeatureStep = function(options={}) {
  options.task = new AddFeatureTask(options);
  options.help = "editing.steps.help.draw_new_feature";
  base(this, options)
};

inherit(AddFeatureStep, EditingStep);

module.exports = AddFeatureStep;
