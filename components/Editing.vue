<template>
  <div class="g3w-editing-panel">
    <div v-if="!appState.online" id="onlineofflinemessage" style="margin-bottom: 5px; padding: 5px; border-radius: 3px; background-color: orange; color:white; font-weight: bold">
      <div v-t-plugin="'editing.messages.offline'"></div>
    </div>
    <div v-if="showcommitbar" style="display: flex; margin-bottom: 5px">
      <div style="margin-right: auto;" class="editing-button" @click="canCommit ? commit(): null" :class="{'enabled' : canCommit }">
        <span class="editing-icon" :class="g3wtemplate.font['save']"></span>
      </div>
      <div class="editing-button " @click="canUndo ? undo(): null" :class="{'enabled' : canUndo }">
        <span class="editing-icon" :class="g3wtemplate.font['arrow-left']"></span>
      </div>
      <div class="editing-button "  @click="canRedo ? redo(): null" :class="{'enabled' : canRedo }">
        <span class="editing-icon" :class="g3wtemplate.font['arrow-right']"></span>
      </div>
    </div>
    <div v-else style="height: 10px;"></div>
    <selectlayers></selectlayers>
    <div id="toolboxes">
      <toolbox :state="toolbox" :resourcesurl="resourcesurl"
        @setselectedtoolbox="setSelectedToolbox"
        @starttoolbox="startToolBox"
        @stoptoolbox="stopToolBox"
        @savetoolbox="saveToolBox"
        @setactivetool="startActiveTool"
        @stopactivetool="stopActiveTool"
        v-for="toolbox in state.toolboxes" :key="toolbox.id">
      </toolbox>
    </div>
  </div>
</template>

<script>
  import ToolboxComponent from './Toolbox.vue';
  import SelectEditingLayersComponent from "./SelectEditingLayers.vue";
  const { GUI } = g3wsdk.gui;
  const { tPlugin:t } = g3wsdk.core.i18n;
  const { ApplicationState } = g3wsdk.core;

  export default {
      name: 'Editing',
      data: null,
      components: {
        toolbox: ToolboxComponent,
        selectlayers: SelectEditingLayersComponent
      },
      transitions: {'addremovetransition': 'showhide'},
      methods: {
        undo() {
          const session = this.state.toolboxselected.getSession();
          const undoItems = session.undo();
          this.$options.service.undoRelations(undoItems);
        },
        redo() {
          const session = this.state.toolboxselected.getSession();
          const redoItems = session.redo();
          this.$options.service.redoRelations(redoItems);
        },
        commit(toolboxId) {
          const toolbox = this.$options.service.getToolBoxById(toolboxId);
          this.$options.service.commit({
            toolbox
          })
        },
        saveAll() {},
        startToolBox(toolboxId) {
          const toolbox = this._getToolBoxById(toolboxId);
          ApplicationState.online && toolbox.canEdit() && toolbox.start();
        },
        stopToolBox(toolboxId) {
          const toolbox = this._getToolBoxById(toolboxId);
          if (toolbox.state.editing.history.commit) this.$options.service.commit().always(() => toolbox.stop());
          else toolbox.stop();
        },
        saveToolBox(toolboxId) {
          const toolbox = this._getToolBoxById(toolboxId);
          toolbox.save();
        },
        _setActiveToolOfToolbooxSelected(toolId, toolboxId) {
          const toolbox = this._getToolBoxById(toolboxId);
          this.state.toolboxidactivetool = toolboxId;
          const tool = toolbox.getToolById(toolId);
          toolbox.setActiveTool(tool);
        },
        // method to start tool of toolbox
        startActiveTool(toolId, toolboxId) {
          if (this.state.toolboxidactivetool && toolboxId !== this.state.toolboxidactivetool) {
            const dirtyToolBox = this.state.toolboxidactivetool;
            this._checkDirtyToolBoxes(dirtyToolBox)
              .then(toolbox => {
                toolbox && toolbox.stopActiveTool();
                this._setActiveToolOfToolbooxSelected(toolId, toolboxId);
              })
          } else this._setActiveToolOfToolbooxSelected(toolId, toolboxId);
        },
        stopActiveTool(toolboxId) {
          const toolbox = this._getToolBoxById(toolboxId);
          toolbox.stopActiveTool();
        },
        setSelectedToolbox(toolboxId) {
          const service = this.$options.service;
          const toolbox = this._getToolBoxById(toolboxId);
          const toolboxes = service.getToolBoxes();
          const toolboxSelected = toolboxes.find(toolbox => toolbox.isSelected());
          toolboxSelected && toolboxSelected.setSelected(false);
          toolbox.setSelected(true);
          this.state.toolboxselected = toolbox;
          if (toolbox.getDependencies().length) {
            this.state.message = "<div>\n" +
              t("editing.messages.change_toolbox_relation") + "\n" +
              "</div>"
          } else {
            this.state.message = null;
          }
        },
        _checkDirtyToolBoxes(toolboxId) {
          return this.$options.service.commitDirtyToolBoxes(toolboxId);
        },
        _getToolBoxById(toolboxId) {
          const service = this.$options.service;
          const toolbox = service.getToolBoxById(toolboxId);
          return toolbox;
        },
        _enableEditingButtons(bool) {
          this.editingButtonsEnabled = !bool;
        }
      },
      computed: {
        message() {
          const message = "";
          return message;
        },
        canCommit: function() {
          return this.$options.service.getSaveConfig().mode === 'default' && this.state.toolboxselected && this.state.toolboxselected.state.editing.history.commit && this.editingButtonsEnabled;
        },
        canUndo() {
          const toolbox = this.state.toolboxselected;
          const canUndo = toolbox &&  toolbox.state.editing.history.undo && this.editingButtonsEnabled;
          this.$options.service.fireEvent('canUndo', canUndo);
          return canUndo;
        },
        canRedo() {
          const toolbox = this.state.toolboxselected;
          const canRedo = toolbox && toolbox.state.editing.history.redo && this.editingButtonsEnabled;
          this.$options.service.fireEvent('canRedo', canRedo);
          return canRedo
        }
      },
      watch:{
        canCommit(bool) {
          this.$options.service.registerLeavePage(bool);
        }
      },
      created() {
        this.appState = ApplicationState;
        this.$options.service.registerOnLineOffLineEvent();
        GUI.closeContent();
        this.$options.service.setOpenEditingPanel(true);
        GUI.on('opencontent', this._enableEditingButtons);
        GUI.on('closeform', this._enableEditingButtons);
        GUI.on('closecontent', this._enableEditingButtons);
        GUI.getComponent('map').getService().seSelectionLayerVisible(false);
      },
      beforeDestroy() {
        this.$options.service.setOpenEditingPanel(false);
        GUI.off('opencontent', this._enableEditingButtons);
        GUI.off('closeform', this._enableEditingButtons);
        GUI.off('closecontent', this._enableEditingButtons);
        this.$options.service.unregisterOnLineOffLineEvent();
        GUI.getService('map').seSelectionLayerVisible(true);
        this.$options.service.fireEvent('closeeditingpanel');
        this.$options.service.onCloseEditingPanel();
      }
    };
</script>
