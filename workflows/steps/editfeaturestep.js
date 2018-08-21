var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var EditingStep = require('./editingstep');
var EditFeatureTask = require('./tasks/editattributestask');

var EditFeatureStep = function(options) {
  options = options || {};
  options.task = new EditFeatureTask();
  options.help = "editing.steps.help.show_edit_feature_form";
  base(this, options)
};

inherit(EditFeatureStep, EditingStep);

module.exports = EditFeatureStep;
