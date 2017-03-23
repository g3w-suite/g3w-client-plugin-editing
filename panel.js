var base = g3wsdk.core.utils.base;
var inherit = g3wsdk.core.utils.inherit;
var EditingComponent = g3wsdk.gui.vue.EditingComponent;

function EditingPluginComponent(options) {
  var options = options || {};
  var layerConfig = options.layersConfig;
  // editortoolsbars
  options.id = "editing-panel";
  options.name = "Gestione dati EDITING";
  options.serviceOptions = {
    layerCodes: layerConfig.layerCodes,
    layers: layerConfig.layers
  };
  base(this, options)
}

inherit(EditingPluginComponent, EditingComponent);

module.exports = EditingPluginComponent;
