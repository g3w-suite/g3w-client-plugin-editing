var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var EditingStep = require('./editingstep');
var EditFeatureTask = require('./tasks/editattributestask');

var EditFeatureStep = function(options) {
  options = options || {};
  options.task = new EditFeatureTask();
  options.help = "Mosta il form della feature per poter editare gli attributi";
  base(this, options)
};

inherit(EditFeatureStep, EditingStep);

module.exports = EditFeatureStep;
