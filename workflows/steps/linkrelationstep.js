const {base, inherit} = g3wsdk.core.utils;
const EditingStep = require('./editingstep');
const LinkRelationTask = require('./tasks/linkrelationtask');

const LinkRelationStep = function(options={}) {
  options.task = new LinkRelationTask();
  options.help = "signaler_iim.steps.help.select_feature_to_relation";
  base(this, options)
};

inherit(LinkRelationStep, EditingStep);

module.exports = LinkRelationStep;
