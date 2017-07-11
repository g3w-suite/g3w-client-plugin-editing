var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var Workflow = g3wsdk.core.workflow.Workflow;
var Step = g3wsdk.core.workflow.Step;

function GeometryAddWorflow() {
  base(this);
  this._steps = []
}

inherit(GeometryAddWorflow, Workflow);

var proto = GeometryAddWorflow.prototype;

module.exports = GeometryAddWorflow;