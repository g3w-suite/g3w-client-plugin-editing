var base = g3wsdk.core.utils.base;
var inherit = g3wsdk.core.utils.inherit;
var t = g3wsdk.core.i18n.tPlugin;
var EditingComponent = require('./vue/editing');

function EditingPanelComponent(options={}) {
  // editortoolsbars
  options.id = "editing-panel";
  options.title = t("editing.editing_data");
  options.name = "Gestione dati EDITING";
  options.toolboxes = options.toolboxes || null;
  base(this, options)
}

inherit(EditingPanelComponent, EditingComponent);

module.exports = EditingPanelComponent;


