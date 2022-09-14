const {base, inherit}  = g3wsdk.core.utils;
const EditingStep = require('./editingstep');
const MoveFeatureTask = require('./tasks/movefeaturettask');

const MoveFeatureStep = function(options={}) {
  options.task = new MoveFeatureTask(options);
  options.help = "editing.steps.help.move";
  base(this, options)
};

inherit(MoveFeatureStep, EditingStep);

module.exports = MoveFeatureStep;
