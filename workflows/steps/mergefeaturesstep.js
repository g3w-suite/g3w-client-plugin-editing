const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const t = g3wsdk.core.i18n.tPlugin;
const EditingStep = require('./editingstep');
const MergeFeaturesTask = require('./tasks/mergefeaturestask');

const MergeFeatureStep = function(options) {
  options = options || {};
  options.task = new MergeFeaturesTask();
  options.help = t("editing.steps.help.merge");
  base(this, options)
};

inherit(MergeFeatureStep, EditingStep);

module.exports = MergeFeatureStep;
