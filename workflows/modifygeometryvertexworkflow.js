var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var EditingWorkflow = require('./editingworkflow');
var PickFeatureStep = require('./steps/pickfeaturestep');
var ModifyGeometryVertexStep = require('./steps/modifygeometryvertexstep');

function ModifyGeometryVertexWorflow(options={}) {
  const pickstep = new PickFeatureStep(options);
  const modifyvertex = new ModifyGeometryVertexStep(options);
  options.steps = [pickstep, modifyvertex];
  base(this, options);
}

inherit(ModifyGeometryVertexWorflow, EditingWorkflow);

module.exports = ModifyGeometryVertexWorflow;
