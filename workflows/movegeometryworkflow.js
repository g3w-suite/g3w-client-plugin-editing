var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var Workflow = g3wsdk.core.workflow.Workflow;
var Step = g3wsdk.core.workflow.Step;

function MoveGeometryWorflow(options) {
  options = options || {};
  options.steps = [];
  base(this, options);
}

inherit(MoveGeometryWorflow, Workflow);

var proto = MoveGeometryWorflow.prototype;

module.exports = MoveGeometryWorflow;