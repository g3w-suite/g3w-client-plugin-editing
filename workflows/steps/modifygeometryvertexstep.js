var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var EditingStep = require('./editingstep');
var ModifyGeometryVertexTask = require('./tasks/modifygeometryvertextask');

var ModifyGeometryVertexStep = function(options) {
  options = options || {};
  options.task = new ModifyGeometryVertexTask();
  options.help = "Modifica o aggiungi un vertice alla feature selezionata";
  base(this, options)
};

inherit(ModifyGeometryVertexStep, EditingStep);

module.exports = ModifyGeometryVertexStep;
