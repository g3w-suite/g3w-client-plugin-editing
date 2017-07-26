var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var Workflow = g3wsdk.core.workflow.Workflow;
var Step = g3wsdk.core.workflow.Step;

function ModifyGeometryVertexWorflow(options) {
  options = options || {};
  options.steps = [];
  base(this, options);
}

inherit(ModifyGeometryVertexWorflow, Workflow);

var proto = ModifyGeometryVertexWorflow.prototype;

module.exports = ModifyGeometryVertexWorflow;