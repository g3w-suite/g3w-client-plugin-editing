var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
//prendo il plugin service di core
var PluginService = g3wsdk.core.plugin.PluginService;
var CatalogLayersStoresRegistry = g3wsdk.core.catalog.CatalogLayersStoresRegistry;
var Editor = g3wsdk.core.editor.Editor;
var ProjectsRegistry = g3wsdk.core.project.ProjectsRegistry;
var PluginConfig = require('./pluginconfig');

function EditingService() {

  var self = this;
  var options = {};
  base(this, options);

  // prendo tutti i layers del progetto corrente
  this.layers = CatalogLayersStoresRegistry.getLayers({
    EDITABLE: true
  });

}

var proto = EditingService.prototype;

proto.init = function(config) {
  // vado a settare l'url di editing aggiungendo l'id del
  // progetto essendo editng api generale
  //config.baseurl = config.baseurl + this.project.getId() + '/';
  this.config = config;
};

proto.addEditor = function(editor) {
  var editorControl = EditorControlFactory.build(editor);
  this._editorsControls.push(editorControl);
};

proto.getEditorsControls = function() {
  return this._editorsControls;
};

proto._cancelOrSave = function(){
  return resolve();
};

proto._stopEditing = function(){

};

inherit(EditingService, PluginService);

module.exports = new EditingService;