var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var Workflow = g3wsdk.core.workflow.Workflow;
var Step = g3wsdk.core.workflow.Step;

function ModifyGeometryWorflow(options) {
  options = options || {};
  options.steps = [];
  base(this, options);
}

inherit(ModifyGeometryWorflow, Workflow);

var proto = ModifyGeometryWorflow.prototype;

module.exports = ModifyGeometryWorflow;