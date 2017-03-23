var inherit = g3wsdk.core.utils.inherit;
var base = g3wsdk.core.utils.base;
var Plugin = g3wsdk.core.Plugin;
var GUI = g3wsdk.gui.GUI;
var Service = require('./pluginservice');
var EditingPanel = require('./panel');
var PluginRegistry = g3wsdk.core.ProjectsRegistry;

var _Plugin = function(){
  base(this);
  this.name = 'editing';
  this.project = PluginRegistry.getCurrentProject();
  this.layers = this.project.getLayers();
  this.layersConfig;
  var pluginLayers = [];
  this.init = function() {
    //setto il servizio
    this.setService(Service);
    //recupero configurazione del plugin
    this.config = this.getConfig();
    //regitro il plugin
    if (this.registerPlugin(this.config.gid)) {
      if (!GUI.ready) {
        GUI.on('ready',_.bind(this.setupGui, this));
      }
      else {
        this.setupGui();
      }
      //inizializzo il servizio.
      // Il servizio è l'istanza della classe servizio
      this.service.init(this.config);
      //vado a prelevare i layer name del plugin
      _.forEach(this.config.layers, function(value, name) {
        pluginLayers.push(name);
      });
      // filtro i layers del progetto con quelli del plugin
      this.layers = _.filter(this.layers, function(layer) {
        return pluginLayers.indexOf(layer.state.origname) > -1;
      });;
      // vado a creare la struttura dei layers per poter costruire il pannello di editing
      this.layersConfig =  this.service.createLayersConfig(this.layers);
    }
  };
  //metto su l'interfaccia del plugin
  this.setupGui = function(){
    var self = this;
    var toolsComponent = GUI.getComponent('tools');
    var toolsService = toolsComponent.getService();
    //add Tools (ordine, Nome gruppo, tools)
    toolsService.addTools(0, 'EDITING', [
      {
        name: "Editing dati",
        action: _.bind(self.showEditingPanel, this)
      }
    ])
  };
  
  this.showEditingPanel = function() {
    var panel = new EditingPanel({
      layersConfig: this.layersConfig
    });
    GUI.showPanel(panel);
    //inizializzo il servizio del pannello editing.
    //Il servizio è l'istanza della classe servizio
    panel.getService().init(this.config);
  }
};

inherit(_Plugin, Plugin);

(function(plugin){
  plugin.init();
})(new _Plugin);

