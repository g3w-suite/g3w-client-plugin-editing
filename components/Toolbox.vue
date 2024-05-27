<!-- ORIGINAL SOURCE: -->
<!-- vue/components/toolbox.html@v3.4 -->
<!-- vue/components/toolbox.js@v3.4 -->

<template>
  <div
    v-show = "state.show"
    class  = "toolbox"
  >
    <div
      :id    = "'id_toolbox_' + state.id"
    >

      <div
        @click.stop = "select"
        class       = "panel"
        :class      = "{
          'mobile':          isMobile(),
          'toolboxselected': state.selected,
          'toolboxactive':   state.editing.on,
        }"
      >

        <!-- LOADING BAR -->
        <div class="bar-loader" v-show="!isLayerReady"></div>

        <div
          v-if   = "state.toolboxheader"
          class  = "panel-heading container"
          :style = "{ background: state.color}"
        >

          <!-- TOGGLE RELATION LAYERS (LAYERS FILTER) -->
          <i
            v-if                     = "father"
            :class                   = "'filter-by-relation ' + g3wtemplate.font['relation']"
            @click                   = "toggleFilterByRelation"
            v-t-tooltip:right.create = "'plugins.editing.tooltip.filter_by_relation'"
          ></i>

          <!-- PANEL TITLE -->
          <span class="panel-title">{{ state.title }}</span>

          <!-- TOGGLE EDITING -->
          <i
            v-disabled              = "editDisabled"
            @click.stop             = "toggleEditing"
            class                   = "start-editing editbtn skin-tooltip-left"
            :class                  = "{
              'pull-right':       !isMobile(),
              'enabled':          isLayerReady,
              'g3w-icon-toggled': state.editing.on,
              [g3wtemplate.font[state.editing.on ? 'checkmark' : 'pencil']]: true
            }"
            v-t-tooltip:left.create = "'plugins.editing.tooltip.edit_layer'"
          ></i>

        </div>

        <bar-loader :loading="loading" />

        <div
          v-if = "!state.changingtools && state.editing.on"
          class  = "panel-body"
          v-disabled = "(!isLayerReady || !canEdit) "
        >
          <!-- HAS RELATION -->
          <div v-if="hasRelations" class="has-relations">
            <i :class="g3wtemplate.font['info']"></i>
            <span v-t-plugin="'editing.messages.toolbox_has_relation'"></span>
            <divider/>
          </div>

          <!-- MESSAGE -->
          <div v-if="state.message" style="color: #000">
            <div class="text-justify" v-t-plugin="state.message"></div>
            <divider/>
          </div>

          <!-- TOOLS -->
          <!-- ORIGINAL SOURCE: components/Tool.vue@v3.7.1 -->
          <div
            v-for  = "(row, i) in rows"
            :class = "`tools-content row${i}`"
          >
            <div
              v-for               = "tool in row"
              :key                = "tool.id"
              v-if                = "tool.visible"
              @click.prevent.stop = "tool.enabled && toggleTool(tool.active ? undefined : tool.id)"
              :class              = "{ editbtn: true, 'enabled' : tool.enabled, 'toggled' : tool.active }"
            >
              <img
                height           = "25"
                width            = "25"
                :src             = "resourcesurl + 'images/' + tool.icon"
                v-t-title:plugin = "`${tool.name}`"
              />
            </div>
          </div>

          <!-- MESSAGES -->
          <div
            :id   = "`id_toolbox_messages_${state.id}`"
            class = "message"
          >
            <transition name="fade">
              <!-- ORIGINAL SOURCE: components/ToolsOfTool.vue@v3.7.1 -->
              <div
                v-if = "showtoolsoftool"
                id   = "toolsoftoolcontainer"
              >
                <template v-for="tool in state.toolsoftool">

                  <!-- MEASURE TOOL -->
                  <!-- ORIGINAL SOURCE: components\ToolsOfToolMeasure.vue@v3.7.1 -->
                  <div
                    v-if  = "'measure' === tool.type"
                    class = "snap-tool"
                  >
                    <input
                      id      ="g3w_editing_show_measure_tool"
                      type    = "checkbox"
                      class   = "magic-checkbox snap_tools_of_tools"
                      v-model = "tool.options.checked"
                      @change = "() => tool.options.onChange(tool.options.checked)"
                    />
                    <label for="g3w_editing_show_measure_tool" v-t-tooltip:right.create="'plugins.editing.toolsoftool.measure'">
                      <b :class="g3wtemplate.font['measure']"></b>
                    </label>
                  </div>

                  <!-- SNAP TOOL -->
                  <component
                    v-else
                    :is      = "tool.type"
                    :options = "tool.options"
                  />
                  <divider />
                </template>
              </div>
            </transition>
            <div
              v-if       = "currenttoolhelpmessage"
              class      = "toolbox_help_message"
              v-t-plugin = "currenttoolhelpmessage"
            ></div>
          </div>

        </div>

      </div>

    </div>
  </div>
</template>

<script>
  import SnapComponent from './ToolsOfToolSnap.vue';

  export default {

    name: 'Toolbox',

    props: [
      'state',
      'resourcesurl'
    ],

    data() {
      return {
        active: false,
        currenttoolhelpmessage: null,
        toggled: false,
      };
    },

    components: {
      snap:    SnapComponent,
    },

    computed: {

      /**
       * @since g3w-client-plugin-editing@v3.7.0
       */
      editDisabled() {
        return this.state.loading && !this.state.startstopediting;
      },

      /**
       * @returns { boolean } whether current has related layer(s) (aka. layer relations / joins)
       *
       * @since g3w-client-plugin-editing@v3.7.0
       */
      hasRelations() {
        return this.state.editing.dependencies.length > 0;
      },

      /**
       * @returns { boolean|* }
       */
      loading() {
        return this.state.loading || this.state.changingtools;
      },

      /**
       * @returns Tools grouped by `tool.row`
       */
      rows() {
        return this.state.tools.reduce((rows, tool) => {
          rows[tool.row] = rows[tool.row] || [];
          rows[tool.row].push(tool);
          return rows;
        }, {});
      },

      /**
       * @returns { boolean }
       */
      canEdit() {
        return this.state.editing.canEdit;
      },

      /**
       * @returns { boolean }
       */
      father() {
        return this.state.editing.father && !!this.state.editing.dependencies.length;
      },

      /**
       * @returns { boolean }
       */
      showtoolsoftool() {
        return !!this.state.toolsoftool.length;
      },

      /**
       * @returns { Promise }
       */
      isLayerReady() {
        return this.state.layerstate.editing.ready;
      },

    },

    methods: {

      /**
       * @fires setselectedtoolbox
       */
      select() {
        if (this.isLayerReady && !this.state.selected) {
          this.$emit('setselectedtoolbox', this.state.id);
        }
      },

      /**
       * @fires stoptoolbox
       * @fires starttoolbox
       */
      toggleEditing() {
        this.select();
        if (this.state.layerstate.editing.ready && !this.state.loading) {
          this.$emit(this.state.editing.on ? 'stoptoolbox' : 'starttoolbox', this.state.id);
        }
      },

      /**
       * @fires savetoolbox
       */
      saveEdits() {
        this.$emit('savetoolbox', this.state.id);
      },

      /**
       * @fires setactivetool
       * @fires stopactivetool
       * 
       * @since g3w-client-plugin-editing@v3.8.0
       */
      toggleTool(toolId) {
        if (undefined !== toolId) {
          this.$emit('setactivetool', toolId, this.state.id);
        } else {
          this.$emit('stopactivetool', this.state.id);
        }
        this.select();
      },

      /**
       * @since g3w-client-plugin-editing@v3.8.0
       */
      toggleFilterByRelation() {
        this.toggled = !this.toggled;
        this.$emit('update-filter-layers', this.toggled ? [this.state.id, ...this.state.editing.dependencies]: []);
      },

    },

    watch: {

      async 'state.activetool'(tool) {
        await this.$nextTick();
        this.currenttoolhelpmessage = tool && tool.getHelpMessage();
      },

      /**
       * Watch toolbox in editing state
       * 
       * @fires on-editing
       */
      'state.editing.on'(bool) {
        this.$emit('on-editing', bool);
      },

      'state.toolsoftool'(newTools, oldTools) {
        console.log(newTools, oldTools,newTools.length, oldTools.length);
        if (!newTools.length) {
          oldTools.filter(t => 'measure' === t.type).forEach(t => t.options.onChange(false));
        }
      },

    },

    /**
     * @fires canEdit
     */
    created() {
      this.$emit('canEdit', { id: this.state.id });
    },

    async mounted() {
      // wait a little bit so others plugin can change things in toolbox
      // (ex. tools visibility which differs from default behaviour)
      await this.$nextTick();
    },

  };
</script>

<style scoped>
  .toolbox {
    padding-bottom: 5px;
  }
  .panel {
    margin-bottom: 8px;
  }
  .panel-heading {
    width:100%;
  }
  .panel:not(.toolboxselected) .has-relations {
    opacity: .4;
  }
  .panel:not(.toolboxactive) .panel-heading {
    border-radius: 3px;
    filter: grayscale(.8);
  }
  .editbtn.start-editing {
    padding: 13px;
    color: currentColor !important;
    font-size: 1.1em;
    margin: 0px;
  }
  .panel-title {
    padding: 8px 0;
    display: inline-block;
  }
  #toolsoftoolcontainer {
    display: flex;
    flex-direction: column;
    margin: 5px;
    padding: 5px;
    border-radius: 5px;
  }
  .has-relations {
    color: #000;
  }
  .has-relations > i {
    color: #007bff;
    padding-right: 2px
  }
  .filter-by-relation {
    margin-right:5px;
    cursor:pointer;
    color: currentColor !important;
  }
  .tools-content {
    display: flex;
    flex-wrap: wrap;
  }
  .message {
    margin-top: 5px;
  }
  .snap-tool {
    display: flex;
  }
  .snap-tool label > b {
    color: #222d32 !important;
  }
</style>
