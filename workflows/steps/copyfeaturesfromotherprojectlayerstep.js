const {base, inherit} = g3wsdk.core.utils;
const EditingStep = require('./editingstep');
const Task = require('./tasks/copyfeaturesfromotherprojectlayertask');

const CopyFeaturesFromOtherProjectLayerStep = function(options={}) {
  options.task = new Task(options);
  options.help = "editing.steps.help.draw_new_feature";
  base(this, options)
};

inherit(CopyFeaturesFromOtherProjectLayerStep, EditingStep);

module.exports = CopyFeaturesFromOtherProjectLayerStep;
