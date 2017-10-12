var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var GUI = g3wsdk.gui.GUI;
var TableComponent = require('../../../table/vue/table');
var EditingTask = require('./editingtask');

function OpenTableTask(options) {

  options = options || {};
  // prefisso delle nuove  feature
  this._formIdPrefix = 'form_';
  this._isChild = false;
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
  this._isChild = context.isChild;
  var foreignKey = this._isChild ? context.excludeFields[0] :  null;
  // vado a recuperare i
  var layer = inputs.layer;
  var features = this._isChild ? layer.getSource().readFeatures() :  session.getFeaturesStore().readFeatures();
  GUI.showContent({
    content: new TableComponent({
      title: 'Edita ' + layer.getName(),
      features: features,
      promise: d,
      isrelation: self._isChild,
      headers: layer.getFieldsLabel(),
      context: context,
      inputs: inputs,
      fatherValue: context.fatherValue,
      foreignKey: foreignKey
    }),
    push: self._isChild,
    closable: false
  });
  return d.promise();
};

proto._generateFormId = function(layerName) {
  return this._formIdPrefix + layerName;
};


// metodo eseguito alla disattivazione del tool
proto.stop = function() {
  console.log('stop open table task ...');
  this._isChild ? GUI.popContent() : GUI.closeForm();
  return true;
};

module.exports = OpenTableTask;

