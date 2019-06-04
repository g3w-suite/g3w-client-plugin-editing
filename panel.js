const base = g3wsdk.core.utils.base;
const inherit = g3wsdk.core.utils.inherit;
const t = g3wsdk.core.i18n.tPlugin;
const EditingComponent = require('./vue/editing');

function EditingPanelComponent(options={}) {
  options.id = "editing-panel";
  options.title = t("editing.editing_data");
  options.name = "Gestione dati EDITING";
  options.toolboxes = options.toolboxes || null;
  base(this, options)
}

inherit(EditingPanelComponent, EditingComponent);

module.exports = EditingPanelComponent;


