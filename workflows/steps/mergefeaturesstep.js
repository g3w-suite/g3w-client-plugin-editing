const { base, inherit } = g3wsdk.core.utils;
const EditingStep = require('./editingstep');
const MergeFeaturesTask = require('./tasks/mergefeaturestask');

const MergeFeatureStep = function(options={}) {
  options.task = new MergeFeaturesTask();
  options.help = "editing.steps.help.merge";
  base(this, options)
};

inherit(MergeFeatureStep, EditingStep);

module.exports = MergeFeatureStep;
