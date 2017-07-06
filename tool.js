var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var resolve = g3wsdk.core.utils.resolve;
var G3WObject = require('core/g3wobject');

function EditingTool(options){
  base(this);
  options = options || {};

  this._editor = options.editor;
  this._session = options.session;
  this._op = options.op;

  this.state = {
    id: options.id,
    name: options.name,
    enabled: false,
    started: false,
    icon: options.icon
  };
}
inherit(EditingTool, G3WObject);

var proto = EditingTool.prototype;

proto.getId = function() {
  return this.state.id;
};

proto.getName = function() {
  return this.state.name;
};

proto.start = function() {
  if (this._op) {
    var layer = this._editor.getLayer();
    return this._op.start(layer, {
      session: this._session
    });
  }
};

proto.stop = function() {
  if (this._op) {
    return this._op.stop();
  }
};

module.exports = EditingTool;