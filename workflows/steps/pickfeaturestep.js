const {base, inherit}  = g3wsdk.core.utils;
const { Step }  = g3wsdk.core.workflow;
const PickFeatureTask = require('./tasks/pickfeaturetask');

const PickFeatureStep = function(options={}) {
  options.task = new PickFeatureTask(options) ;
  options.help = "editing.steps.help.pick_feature";
  base(this, options)
};

inherit(PickFeatureStep, Step);

module.exports = PickFeatureStep;
