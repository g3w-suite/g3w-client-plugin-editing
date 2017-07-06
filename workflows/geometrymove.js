var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var Workflow = g3wsdk.core.workflow.Workflow;
var Step = g3wsdk.core.workflow.Step;

function GeometryMoveWorflow(){
  base(this);
}
inherit(GeometryMoveWorflow, Workflow);

var proto = GeometryMoveWorflow.prototype;

module.exports = GeometryMoveWorflow;