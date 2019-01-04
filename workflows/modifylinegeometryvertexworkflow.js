var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var EditingWorkflow = require('./editingworkflow');
var PickFeatureStep = require('./steps/pickfeaturestep');
var ModifyLineGeometryVertexStep = require('./steps/modifylinegeometryvertexstep');

function ModifyGeometryVertexWorflow(options={}) {
  const pickstep = new PickFeatureStep(options);
  const modifyvertex = new ModifyLineGeometryVertexStep(options);
  options.steps = [pickstep, modifyvertex];
  base(this, options);
}

inherit(ModifyGeometryVertexWorflow, EditingWorkflow);

module.exports = ModifyGeometryVertexWorflow;
