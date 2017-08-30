var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var GUI = g3wsdk.gui.GUI;
var EditingTask = require('./editingtask');

var Messagges = {
  delete: "Vuoi eliminare l'elemento selezionato?",
  default: "Vuoi confermare l'azione eseguita?"
};

function ConfirmTask(options) {
  var self = this;
  var type = options.type || "default";
  this._message = Messagges[type];
  base(this, options);
}

inherit(ConfirmTask, EditingTask);

var proto = ConfirmTask.prototype;

// metodo eseguito all'avvio del tool
proto.run = function(inputs, context) {
  console.log('Confirm Feature Task run ....');
  var d = $.Deferred();
  // vado ad aggiungere la featurea alla sessione (parte temporanea)
  GUI.dialog.confirm(this._message, function(result) {
    if (result)
      d.resolve(inputs);
     else
      d.reject();
  });
  return d.promise()
};

// metodo eseguito alla disattivazione del tool
proto.stop = function(){
  return true;
};



module.exports = ConfirmTask;