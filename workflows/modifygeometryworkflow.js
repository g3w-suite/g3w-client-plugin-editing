const { base, inherit } = g3wsdk.core.utils;
const EditingWorkflow = require('./editingworkflow');

function ModifyGeometryWorflow(options={}) {
  options.steps = [];
  base(this, options);
}

inherit(ModifyGeometryWorflow, EditingWorkflow);

module.exports = ModifyGeometryWorflow;