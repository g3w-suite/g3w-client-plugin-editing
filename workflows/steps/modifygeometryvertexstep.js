var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var EditingStep = require('./editingstep');
var ModifyGeometryVertexTask = require('./tasks/modifygeometryvertextask');

var ModifyGeometryVertexStep = function(options={snap: true}) {
  options.task = new ModifyGeometryVertexTask(options);
  options.help = "editing.steps.help.edit_feature_vertex";
  base(this, options)
};

inherit(ModifyGeometryVertexStep, EditingStep);

module.exports = ModifyGeometryVertexStep;
