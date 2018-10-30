var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var EditingStep = require('./editingstep');
var LinkRelationTask = require('./tasks/linkrelationtask');

var LinkRelationStep = function(options) {
  options = options || {};
  options.task = new LinkRelationTask();
  options.help = "editing.steps.help.select_feature_to_relation";
  base(this, options)
};

inherit(LinkRelationStep, EditingStep);

module.exports = LinkRelationStep;
