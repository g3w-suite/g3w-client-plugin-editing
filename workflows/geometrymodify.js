var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var Workflow = g3wsdk.core.workflow.Workflow;
var Step = g3wsdk.core.workflow.Step;

function GeometryModifyWorflow(){
  base(this);
}
inherit(GeometryModifyWorflow, Workflow);

var proto = GeometryModifyWorflow.prototype;

module.exports = GeometryModifyWorflow;