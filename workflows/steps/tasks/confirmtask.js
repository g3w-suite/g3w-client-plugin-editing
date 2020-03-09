const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const GUI = g3wsdk.gui.GUI;
const tPlugin = g3wsdk.core.i18n.tPlugin;
const t = g3wsdk.core.i18n.t;
const EditingTask = require('./editingtask');

// oggetto che contiene tutte le timpologie di dialog, confirm etc ...
let Dialogs = {
  delete: {
    fnc: function(inputs) {
      let d = $.Deferred();
      GUI.dialog.confirm(tPlugin("editing.messages.delete_feature"), function(result) {
        if (result) {
          d.resolve(inputs);
        } else
          d.reject(inputs);
      });
      return d.promise();
    }
  },
  commit: {
    fnc: function(inputs) {
      let d = $.Deferred();
      let close = inputs.close;
      const buttons = {
        SAVE: {
          label: t("save"),
          className: "btn-success",
          callback: function () {
            d.resolve(inputs);
          }
        },
        CANCEL: {
          label: close ? t("exitnosave") : t("annul"),
          className: close ? "btn-danger" : "btn-primary",
          callback: function () {
            d.reject();
          }
        }
      };
      if (close) {
        buttons.CLOSEMODAL = {
          label:  t("annul"),
          className: "btn-primary",
          callback: function () {
            dialog.modal('hide');
          }
        }
      }
      // NOW I HAVE TO IMPLEMENT WHAT HAPPEND ID NO ACTION HAPPEND
      const dialog = GUI.dialog.dialog({
        message: inputs.message,
        title: tPlugin("editing.messages.commit_feature") + " " +inputs.layer.getName() + "?",
        buttons
      });
      return d.promise()
    }
  }
};

function ConfirmTask(options = {}) {
  let type = options.type || "default";
  this._dialog = Dialogs[type];
  base(this, options);
}

inherit(ConfirmTask, EditingTask);

let proto = ConfirmTask.prototype;

// metodo eseguito all'avvio del tool
proto.run = function(inputs, context) {
  //console.log('Confirm Feature Task run ....');
  return this._dialog.fnc(inputs);
};

// metodo eseguito alla disattivazione del tool
proto.stop = function() {
  return true;
};



module.exports = ConfirmTask;
