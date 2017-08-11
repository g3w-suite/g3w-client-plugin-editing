var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var Workflow = g3wsdk.core.workflow.Workflow;
var PickFeatureStep = require('./steps/pickfeaturestep');
var ModifyGeometryVertexStep = require('./steps/modifygeometryvertexstep');

function ModifyGeometryVertexWorflow(options) {
  options = options || {};
  options.steps = [new PickFeatureStep(), new ModifyGeometryVertexStep()];
  base(this, options);
}

inherit(ModifyGeometryVertexWorflow, Workflow);

var proto = ModifyGeometryVertexWorflow.prototype;

module.exports = ModifyGeometryVertexWorflow;