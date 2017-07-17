var base = g3wsdk.core.utils.base;
var inherit = g3wsdk.core.utils.inherit;
var EditingComponent = require('./vue/editing');

function EditingPluginComponent(options) {
  options = options || {};
  // editortoolsbars
  options.id = "editing-panel";
  options.name = "Gestione dati EDITING";
  options.toolboxes = options.toolboxes || null;
  base(this, options)
}

inherit(EditingPluginComponent, EditingComponent);

module.exports = EditingPluginComponent;
