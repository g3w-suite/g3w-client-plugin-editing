var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var EditingWorkflow = require('./editingworkflow');
var ModifyLineGeometryVertexStep = require('./steps/modifylinegeometryvertexstep');

function ModifyGeometryVertexWorflow(options={}) {
  const modifyvertex = new ModifyLineGeometryVertexStep(options);
  options.steps = [modifyvertex];
  base(this, options);
}

inherit(ModifyGeometryVertexWorflow, EditingWorkflow);

module.exports = ModifyGeometryVertexWorflow;
