const inherit = g3wsdk.core.utils.inherit;
const base = g3wsdk.core.utils.base;
const Plugin = g3wsdk.core.plugin.Plugin;
const GUI = g3wsdk.gui.GUI;
const i18nService = g3wsdk.core.i18n;
const Service = require('./services/editingservice');
const g3wediting = require('editing');

import {EditingPanelComponent as EditingPanel}  from './panel';

const _Plugin = function() {
  base(this);
  this.name = 'editing';
  this.init = function() {
    // inizializzo la variabile globale g3wediting
    window.g3wediting = g3wediting;
    //setto il servizio
    this.setService(Service);
    //recupero configurazione del plugin
    this.config = this.getConfig();
    // verifico se ci sono layer editabili
    if (this.service.loadPlugin()) {
      // inizializzo l'editing
     this.service.init(this.config);
      //regitro il plugin
      if (this.registerPlugin(this.config.gid)) {
        if (!GUI.ready) {
          GUI.on('ready',_.bind(this.setupGui, this));
        } else {
          this.setupGui();
        }
      }
    }
  };
  //metto su l'interfaccia del plugin
  this.setupGui = function() {
    if (_.isBoolean(this.config.visible) && !this.config.visible)
      return false;
    let self = this;
    let toolsComponent = GUI.getComponent('tools');
    let toolsService = toolsComponent.getService();
    //add Tools (ordine, Nome gruppo, tasks)
    toolsService.addTools(0, 'EDITING', [
      {
        name: i18nService.t("editing_data"),
        action: _.bind(self.showEditingPanel, this)
      }
    ])
  };

  //funzione che mostra il pannello dell'editing
  this.showEditingPanel = function() {
    const panel = new EditingPanel();
    GUI.showPanel(panel);
  };

  this.load = function() {
    this.init();
  }
};

inherit(_Plugin, Plugin);

(function(plugin){
  plugin.init();
})(new _Plugin);

