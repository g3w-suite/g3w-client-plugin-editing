const {base, inherit} = g3wsdk.core.utils;
const EditingComponent = require('./vue/editing');

function EditingPanelComponent(options={}) {
  // editortoolsbars
  options.id = "editing-panel";
  options.title = options.title || "plugins.signaler_iim.editing_reports";
  options.name = "Editing Reports";
  options.toolboxes = options.toolboxes || null;
  options.showcommitbar = options.showcommitbar === undefined ? true : options.showcommitbar;
  base(this, options)
}

inherit(EditingPanelComponent, EditingComponent);

module.exports = EditingPanelComponent;


