var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var EditingTask = require('./editingtask');

function OpenFormTask(options) {

  options = options || {};
  base(this, options);
}

inherit(OpenFormTask, EditingTask);

module.exports = OpenFormTask;

var proto = OpenFormTask.prototype;

// metodo eseguito all'avvio del tool
proto.run = function(inputs, context) {
  var self = this;
  var d = $.Deferred();
  console.log(inputs.feature);
  console.log('OpenTask task run.......');
  return d.promise();
};

// metodo eseguito alla disattivazione del tool
proto.stop = function() {
  console.log('stop openform task ...');
  return true;
};

