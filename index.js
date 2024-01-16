import pluginConfig from './config';

const {
  base,
  inherit
}                           = g3wsdk.core.utils;
const { Plugin:BasePlugin } = g3wsdk.core.plugin;
const { GUI }               = g3wsdk.gui;

const Service               = require('./services/editingservice');
const EditingPanel          = require('./panel');

const Plugin = function() {

  base(this, {
    name: 'editing',
    i18n: pluginConfig.i18n,
    service: Service,
    version: pluginConfig.version,
    fontClasses: [
      {
        name: 'measure',
        className: "fas fa-ruler-combined"
      },
      {
        name: 'magnete',
        className: "fas fa-magnet"
      },
      {
        name: 'clipboard',
        className: "fas fa-clipboard"
      }
    ]
  });
  const pluginGroupTool = {
    position: 0,
    title: 'EDITING'
  };
  const show_errors = {
    some_layers: false
  };

  this.panel = null; // editing panel reference

  // check if exist any layer to edit
  if (this.service.loadPlugin()) {
    this.setHookLoading({
      loading: true
    });
    this.service.once('ready', () => {
      //plugin registry
      if (this.registerPlugin(this.config.gid)) {
        if (GUI.isready) {
          this.setupGui();
        } else {
          GUI.on('ready', this.setupGui.bind(this));
        }
      }
      this.setHookLoading({ loading: false });
      this.setApi(this.service.getApi());
      this.setReady(true);
    });
    //inizialize service
    this.service.init(this.config);
  }

  //setup plugin interface
  this.setupGui = function() {
    if (false === this.config.visible) {
      return false;
    }
    this.config.name = this.config.name ||  "plugins.editing.editing_data";
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
          message: 'plugins.editing.errors.some_layers',
          closable: true
        });
        show_errors.some_layers = true;
      }
    } else {
      GUI.showUserMessage({
        type: 'alert',
        message: 'plugins.editing.errors.no_layers'
      })
    }
    return this.panel;
  };

  this.hideEditingPanel = function() {
    if (null !== this.panel) {
      GUI.closePanel();
      this.panel = null;
    }
  };

  this.unload = function() {
    this.hideEditingPanel();
    if (this.config.visible) {
      this.removeTools();
    }
    this.service.clear()
  }
};

inherit(Plugin, BasePlugin);

new Plugin;

