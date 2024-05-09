<!-- ORIGINAL SOURCE: -->
<!-- vue/editing.html@v3.4 -->
<!-- vue/editing.js@v3.4 -->

<template>
  <div class="g3w-editing-panel">

    <bar-loader :loading="saving"/>

    <helpdiv v-if ="layersInEditing > 0" style="font-weight: bold" message="plugins.editing.close_editing_panel.message" />

    <!-- OFFLINE MESSAGE -->
    <div
      v-if  = "!appState.online"
      id    = "onlineofflinemessage"
      style = "
        margin-bottom: 5px;
        padding: 5px;
        border-radius: 3px;
        background-color: orange;
        color:white;
        font-weight: bold
      "
    >
      <div v-t-plugin="'editing.messages.offline'"></div>
    </div>

    <!-- COMMIT BAR -->
    <div
      v-if       = "showcommitbar"
      v-disabled = "saving"
      style      = "
        display: flex;
        justify-content: flex-end;
        margin-bottom: 5px;
      "
    >

      <!-- SAVE BUTTON -->
      <div
        style       = "margin-right: auto;"
        class       = "editing-button"
        @click.stop = "canCommit ? commit() : null"
        :class      = "{ 'enabled': canCommit }"
      >
        <span
          class  = "editing-icon"
          :class = "g3wtemplate.font['save']">
        </span>
      </div>

      <!-- UNDO BUTTON -->
      <div
        class       = "editing-button"
        @click.stop = "canUndo ? undo(): null"
        :class      = "{ 'enabled': canUndo }"
      >
        <span
          class     = "editing-icon"
          :class    = "g3wtemplate.font['arrow-left']">
        </span>
      </div>

      <!-- REDO BUTTON -->
      <div
        class       = "editing-button"
        @click.stop = "canRedo ? redo() : null"
        :class      = "{ 'enabled': canRedo }"
      >
        <span
          class  = "editing-icon"
          :class = "g3wtemplate.font['arrow-right']">
        </span>
      </div>

    </div>

    <div
      v-else
      style = "height: 10px;"
    ></div>

    <!-- LAYERS SELECT -->
    <selectlayers v-if="state.showselectlayers && state.toolboxes.length > 1" />

    <!-- TOOLBOXES -->
    <div id="toolboxes">
      <toolbox
        v-for               = "toolbox in state.toolboxes"
        :key                = "toolbox.id"
        :state              = "toolbox"
        :resourcesurl       = "resourcesurl"
        @setselectedtoolbox = "setSelectedToolbox"
        @starttoolbox       = "startToolBox"
        @stoptoolbox        = "stopToolBox"
        @savetoolbox        = "saveToolBox"
        @setactivetool      = "startActiveTool"
        @stopactivetool     = "stopActiveTool"
        @on-editing         = "updateLayersInEditing"
      />
    </div>

  </div>

</template>

<script>
  import ToolboxComponent             from './Toolbox.vue';
  import SelectEditingLayersComponent from './SelectEditingLayers.vue';
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
      };
    },

    components: {
      toolbox:      ToolboxComponent,
      selectlayers: SelectEditingLayersComponent,
    },

    transitions: {
      'addremovetransition': 'showhide'
    },

    methods: {

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
        this.service.undo();
      },

      redo() {
        this.service.redo();
      },

      /**
       * @param toolboxId
       */
      commit(toolboxId) {
        this.saving = true;
        this.service
          .commit({
            toolbox: this.service.getToolBoxById(toolboxId),
            modal: false,
          })
          .always(() => this.saving = false);
      },

      saveAll() {},

      /**
       * @param toolboxId
       */
      async startToolBox(toolboxId) {
        const toolbox = this._getToolBoxById(toolboxId);
        if (ApplicationState.online && toolbox.canEdit()) {
          //check if a dependency layer (in relation) has some changes not committed
          const dirtyId = toolbox.getDependencies()
            .find(id => this._getToolBoxById(id).isDirty());
          if (dirtyId) {
            //if there is a layer with not saved/committed changes ask before get start toolbox,
            //otherwise changes made on relation layers are not sync with current database state
            //example Joins 1:1 fields
            try      { await this.commitDirtyToolBoxes(dirtyId); }
            catch(e) { console.warn(e); }
          }
          toolbox
            .start()
        }
      },

      /**
       * @param toolboxId
       */
      stopToolBox(toolboxId) {
        const toolbox = this._getToolBoxById(toolboxId);
        if (toolbox.state.editing.history.commit) {
          this.service.commit().always(() => toolbox.stop());
        } else {
          toolbox.stop()
        }
      },

      /**
       * @param toolboxId
       */
      saveToolBox(toolboxId) {
        this._getToolBoxById(toolboxId).save();
      },

      /**
       * @param toolId
       * @param toolboxId
       * 
       * @private
       */
      _setActiveToolOfToolbooxSelected(toolId, toolboxId) {
        const toolbox                  = this._getToolBoxById(toolboxId);
        this.state.toolboxidactivetool = toolboxId;
        toolbox.setActiveTool(toolbox.getToolById(toolId));
      },

      /**
       * Start tool of toolbox
       * 
       * @param toolId
       * @param toolboxId
       */
      startActiveTool(toolId, toolboxId) {
        if (this.state.toolboxidactivetool && toolboxId !== this.state.toolboxidactivetool) {
          this
            ._checkDirtyToolBoxes(this.state.toolboxidactivetool)
            .then(toolbox => {
              if (toolbox) {
                toolbox.stopActiveTool();
              }
              this._setActiveToolOfToolbooxSelected(toolId, toolboxId);
            });
        } else {
          this._setActiveToolOfToolbooxSelected(toolId, toolboxId);
        }
      },

      /**
       * @param toolboxId
       */
      stopActiveTool(toolboxId) {
        this._getToolBoxById(toolboxId).stopActiveTool();
      },

      /**
       * @param toolboxId
       */
      async setSelectedToolbox(toolboxId) {
        const toolbox   = this._getToolBoxById(toolboxId);      // get toolbox by id
        const toolboxes = this.service.getToolBoxes(); // get all toolboxes
        const selected  = toolboxes.find(t => t.isSelected());  // check if exist already toolbox selected (first time)

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
       * @param toolboxId
       * 
       * @returns {*}
       * 
       * @private
       */
      _checkDirtyToolBoxes(toolboxId) {
        return this.commitDirtyToolBoxes(toolboxId);
      },

      /**
       * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
       * 
       * @param { string } layerId
       *
       * @returns { Promise<unknown> }
       * 
       * @since g3w-client-plugin-editing@v3.8.0
       */
      async commitDirtyToolBoxes(layerId) {
        const service = this.service;
        const toolbox = service.getToolBoxById(layerId);

        if (!toolbox.isDirty() || !toolbox.hasDependencies()) {
          return toolbox;
        }

        try {
          await promisify(service.commit({ toolbox }));
          return toolbox;
        } catch (e) {
          await promisify(toolbox.revert());
          toolbox
            .getDependencies()
            .forEach((layerId) => {
              if (service.getLayerById(layerId).getChildren().indexOf(layerId) !== -1) {
                service.getToolBoxById(layerId).revert();
              }
            });
          return Promise.reject(toolbox);
        }

      },

      /**
       * @param toolboxId
       * 
       * @returns {*}
       * 
       * @private
       */
      _getToolBoxById(toolboxId) {
        return this.service.getToolBoxById(toolboxId);
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
       * Called by Editing Panel on creation time
       * 
       * @since g3w-client-plugin-editing@v3.8.0
       */
      registerOnLineOffLineEvent() {
        // Array of object setter(as key), key to unby (as value)
        this.unByKeys = this.unByKeys || [];

        // in case of starting panel editing check if there arae some chenging pending
        // if true it have to commit chanhes on server and ulock all layers features temporary locked
        if (ApplicationState.online) {
          this.checkOfflineChanges({ unlock: true });
        }

        this.unByKeys.push({
          owner : ApplicationService,
          setter: 'offline',
          key: ApplicationService.onafter('offline', () => {})
        });

        this.unByKeys.push({
          owner : ApplicationService,
          setter: 'online',
          key: ApplicationService.onafter('online', () => this.checkOfflineChanges({ modal:false }).catch(e => GUI.notify.error(e)))
        });

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
        modal = true,
        unlock = false,
      } = {}) {
        return new Promise((resolve, reject) => {
          const changes = ApplicationService.getOfflineItem('EDITING_CHANGES');
          // if find changes offline previously
          if (!changes) {
            return;
          }
          const promises = [];
          const layerIds = [];
          //FORCE TO WAIT OTHERWISE STILL OFF LINE
          setTimeout(() => {
            for (const layerId in changes) {
              layerIds.push(layerId);
              const toolbox = this.service.getToolBoxById(layerId);
              const commitItems = changes[layerId];
              promises.push(this.service.commit({
                toolbox,
                commitItems,
                modal
              }))
            }

            $.when
              .apply(this.service, promises)
              .then(() =>resolve())
              .fail(error=>reject(error))
              .always(() =>{
                unlock && layerIds.forEach(layerId => {
                  this.service.getLayerById(layerId).unlock()
                });
                // always reset items to null
                ApplicationService.setOfflineItem('EDITING_CHANGES');
              })
          }, 1000)
        });
      },

    },

    computed: {

      message() {
        return "";
      },

      canCommit() {
        return (
          'default' === this.state.saveConfig.mode &&
          this.state.toolboxselected &&
          this.state.toolboxselected.state.editing.history.commit &&
          this.editingButtonsEnabled
        );
      },

      canUndo() {
        const canUndo = (
          this.state.toolboxselected &&
          this.state.toolboxselected.state.editing.history.undo &&
          this.editingButtonsEnabled
        );

        this.service.fireEvent('canUndo', canUndo);

        return canUndo;
      },

      canRedo() {
        const canRedo = (
          this.state.toolboxselected &&
          this.state.toolboxselected.state.editing.history.redo &&
          this.editingButtonsEnabled
        );

        this.service.fireEvent('canRedo', canRedo);

        return canRedo;
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
      }

    },

    created() {
      this.appState = ApplicationState;

      this.registerOnLineOffLineEvent();

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
     * Called on close editingpanel panel
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
          layers: [],
          fids: [],
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
              show: {loading: false}
            }
          }) :
          Promise.resolve();
        try {
          await promise;
        } catch(err) {}
      }

      this.state.featuresOnClose = {};

      this.service.getToolBoxes().forEach(toolbox => toolbox.resetDefault());

      // clear all unique values fields related to layer (after closing editing panel).
      this.state.uniqueFieldsValues = {};
    },

  };
</script>
