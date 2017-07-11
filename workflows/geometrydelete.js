var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var Workflow = g3wsdk.core.workflow.Workflow;
var Step = g3wsdk.core.workflow.Step;

function GeometryDeleteWorflow() {
  base(this);
}

inherit(GeometryDeleteWorflow, Workflow);

var proto = GeometryDeleteWorflow.prototype;

module.exports = GeometryDeleteWorflow;