var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var EditingWorkflow = require('./editingworkflow');

function ModifyGeometryWorflow(options={}) {
  options.steps = [];
  base(this, options);
}

inherit(ModifyGeometryWorflow, EditingWorkflow);

const proto = ModifyGeometryWorflow.prototype;

module.exports = ModifyGeometryWorflow;