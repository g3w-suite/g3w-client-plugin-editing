const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const t = g3wsdk.core.i18n.tPlugin;
const EditingStep = require('./editingstep');
const ModifyGeometryVertexTask = require('./tasks/modifygeometryvertextask');

const ModifyGeometryVertexStep = function(options={snap: true}) {
  const task = new ModifyGeometryVertexTask(options);
  options.task = task;
  options.help = t("editing.steps.help.edit_feature_vertex");
  base(this, options)
};

inherit(ModifyGeometryVertexStep, EditingStep);

module.exports = ModifyGeometryVertexStep;
