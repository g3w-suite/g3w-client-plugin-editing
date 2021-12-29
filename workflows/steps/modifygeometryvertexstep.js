const {base, inherit} = g3wsdk.core.utils;
const EditingStep = require('./editingstep');
const ModifyGeometryVertexTask = require('./tasks/modifygeometryvertextask');

const ModifyGeometryVertexStep = function(options={snap: true}) {
  const task = new ModifyGeometryVertexTask(options);
  options.task = task;
  options.help = "signaler_iim.steps.help.edit_feature_vertex";
  base(this, options)
};

inherit(ModifyGeometryVertexStep, EditingStep);

module.exports = ModifyGeometryVertexStep;
