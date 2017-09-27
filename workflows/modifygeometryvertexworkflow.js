var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var EditingWorkflow = require('./editingworkflow');
var PickFeatureStep = require('./steps/pickfeaturestep');
var ModifyGeometryVertexStep = require('./steps/modifygeometryvertexstep');

function ModifyGeometryVertexWorflow(options) {
  options = options || {};
  options.steps = [new PickFeatureStep(), new ModifyGeometryVertexStep()];
  base(this, options);
}

inherit(ModifyGeometryVertexWorflow, EditingWorkflow);

var proto = ModifyGeometryVertexWorflow.prototype;

module.exports = ModifyGeometryVertexWorflow;