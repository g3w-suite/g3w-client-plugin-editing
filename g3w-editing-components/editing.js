import EditingVueComponent from '../components/Editing.vue';
const {base, inherit, merge} = g3wsdk.core.utils;
const { GUI } = g3wsdk.gui;
const { Component } = g3wsdk.gui.vue;
const EditingService = require('../services/editingservice');

function PanelComponent(options={}) {
  base(this, options);
  this.vueComponent = EditingVueComponent;
  const { name='Editing data'} = options;
  this.name = name;
  merge(this, options);
  this._resourcesUrl = options.resourcesUrl || GUI.getResourcesUrl();
  this._service = options.service || EditingService;
  const InternalComponent = Vue.extend(this.vueComponent);
  this.internalComponent = new InternalComponent({
    service: this._service,
    data: () => {
      return {
        state: this._service.state,
        resourcesurl: this._resourcesUrl,
        showcommitbar: options.showcommitbar,
        editingButtonsEnabled: true
      }
    }
  });

  this.mount = function(parent) {
    return base(this, 'mount', parent, true)
  };

  this.unmount = function() {
    const d = $.Deferred();
    this._service.stop()
      .finally(() => {
        this.unmount = function() {
          base(this, 'unmount')
            .then(() => d.resolve());
        };
        this.unmount();
      });
    return d.promise();
  };
}

inherit(PanelComponent, Component);

module.exports = PanelComponent;


