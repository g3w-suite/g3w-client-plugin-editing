<!-- ORIGINAL SOURCE: -->
<!-- vue/editing.html@v3.4 -->
<!-- vue/editing.js@v3.4 -->

<template>
  <div class="g3w-editing-panel">

    <bar-loader :loading="saving"/>

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
      />
    </div>

  </div>

</template>

<script>
  import ToolboxComponent             from './Toolbox.vue';
  import SelectEditingLayersComponent from './SelectEditingLayers.vue';

  const { GUI }              = g3wsdk.gui;
  const { ApplicationState } = g3wsdk.core;

  export default {

    name: 'Editing',

    data() {
      return {
        saving: false, // whether to show loading bar while committing to server (click on save disk icon)  
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

      undo() {
        this.$options.service.undo();
      },

      redo() {
        this.$options.service.redo();
      },

      /**
       * @param toolboxId
       */
      commit(toolboxId) {
        this.saving = true;
        this.$options.service
          .commit({
            toolbox: this.$options.service.getToolBoxById(toolboxId),
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
          //check if a dependency layer (in relation) has some changes not commietd
          const dirtyId = toolbox.getDependencies()
            .find(id => this._getToolBoxById(id).isDirty());
          if (dirtyId) {
            //if there is a layer with not saved/committed changes ask before get start toolbox
            //otherwise changes made on relation layers are not sync with current database state
            //example Joins 1:1 fields
            try      { await this.$options.service.commitDirtyToolBoxes(dirtyId); }
            catch(e) { console.warn(e); }
          }
          toolbox.start();
        }
      },

      /**
       * @param toolboxId
       */
      stopToolBox(toolboxId) {
        const toolbox = this._getToolBoxById(toolboxId);
        if (toolbox.state.editing.history.commit) {
          this.$options.service
            .commit()
            .always(() => toolbox.stop());
        } else {
          toolbox.stop();
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
        const toolboxes = this.$options.service.getToolBoxes(); // get all toolboxes
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
        return this.$options.service.commitDirtyToolBoxes(toolboxId);
      },

      /**
       * @param toolboxId
       * 
       * @returns {*}
       * 
       * @private
       */
      _getToolBoxById(toolboxId) {
        return this.$options.service.getToolBoxById(toolboxId);
      },

      /**
       * @param bool
       * 
       * @private
       */
      _enableEditingButtons(bool) {
        this.editingButtonsEnabled = !bool;
      },

    },

    computed: {

      message() {
        return "";
      },

      canCommit() {
        return (
          'default' === this.$options.service.getSaveConfig().mode &&
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

        this.$options.service.fireEvent('canUndo', canUndo);

        return canUndo;
      },

      canRedo() {
        const canRedo = (
          this.state.toolboxselected &&
          this.state.toolboxselected.state.editing.history.redo &&
          this.editingButtonsEnabled
        );

        this.$options.service.fireEvent('canRedo', canRedo);

        return canRedo;
      },

    },

    watch:{

      canCommit(bool) {
        this.$options.service.registerLeavePage(bool);
      },

    },

    created() {

      this.appState = ApplicationState;

      this.$options.service.registerOnLineOffLineEvent();

      GUI.closeContent();

      this.$options.service.setOpenEditingPanel(true);

      GUI.on('opencontent',  this._enableEditingButtons);
      GUI.on('closeform',    this._enableEditingButtons);
      GUI.on('closecontent', this._enableEditingButtons);
    },

    beforeDestroy() {
      this.$options.service.setOpenEditingPanel(false);

      GUI.off('opencontent',  this._enableEditingButtons);
      GUI.off('closeform',    this._enableEditingButtons);
      GUI.off('closecontent', this._enableEditingButtons);

      this.$options.service.unregisterOnLineOffLineEvent();

      this.$options.service.fireEvent('closeeditingpanel');

      this.$options.service.onCloseEditingPanel();
      this.$options.service.clearAllLayersUniqueFieldsValues();
    },

  };
</script>
