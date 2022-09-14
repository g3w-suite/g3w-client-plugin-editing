const {base, inherit} = g3wsdk.core.utils;
const EditingWorkflow = require('./editingworkflow');
const PickFeatureStep = require('./steps/pickfeaturestep');
const ChooseFeatureStep = require('./steps/choosefeaturestep');
const ModifyGeometryVertexStep = require('./steps/modifygeometryvertexstep');

function ModifyGeometryVertexWorflow(options={}) {
  options.helpMessage = 'editing.tools.update_vertex';
  const pickstep = new PickFeatureStep(options);
  const modifyvertexstep = new ModifyGeometryVertexStep();
  options.steps = [
    pickstep,
    new ChooseFeatureStep(),
  modifyvertexstep];
  base(this, options);
  this.addToolsOfTools({
    step: modifyvertexstep,
    tools:['snap', 'measure']
  })
}

inherit(ModifyGeometryVertexWorflow, EditingWorkflow);

module.exports = ModifyGeometryVertexWorflow;
