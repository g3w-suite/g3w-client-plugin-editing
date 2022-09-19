<!-- ORIGINAL SOURCE: -->
<!-- vue/components/toolbox.html@v3.4 -->
<!-- vue/components/toolbox.js@v3.4 -->

<template>
  <div class="toolbox" v-show="state.show">
    <div :class="{'disableddiv' : !isLayerReady || !canEdit }" :id="'id_toolbox_'+ state.id">
      <div @click="select" class="panel" style="margin-bottom: 8px;" :class="{'mobile': isMobile(), 'toolboxselected': state.selected }">
        <div v-show="!isLayerReady" class="bar-loader"></div>
        <div v-if="state.toolboxheader" class="panel-heading container" style="width:100%;" :style="{ background: state.color}">
          <div v-if="father" style="margin-right:5px; cursor:pointer;" class="pull-left enabled dropdown">
            <span :class="g3wtemplate.font['relation']"></span>
            <div class="dropdown-content skin-background-color" style="padding: 5px; border-radius: 3px;">
              <div v-for="dependency in state.editing.dependencies" style="font-weight: bold" >{{ dependency }}</div>
            </div>
          </div>
          <div class="panel-title" :class="[father ? 'col-md-6' : 'col-md-8']" v-t-plugin:pre="'editing.toolbox.title'">{{ state.title }}</div>
          <div v-disabled="!state.startstopediting" data-placement="left" data-toggle="tooltip" ref="editingbutton"
               @click.stop="toggleEditing"
               class="start-editing editbtn skin-tooltip-left"
               :class="{'pull-right': !isMobile(), 'enabled' : isLayerReady,  'g3w-icon-toggled' : state.editing.on}" v-t-title:plugin="edit_layer_tooltip">
            <span style="font-size: 1.1em; padding: 5px; !important;"  :class="g3wtemplate.font['pencil']"></span>
          </div>
        </div>
        <bar-loader :loading="state.loading || state.changingtools"></bar-loader>
        <div class="panel-body" v-show="!state.changingtools">
          <div class="tools-content row1" style="display: flex; flex-wrap: wrap;">
            <tool :state="toolstate" :resourcesurl="resourcesurl" @stopactivetool="stopActiveTool" @setactivetool="setActiveTool"
                  v-for="toolstate in  toolsrow1" :key="toolstate.id">
            </tool>
          </div>
          <div class="tools-content row2" style="display: flex; flex-wrap: wrap;">
            <tool :state="toolstate" :resourcesurl="resourcesurl" @stopactivetool="stopActiveTool" @setactivetool="setActiveTool"
              v-for="toolstate in toolsrow2" :key="toolstate.id">
            </tool>
          </div>
          <div class="tools-content row3" style="display: flex; flex-wrap: wrap;">
            <tool :state="toolstate" :resourcesurl="resourcesurl" @stopactivetool="stopActiveTool" @setactivetool="setActiveTool"
              v-for="toolstate in toolsrow3" :key="toolstate.id">
            </tool>
          </div>
          <div class="message" style="margin-top: 5px;" :id="'id_toolbox_messages_'+ state.id">
            <div v-html="state.message"></div>
            <transition name="fade">
              <toolsoftool v-if="showtoolsoftool" :tools="state.toolsoftool"></toolsoftool>
            </transition>
            <div v-if="currenttoolname" class="toolbox_help_message" v-t-plugin="currenttoolname"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  import ToolComponent from './Tool.vue';
  import ToolsOfToolComponent from './ToolsOfTool.vue';
  const ApplicationState = g3wsdk.core.ApplicationState;

  export default {
      name: 'Toolbox',
      props: ['state', 'resourcesurl'],
      data() {
        return {
          active: false,
          currenttoolname: null
        }
      },
      components: {
        'tool': ToolComponent,
        'toolsoftool': ToolsOfToolComponent
      },
      methods: {
        select() {
          if (!this.isLayerReady) return;
          if (!this.state.selected) this.$emit('setselectedtoolbox', this.state.id);
        },
        toggleEditing() {
          this.select();
          if (!this.state.layerstate.editing.ready || this.state.loading) return;
          this.state.editing.on ? this.$emit('stoptoolbox', this.state.id): this.$emit('starttoolbox', this.state.id);
        },
        saveEdits() {
          this.$emit('savetoolbox', this.state.id);
        },
        stopActiveTool() {
          this.$emit('stopactivetool', this.state.id);
        },
        setActiveTool(toolId) {
          this.$emit('setactivetool', toolId, this.state.id);
        }
      },
      computed: {
        toolsrow1(){
          return this.state.tools.filter(tool => tool.row === 1);
        },
        toolsrow2(){
          return this.state.tools.filter(tool => tool.row === 2);
        },
        toolsrow3(){
          return this.state.tools.filter(tool => tool.row === 3);
        },
        canEdit() {
          return this.state.editing.canEdit;
        },
        father() {
          return this.state.editing.father && !!this.state.editing.dependencies.length;
        },
        showtoolsoftool() {
          return !!this.state.toolsoftool.length;
        },
        isLayerReady() {
          return this.state.layerstate.editing.ready;
        }
      },
      created() {
        this.edit_layer_tooltip = 'editing.tooltip.edit_layer';
        this.$emit('canEdit', {
          id: this.state.id
        });
      },
      async mounted() {
        await this.$nextTick();
        $(this.$refs.editingbutton).tooltip();
        // is usefult to wait a little bit is some plugin or editing has to chenge some thing to the toolbox
        // ex. tools visibility etcc. different from default behaviour
      },
    watch: {
        async'state.activetool'(activetool){
          await this.$nextTick();
          this.currenttoolname = activetool && activetool.getName();
        }
       }
    };
</script>

<style scoped>
  .toolbox {
    padding-bottom: 5px;
  }
</style>
