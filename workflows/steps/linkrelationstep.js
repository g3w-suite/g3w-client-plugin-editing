const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const t = g3wsdk.core.i18n.tPlugin;
const EditingStep = require('./editingstep');
const LinkRelationTask = require('./tasks/linkrelationtask');

const LinkRelationStep = function(options) {
  options = options || {};
  options.task = new LinkRelationTask();
  options.help = t("editing.steps.help.select_feature_to_relation");
  base(this, options)
};

inherit(LinkRelationStep, EditingStep);

module.exports = LinkRelationStep;
