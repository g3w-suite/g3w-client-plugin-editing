var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var EditingStep = require('./editingstep');
var MoveFeatureTask = require('./tasks/movefeaturettask');

var MoveFeatureStep = function(options) {
  options = options || {};
  options.task = new MoveFeatureTask();
  options.help = "Clicca su una feature per poterla muovere";
  base(this, options)
};

inherit(MoveFeatureStep, EditingStep);

module.exports = MoveFeatureStep;
