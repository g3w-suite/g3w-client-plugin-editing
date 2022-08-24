const {base, inherit} = g3wsdk.core.utils;
const EditingStep = require('./editingstep');
const Task = require('./tasks/copyfeaturesfromotherlayertask');

const CopyFeaturesFromOtherLayerStep = function(options={}) {
  options.task = new Task(options);
  options.help = "editing.steps.help.draw_new_feature";
  base(this, options)
};

inherit(CopyFeaturesFromOtherLayerStep, EditingStep);

module.exports = CopyFeaturesFromOtherLayerStep;
