import EditingVueComponent from './components/Editing.vue';

const {
  base,
  inherit,
  merge,
}                          = g3wsdk.core.utils;
const { GUI }              = g3wsdk.gui;
const { Component }        = g3wsdk.gui.vue;

const EditingService       = require('./services/editingservice');

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/g3w-editing-components/editing.js.js@3.6
 * ORIGINAL SOURCE: g3w-client-plugin-editing/g3w-editing-components/panel.js.js@3.6
 */
function EditingPanelComponent(options = {}) {

  // editortoolsbars
  options.id            = "editing-panel";
  options.title         = options.title || "plugins.editing.editing_data";
  options.name          = "Editing Layer";
  options.toolboxes     = options.toolboxes || null;
  options.showcommitbar = undefined !== options.showcommitbar ? options.showcommitbar : true;

  base(this, options);

  /**
   * @FIXME add description
   */
  this.vueComponent = EditingVueComponent;

  /**
   * @FIXME add description
   */
  this.name = undefined !== options.name ? options.name : 'Editing data';

  merge(this, options);

  /**
   * @FIXME add description
   */
  this._resourcesUrl = options.resourcesUrl || GUI.getResourcesUrl();

  /**
   * @FIXME add description
   */
  this._service = options.service || EditingService;

  const InternalComponent = Vue.extend(this.vueComponent);

  /**
   * @FIXME add description
   */
  this.internalComponent = new InternalComponent({
    service: this._service,
    data: () => {
      return {
        state:                 this._service.state,
        resourcesurl:          this._resourcesUrl,
        showcommitbar:         options.showcommitbar,
        editingButtonsEnabled: true,
      }
    }
  });

  /**
   * @FIXME add description
   */
  this.mount = function(parent) {
    return base(this, 'mount', parent, true)
  };

  /**
   * @FIXME add description
   */
  this.unmount = function() {
    const d = $.Deferred();
    this._service
      .stop()
      .finally(() => {
        this.unmount = function() { base(this, 'unmount').then(() => d.resolve()); };
        this.unmount();
      });
    return d.promise();
  };

}

inherit(EditingPanelComponent, Component);

module.exports = EditingPanelComponent;


