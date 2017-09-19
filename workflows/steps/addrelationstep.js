var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var EditingStep = require('./editingstep');
var AddRelationTask = require('./tasks/addrelationtask');

var AddRelationStep = function(options) {
  options = options || {};
  options.task = new AddRelationTask();
  options.help = "Seleziona la feature che vuoi mettere in relazione";
  base(this, options)
};

inherit(AddRelationStep, EditingStep);

module.exports = AddRelationStep;
