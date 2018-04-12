var base = g3wsdk.core.utils.base;
var inherit = g3wsdk.core.utils.inherit;
var i18nService = g3wsdk.core.i18n;
var EditingComponent = require('./vue/editing');

function EditingPanelComponent(options) {
  options = options || {};
  // editortoolsbars
  options.id = "editing-panel";
  options.title = i18nService.t("editing_data");
  options.name = "Gestione dati EDITING";
  options.toolboxes = options.toolboxes || null;
  base(this, options)
}

inherit(EditingPanelComponent, EditingComponent);

module.exports = EditingPanelComponent;


