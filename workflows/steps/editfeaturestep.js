const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const t = g3wsdk.core.i18n.tPlugin;
const EditingStep = require('./editingstep');
const EditFeatureTask = require('./tasks/editattributestask');

const EditFeatureStep = function(options={}) {
  options.task = new EditFeatureTask();
  options.help = "editing.steps.help.show_edit_feature_form";
  base(this, options)
};

inherit(EditFeatureStep, EditingStep);

module.exports = EditFeatureStep;
