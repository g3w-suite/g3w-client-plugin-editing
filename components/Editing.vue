<!-- ORIGINAL SOURCE: -->
<!-- vue/editing.html@v3.4 -->
<!-- vue/editing.js@v3.4 -->

<template>
  <div class = "g3w-editing-panel">

    <bar-loader :loading = "saving"/>

    <helpdiv
      v-if = "layersInEditing > 0"
      style = "font-weight: bold"
      message = "plugins.editing.close_editing_panel.message" />

    <!-- OFFLINE MESSAGE -->
    <div
      v-if  = "!appState.online"
      id    = "onlineofflinemessage"
    >
      <div v-t-plugin = "'editing.messages.offline'"></div>
    </div>

    <!-- COMMIT BAR -->
    <div
      v-if       = "showcommitbar"
      v-disabled = "saving"
      class      = "commitbar"
    >

      <!-- SAVE BUTTON -->
      <div @click.stop = "commit" :class = "['editing-button', (canCommit ? 'enabled' : '')]">
        <span :class = "['editing-icon', g3wtemplate.font['save']]"></span>
      </div>

      <!-- UNDO BUTTON -->
      <div @click.stop = "undo" :class = "['editing-button', (canUndo ? 'enabled': '')]">
        <span :class = "['editing-icon', g3wtemplate.font['arrow-left']]"></span>
      </div>

      <!-- REDO BUTTON -->
      <div @click.stop = "redo" :class = "['editing-button', (canRedo ? 'enabled' : '')]">
        <span :class = "['editing-icon', g3wtemplate.font['arrow-right']]"></span>
      </div>

    </div>

    <div
      v-else
      style = "height: 10px;"
    ></div>

    <!-- LAYERS SELECT -->
    <!-- ORIGINAL SOURCE: componentsSelectEditingLayers.vue@v3.7.1 -->
    <div
      v-if  = "state.showselectlayers && state.toolboxes.length > 1"
      id    = "g3w-select-editable-layers-content"
      class = "skin-color"
    >
      <label for = "g3w-select-editable-layers-to-show" v-t="'Layers'"></label>
      <select
        id        = "g3w-select-editable-layers-to-show"
        multiple  = "multiple"
        clear     = "true"
        ref       = "selectlayers"
        v-select2 = "'selectedlayers'"
      >
        <option
          v-for  = "editinglayer in editinglayers"
          :value = "editinglayer.id"
          :key   = "editinglayer.id"
        >{{ editinglayer.name }}</option>
      </select>
    </div>

    <!-- TOOLBOXES -->
    <div id="toolboxes">
      <toolbox
        v-for                 = "toolbox in state.toolboxes"
        :key                  = "toolbox.id"
        :state                = "toolbox"
        :resourcesurl         = "resourcesurl"
        @setselectedtoolbox   = "selectToolBox"
        @starttoolbox         = "startToolBox"
        @stoptoolbox          = "stopToolBox"
        @setactivetool        = "startTool"
        @stopactivetool       = "stopTool"
        @on-editing           = "updateLayersInEditing"
        @update-filter-layers = "updateFilterLayers"
      />
    </div>

    <p v-if = "django_admin_url"><a :href = "django_admin_url" target = "_blank">&#x1F512; Locked features</a></p>
    <p v-if = "filemanager_url"><a  :href = "filemanager_url"  target = "_blank">&#x1F4C2; File manager</a></p>

  </div>

</template>

<script>
  import ToolboxComponent             from './Toolbox.vue';
  import { promisify }                from '../utils/promisify';

  const { GUI }                         = g3wsdk.gui;
  const {
    ApplicationState,
    ApplicationService,
  }                                     = g3wsdk.core;
  const { CatalogLayersStoresRegistry } = g3wsdk.core.catalog;
  const { DataRouterService }           = g3wsdk.core.data;

  export default {

    name: 'Editing',

    data() {
      return {
        state:         this.$options.service.state,
        service:       this.$options.service,
        resourcesurl:  this.$options.resourcesurl,
        showcommitbar: this.$options.showcommitbar,
        saving:          false, // whether to show loading bar while committing to server (click on save disk icon)
        layersInEditing: 0, //@since 3.8.0 Number of layers in editing
        editingButtonsEnabled: true,
        /** @since g3w-client-plugin-editing@v3.8.0 */
        selectedlayers: [],
        /** @since g3w-client-plugin-editing@v3.8.0 */
        editinglayers: Object
          .entries(g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').getEditableLayers())
          .map(([id, layer]) => ({ id, name: layer.getName(), title: layer.getTitle() })),
        /** @since g3w-client-plugin-editing@v3.8.0 */
        activetool: null,
      };
    },

    components: {
      toolbox: ToolboxComponent,
    },

    transitions: {
      'addremovetransition': 'showhide'
    },

    methods: {

      /**
       *
        * @param layers
       */
      updateFilterLayers(layers = []) {
        if (layers.length > 0) {
          this._selectedlayers = this.selectedlayers;
          this.selectedlayers  = layers;
        } else {
          this.selectedlayers  = this._selectedlayers;
          this._selectedlayers = layers;
        }

        $(this.$refs.selectlayers).val(this.selectedlayers).trigger('change');
      },

      /**
       * Handle editing state of toolbox layer
       * 
       * @param bool
       * 
       * @since g3w-client-plugin-editing@v3.8.0
       */
      updateLayersInEditing(bool) {
        this.layersInEditing += bool ? 1 : -1;
      },

      undo() {
        if (this.canUndo) { this.service.undo() }
      },

      redo() {
        if (this.canRedo) { this.service.redo() }
      },

      /**
       * @param toolboxId
       */
      commit(toolboxId) {
        if (this.canCommit) {
          this.saving = true;
          this.service
            .commit({
              toolbox: this.service.getToolBoxById(toolboxId),
              modal:   false,
            })
            .always(() => this.saving = false);
        }
      },

      /**
       * @param toolboxId
       */
      async startToolBox(toolboxId) {
        const toolbox = this.service.getToolBoxById(toolboxId);
        // check if a dependency layer (in relation) has some changes not committed
        const layerId = ApplicationState.online && toolbox.getDependencies().find(id => this.service.getToolBoxById(id).isDirty());
        if (layerId) {
          await this.commit_dirty(layerId);
        }
        toolbox.start();
      },

      /**
       * @param toolboxId
       */
      async stopToolBox(toolboxId) {
        const toolbox = this.service.getToolBoxById(toolboxId);

        try {
          if (toolbox.state.editing.history.commit) {
            await promisify(this.service.commit());
          }
        } catch (e) {
          console.warn(e);
        }

        await toolbox.stop();

        // re-enable query map control
        const control = undefined === this.service.getToolBoxes().find(t => t.state.editing.on) && GUI.getService('map').getMapControlByType({ type: 'query' });
        if (control && !control.isToggled()) {
          control.toggle();
        }
      },

      /**
       * Start tool of toolbox
       * 
       * @param toolId
       * @param toolboxId
       */
      async startTool(toolId, toolboxId) {

        console.log(this);

        const toolbox = this.service.getToolBoxById(toolboxId);
        const enabled = this.activetool && toolboxId === this.activetool;

        if (!enabled && this.service.getToolBoxById(toolbox.getDependencies().find(id => id === this.activetool))) {
          await this.commit_dirty(this.activetool);
        }

        if (!enabled) {
          this.stopTool(this.activetool);
        }

        this.activetool = toolboxId;
        toolbox.setActiveTool(toolbox.getToolById(toolId));
      },

      /**
       * @param toolboxId
       */
      stopTool(toolboxId) {
        if (toolboxId) {
          this.service.getToolBoxById(toolboxId).stopActiveTool();
        }
      },

      /**
       * @param toolboxId
       */
      async selectToolBox(toolboxId) {
        const toolbox   = this.service.getToolBoxById(toolboxId); // get toolbox by id
        const toolboxes = this.service.getToolBoxes();            // get all toolboxes
        const selected  = toolboxes.find(t => t.isSelected());    // check if exist already toolbox selected (first time)

        // set already selected false
        if (selected) {
          selected.setSelected(false);
          selected.clearMessage();
        }

        // set the current selected toolbox to true
        toolbox.setSelected(true);

        this.state.toolboxselected = toolbox;
      },

      /**
       * Ensure pending (un-saved) changes are committed before start to edit another layer,
       * which could be in relation with current level (eg. Join 1:1) in order to prevent an
       * out-of-sync database state on remote QGIS server.
       * 
       * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
       * ORIGINAL SOURCE: g3w-client/src/core/editing/session.js@v3.9.1
       * 
       * @param { string } layerId
       *
       * @returns { Promise<unknown> }
       * 
       * @since g3w-client-plugin-editing@v3.8.0
       */
      async commit_dirty(layerId) {
        const toolbox = this.service.getToolBoxById(layerId);

        // commit changes
        try {
          if (toolbox.isDirty() && toolbox.hasDependencies()) {
            await promisify(this.service.commit({ toolbox }));
            console.info('[EDITING] committed dirty')
          }
        } catch (e) {
          // revert changes (clear history and session)
          try {
            [layerId]
              .concat(toolbox.getDependencies())
              .forEach((layerId, i) => {
                const toolbox = this.service.getToolBoxById(layerId);
                const layer   = toolbox.getLayer();
                const editor  = layer.getEditor();
                if (i === 0 || -1 !== layer.getChildren().indexOf(layerId)) {
                  editor.getEditingSource().setFeatures((editor.readFeatures() || []).map(f => f.clone()));
                  toolbox.getSession().getHistory().clear();
                  toolbox.getSession().stop();
                  toolbox.stopActiveTool();
                }
              });
            console.info('[EDITING] reverted dirty');
          } catch (e) {
            console.warn(e);
          }
        }

      },

      /**
       * @param bool
       * 
       * @private
       */
      _enableEditingButtons(bool) {
        this.editingButtonsEnabled = !bool;
      },

      /**
       * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
       * 
       * Check if alread have off lines changes
       *
       * @param { Object }  opts
       * @param { boolean } [opts.modal=true]
       * @param { boolean } [opts.unlock=false]
       *
       * @returns { Promise<unknown> }
       * 
       * @since g3w-client-plugin-editing@v3.8.0
       */
      checkOfflineChanges({
        modal  = true,
        unlock = false,
      } = {}) {
        return new Promise((resolve, reject) => {
          const changes = ApplicationService.getOfflineItem('EDITING_CHANGES');
          // if find changes offline previously
          if (!changes) { return }

          const promises = [];
          const layerIds = [];
          //FORCE TO WAIT OTHERWISE STILL OFF LINE
          setTimeout(() => {
            for (const layerId in changes) {
              layerIds.push(layerId);
              const toolbox = this.service.getToolBoxById(layerId);
              const commitItems = changes[layerId];
              promises.push(this.service.commit({ toolbox, commitItems, modal }))
            }

            $.when
              .apply(this.service, promises)
              .then(resolve)
              .fail(e => { console.warn(e); reject(e) })
              .always(() => {
                if (unlock) {
                  layerIds.forEach(layerId => this.service.getLayerById(layerId).unlock());
                }
                // always reset items to null
                ApplicationService.setOfflineItem('EDITING_CHANGES');
              })
          }, 1000)
        });
      },

    },

    computed: {

      canCommit() {
        return (
          'default' === this.state.saveConfig.mode
          && this.state.toolboxselected
          && this.state.toolboxselected.state.editing.history.commit
          && this.editingButtonsEnabled
        );
      },

      canUndo() {
        const canUndo = (
          this.state.toolboxselected
          && this.state.toolboxselected.state.editing.history.undo
          && this.editingButtonsEnabled
        );

        this.service.fireEvent('canUndo', canUndo);

        return canUndo;
      },

      canRedo() {
        const canRedo = (
          this.state.toolboxselected
          && this.state.toolboxselected.state.editing.history.redo
          && this.editingButtonsEnabled
        );

        this.service.fireEvent('canRedo', canRedo);

        return canRedo;
      },

      django_admin_url() {
        const config = ApplicationService.getConfig();
        const user   = config.user;
        return user.is_superuser ? new URL('/django-admin/editing/g3weditingfeaturelock/', initConfig.baseurl) : false;
      },

      filemanager_url() {
        const config = ApplicationService.getConfig();
        const user   = config.user;
        return user.is_superuser ? new URL('/filemanager/', initConfig.baseurl) : false;
      },

    },

    watch:{

      canCommit(bool) {
        ApplicationService.registerLeavePage({ bool });
      },

      /**
       * @param { Number } n number of layer in editing
       * 
       * @since g3w-client-plugin-editing@v3.8.0
       */
      layersInEditing(n) {
        document.getElementsByClassName('close-pane-button')[0].classList[0 === n ? 'remove' : 'add']('g3w-disabled');
      },

      /**
       * ORIGINAL SOURCE: componentsSelectEditingLayers.vue@v3.7.1
       * 
       * @since g3w-client-plugin-editing@v3.8.0
       */
      selectedlayers(layers = []) {
        const has_layers = layers.length > 0;

        const service = g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing');

        this.editinglayers.forEach(({ id }) => {
          const toolbox     = service.getToolBoxById(id);
          const is_commit   = has_layers && toolbox.state.editing.history.commit;
          const is_selected = (-1 !== layers.indexOf(id));

          toolbox.setShow(has_layers ? is_selected : true);

          if (has_layers && !is_selected && is_commit) {
            service.commit({ toolbox }).always(() => toolbox.stop());
          }

          if (has_layers && !is_selected && !is_commit) {
            toolbox.stop();
          }

        });
      },

    },

    created() {

      this._selectedlayers = []; //store previous selected layers

      this.appState = ApplicationState;

      // Array of object setter(as key), key to unby (as value)
      this.unByKeys = this.unByKeys || [];

      // in case of starting panel editing check if there arae some chenging pending
      // if true it have to commit chanhes on server and ulock all layers features temporary locked
      if (ApplicationState.online) {
        this.checkOfflineChanges({ unlock: true });
      }

      // register "offline" event
      this.unByKeys.push({
        owner : ApplicationService,
        setter: 'offline',
        key:    ApplicationService.onafter('offline', () => {})
      });

      // register "online" event
      this.unByKeys.push({
        owner :  ApplicationService,
        setter: 'online',
        key:     ApplicationService.onafter('online', () => this.checkOfflineChanges({ modal: false }).catch(e => GUI.notify.error(e)))
      });

      GUI.closeContent();

      // open editing panel state
      this.state.open = false;
      CatalogLayersStoresRegistry.getLayers({ EDITABLE: true }).forEach(layer => layer.setInEditing(true));

      GUI.on('opencontent',  this._enableEditingButtons);
      GUI.on('closeform',    this._enableEditingButtons);
      GUI.on('closecontent', this._enableEditingButtons);
    },

    /**
     * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
     * 
     * Called on a close editing panel panel
     */
    async beforeDestroy() {
      this.service.stop();

      // reset editing panel state
      this.state.open = false;
      CatalogLayersStoresRegistry.getLayers({ EDITABLE: true }).forEach(layer => layer.setInEditing(false));

      GUI.off('opencontent',  this._enableEditingButtons);
      GUI.off('closeform',    this._enableEditingButtons);
      GUI.off('closecontent', this._enableEditingButtons);

      // unregister "online" and "offline" events
      this.unByKeys.forEach(({ owner, setter, key }) => owner.un(setter, key));

      this.service.fireEvent('closeeditingpanel');

      // Show feature that are updated or created with editing on result content
      const layerIdChanges = Object.keys(this.state.featuresOnClose);
      if (layerIdChanges.length) {
        const inputs = {
          layers:    [],
          fids:      [],
          formatter: 1
        };
        layerIdChanges
          .forEach(layerId => {
            const fids = [...this.state.featuresOnClose[layerId]];
            if (fids.length) {
              const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
              inputs.layers.push(layer);
              inputs.fids.push(fids);
            }
          });

        const promise = inputs.layers.length ?
          DataRouterService.getData('search:layersfids', {
            inputs,
            outputs: {
              title: 'plugins.editing.editing_changes',
              show:  { loading: false }
            }
          }) :
          Promise.resolve();
        try {
          await promise;
        } catch(e) { console.warn(e) }
      }

      this.state.featuresOnClose = {};

      this.service.getToolBoxes().forEach(toolbox => toolbox.resetDefault());

      // clear all unique values fields related to layer (after a closing editing panel).
      this.state.uniqueFieldsValues = {};

      // re-enable query map control
      const control = GUI.getService('map').getMapControlByType({ type: 'query' });
      if (control && !control.isToggled()) {
        control.toggle();
      }
    },

  };
</script>

<style>
  .g3w-editing-panel .editing-button .editing-icon {
    background-color: #3a4448;
    color: #222d32; /*@sidebar-dark-bg;*/
    font-size: 1.8em;
    padding: 10px;
    margin: 5px;
    width: 45px;
    height: 45px;
    border-radius: 30%;
    text-align: center;
  }
  .g3w-editing-panel .editing-button.enabled .editing-icon {
    background-color: #fff;
    box-shadow: 0 0 5px rgba(0,0,0,0.7);
  }
  .g3w-editing-panel .editing-button {
    cursor: not-allowed;
  }
  .g3w-editing-panel .editing-button.enabled {
    cursor: pointer;
  }
  .g3w-editing-panel .editbtn {
    border-radius: 30%;
    padding: 10px;
    display: inline-block;
    opacity: 0.4;
    box-shadow:
      0 1px 1px 0 rgba(0, 0, 0, 0.1),
      0 1px 4px 0 rgba(0, 0, 0, 0.3);
  }
  .g3w-editing-panel .editbtn.enabled {
    opacity: 1;
    cursor: pointer;
  }
  .g3w-editing-panel .editbtn.enabled.toggled {
    box-shadow: 0 0;
    background-color: #ddd;
  }
  </style>

  <style scoped>
  .g3w-editing-panel {
    margin-bottom: 50px;
  }

  #onlineofflinemessage {
    margin-bottom: 5px;
    padding: 5px;
    border-radius: 3px;
    background-color: orange;
    color:white;
    font-weight: bold
  }
  .commitbar {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 5px;
  }
  .commitbar > div:first-of-type {
    margin-right: auto;
  }
  #g3w-select-editable-layers-content {
    margin-bottom: 10px;
    font-weight: bold;
  }
  #g3w-select-editable-layers-content label {
    color: #fff !important;
  }
  #g3w-select-editable-layers-to-show {
    cursor: pointer;
  }
</style>