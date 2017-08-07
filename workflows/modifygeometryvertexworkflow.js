var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var Workflow = g3wsdk.core.workflow.Workflow;
var ModifyGeometryVertexStep = require('./steps/modifygeometryvertexstep');

function ModifyGeometryVertexWorflow(options) {
  options = options || {};
  options.steps = [new ModifyGeometryVertexStep()];
  base(this, options);
}

inherit(ModifyGeometryVertexWorflow, Workflow);

var proto = ModifyGeometryVertexWorflow.prototype;

module.exports = ModifyGeometryVertexWorflow;