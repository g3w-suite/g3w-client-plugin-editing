import pluginConfig from './config';
const {base, inherit} = g3wsdk.core.utils;
const Plugin = g3wsdk.core.plugin.Plugin;
const GUI = g3wsdk.gui.GUI;
const Service = require('./services/editingservice');
const EditingPanel = require('./panel');
const addI18nPlugin = g3wsdk.core.i18n.addI18nPlugin;

const _Plugin = function() {
  base(this);
  const pluginGroupTool = {
    position: 0,
    title: 'EDITING'
  };
  const show_errors = {
    some_layers: false
  };
  this.name = 'signaler_iim';
  this.panel; // editing panel reference
  this.addFontClasses([
    {
      name: 'signaler',
      className: "far fa-clipboard"
    },
    {
      name: 'export_signaler',
      className: "far fa-arrow-alt-circle-down"
    },
    {
      name: 'signaler_iim_notes',
      className: "far fa-sticky-note"
    }
  ]);

  this.init = function() {
    // add i18n of the plugin
    addI18nPlugin({
      name: this.name,
      config: pluginConfig.i18n
    });
    this.setService(Service);
    this.config = this.getConfig();
    // check if exist any layer to edit
    if (this.service.loadPlugin()) {
      this.setHookLoading({
        loading: true
      });
      this.service.once('ready', () => {
        if (!GUI.isready) GUI.on('ready', this.setupGui.bind(this));
        else this.setupGui();
        this.setHookLoading({
          loading: false
        });
        const api = this.service.getApi();
        this.setApi(api);
        this.setReady(true);
      });
      //inizialize service
      this.service.init(this.config);
    }
  };
  //setup plugin interface
  this.setupGui = function() {
    if (this.config.visible === false) return false;
    this.config.name = this.config.name ||  "plugins.signaler_iim.editing_reports";
    this.addToolGroup(pluginGroupTool);
    this.addTools({
      action: this.showEditingPanel,
      offline: false,
      icon: 'pencil'
    }, pluginGroupTool)
  };

  //method to show editing panel
  this.showEditingPanel = function(options={}) {
    if (this.service.getLayers().length > 0) {
      this.panel = new EditingPanel(options);
      GUI.showPanel(this.panel);
      if (!show_errors.some_layers && this.service.getLayersInError()) {
        GUI.showUserMessage({
          type: 'warning',
          message: 'plugins.signaler_iim.errors.some_layers',
          closable: true
        });
        show_errors.some_layers = true;
      }
    } else {
      GUI.showUserMessage({
        type: 'alert',
        message: 'plugins.signaler_iim.errors.no_layers'
      })
    }
    return this.panel;
  };

  this.hideEditingPanel = function(options={}){
    this.panel && GUI.closePanel();
    this.panel = null;
  };

  this.load = function() {
    this.init();
  };

  this.unload = function() {
    this.panel = null;
    this.config.visible && this.removeTools();
    this.service.clear()
  }
};

inherit(_Plugin, Plugin);

(function(plugin){
  plugin.init();
})(new _Plugin);

