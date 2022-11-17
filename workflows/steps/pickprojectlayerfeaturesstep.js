const {base, inherit}  = g3wsdk.core.utils;
const { Step }  = g3wsdk.core.workflow;
const PickProjectLayerFeaturesTask = require('./tasks/pickprojectlayerfeaturestask');

const PickProjectLayerFeaturesStep = function(options={}) {
  options.task = new PickProjectLayerFeaturesTask(options);
  options.help = "editing.steps.help.pick_feature";
  base(this, options)
};

inherit(PickProjectLayerFeaturesStep, Step);

module.exports = PickProjectLayerFeaturesStep;
