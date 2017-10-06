var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var GUI = g3wsdk.gui.GUI;
var TableComponent = require('../../../table/vue/table');
var EditingTask = require('./editingtask');

function OpenTableTask(options) {

  options = options || {};
  // prefisso delle nuove  feature
  this._formIdPrefix = 'form_';
  base(this, options);
}

inherit(OpenTableTask, EditingTask);

var proto = OpenTableTask.prototype;

// metodo eseguito all'avvio del tool
proto.run = function(inputs, context) {
  var self = this;
  console.log('Open Table Task task run.......');
  var d = $.Deferred();
  var session = context.session;
  // vado a recuperare i
  var layer = context.layer;
  layer.getFeatures()
    .then(function(promise) {
      promise.then(function(features) {
        GUI.showContent({
          content: new TableComponent({
            features: features,
            promise: d,
            headers: layer.getFieldsLabel(),
            context: context,
            inputs: inputs
          }),
          closable: false
        });
      })
    });

  //d.resolve()
  return d.promise();
};

proto._generateFormId = function(layerName) {
  return this._formIdPrefix + layerName;
};


// metodo eseguito alla disattivazione del tool
proto.stop = function() {
  console.log('stop open table task ...');
  GUI.closeForm();
  return true;
};

module.exports = OpenTableTask;

