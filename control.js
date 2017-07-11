var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var G3WObject = g3wsdk.core.G3WObject;
var EditingService = require('./editingservice');

function EditingControl(editor) {
  base(this);
  // editor del Layer
  this._editor = options.editor;
  this._tools = options.tools;

  this.state = {
    loading: false,
    enabled: false,
    editing: {
      on: false,
      dirty: false
    }
  }
}
inherit(EditingControl, G3WObject);

var proto = EditingControl.prototype;

module.exports = EditingControl;
