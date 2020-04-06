const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const GUI = g3wsdk.gui.GUI;
const tPlugin = g3wsdk.core.i18n.tPlugin;
const t = g3wsdk.core.i18n.t;
const EditingTask = require('./editingtask');

const Dialogs = {
  delete: {
    fnc: function(inputs, context) {
      let d = $.Deferred();
      const EditingService = require('../../../services/editingservice');
      const layer = inputs.layer;
      const layerId = layer.getId();
      const childRelations = layer.getChildren();
      const relationinediting = childRelations.length &&  EditingService._filterRelationsInEditing({
        layerId,
        relations: layer.getRelations().getArray()
      }).length > 0;

      GUI.dialog.confirm(`<h4>${tPlugin('editing.messages.delete_feature')}</h4>
                        <div style="font-size:1.2em;">${ relationinediting ?tPlugin('editing.messages.delete_feature_relations') : ''}</div>`, (result) => {
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
  const type = options.type || "default";
  this._dialog = Dialogs[type];
  base(this, options);
}

inherit(ConfirmTask, EditingTask);

const proto = ConfirmTask.prototype;

proto.run = function(inputs, context) {
  return this._dialog.fnc(inputs, context);
};

proto.stop = function() {
  return true;
};



module.exports = ConfirmTask;
