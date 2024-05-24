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
      :class = "{ 'disableddiv' : (!isLayerReady || !canEdit) }"
    >

      <div
        @click.stop = "select"
        class       = "panel"
        style       = "margin-bottom: 8px;"
        :class      = "{
          'mobile': isMobile(),
          'toolboxselected': state.selected,
          'toolboxactive': state.editing.on,
        }"
      >

        <div
          v-show = "!isLayerReady"
          class  = "bar-loader"
        ></div>

        <div
          v-if   = "state.toolboxheader"
          class  = "panel-heading container"
          style  = "width:100%;"
          :style = "{ background: state.color}"
        >

          <!-- TOGGLE RELATION LAYERS (LAYERS FILTER) -->
          <i
            v-if                     = "father"
            :class                   = "g3wtemplate.font['relation']"
            style                    = "margin-right:5px; cursor:pointer; color: currentColor !important;"
            @click                   = "toggleFilterByRelation"
            v-t-tooltip:right.create = "'plugins.editing.tooltip.filter_by_relation'"
          ></i>

          <!-- PANEL TITLE -->
          <span class="panel-title">{{ state.title }}</span>

          <!-- TOGGLE BUTTON -->
          <span
            v-disabled              = "editDisabled"
            @click.stop             = "toggleEditing"
            class                   = "start-editing editbtn skin-tooltip-left"
            :class                  = "{
              'pull-right':       !isMobile(),
              'enabled':          isLayerReady,
              'g3w-icon-toggled': state.editing.on,
            }"
            style                   = "color: currentColor !important;"
            v-t-tooltip:left.create = "'plugins.editing.tooltip.edit_layer'"
          >
            <span
              style  = "font-size: 1.1em; padding: 5px !important;"
              :class = "g3wtemplate.font[state.editing.on ? 'checkmark' : 'pencil']">
            </span>
          </span>

        </div>

        <bar-loader :loading="loading" />

        <div
          v-show = "!state.changingtools && state.editing.on"
          class  = "panel-body"
        >
          <!-- HAS RELATION -->
          <div
            v-if  = "hasRelations"
            class = "has-relations"
            style = "color: #000000"
          >
            <span
              :class = "g3wtemplate.font['info']"
              style  = "color: #007bff; padding-right: 2px">
            </span>
            <span v-t-plugin = "'editing.messages.toolbox_has_relation'"></span>

            <divider/>

          </div>

          <!-- MESSAGE -->
          <div v-if="state.message" style="color: #000">
            <div class="text-justify" v-t-plugin="state.message"></div>
            <divider/>
          </div>

          <!-- TOOLS -->
          <div
            v-for  = "(row, i) in rows"
            :class = "'tools-content row' + i"
            style  = "display: flex; flex-wrap: wrap;"
          >
            <tool
              v-for           = "toolstate in row"
              :key            = "toolstate.id"
              :state          = "toolstate"
              :resourcesurl   = "resourcesurl"
              @stopactivetool = "stopActiveTool"
              @setactivetool  = "setActiveTool"
            />
          </div>

          <!-- MESSAGES -->
          <div
            :id   = "`id_toolbox_messages_${state.id}`"
            class = "message"
            style = "margin-top: 5px;"
          >
            <transition name="fade">
              <!-- ORIGINAL SOURCE: components/ToolsOfTool.vue@v3.7.1 -->
              <div
                v-if = "showtoolsoftool"
                id   = "toolsoftoolcontainer"
              >
                <template v-for="tool in state.toolsoftool">
                  <component
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
  import ToolComponent    from './Tool.vue';
  import SnapComponent    from './ToolsOfToolSnap.vue';
  import MeasureComponent from './ToolsOfToolMeasure.vue';

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
      tool:    ToolComponent,
      snap:    SnapComponent,
      measure: MeasureComponent,
    },

    computed: {

      /**
       * @FIXME add description
       * @since g3w-client-plugin-editing@v3.7.0
       */
      editDisabled() {
        return this.state.loading && !this.state.startstopediting;
      },
      /**
       * @FIXME add description
       * @returns { boolean } whether current has related layer(s) (aka. layer relations / joins)
       *
       * @since g3w-client-plugin-editing@v3.7.0
       */
      hasRelations() {
        return this.state.editing.dependencies.length > 0;
      },

      /**
       * @FIXME add description
       * @return {boolean|*}
       */
      loading() {
        return this.state.loading || this.state.changingtools;
      },

      /**
       * Tools grouped by `tool.row`
       */
      rows() {
        return this.state.tools.reduce((rows, tool) => {
          rows[tool.row] = rows[tool.row] || [];
          rows[tool.row].push(tool);
          return rows;
        }, {});
      },

      /**
       * @FIXME add description
       * @return {boolean}
       */
      canEdit() {
        return this.state.editing.canEdit;
      },

      /**
       * @FIXME add description
       * @return {boolean}
       */
      father() {
        return this.state.editing.father && !!this.state.editing.dependencies.length;
      },
      /**
       * @FIXME add description
       * @return {boolean}
       */
      showtoolsoftool() {
        return !!this.state.toolsoftool.length;
      },
      /**
       * @FIXME add description
       * @return {Promise<Animation> | Promise<ServiceWorkerRegistration> | Promise<FontFaceSet> | Promise<undefined>}
       */
      isLayerReady() {
        return this.state.layerstate.editing.ready;
      },

    },

    methods: {

      /**
       * @FIXME add description
       */
      select() {
        if (this.isLayerReady && !this.state.selected) {
          this.$emit('setselectedtoolbox', this.state.id);
        }
      },

      /**
       * @FIXME add description
       */
      toggleEditing() {
        this.select();
        if (this.state.layerstate.editing.ready && !this.state.loading) {
          this.$emit(this.state.editing.on ? 'stoptoolbox' : 'starttoolbox', this.state.id);
        }
      },

      /**
       * @FIXME add description
       */
      saveEdits() {
        this.$emit('savetoolbox', this.state.id);
      },

      /**
       * @FIXME add description
       */
      stopActiveTool() {
        this.$emit('stopactivetool', this.state.id);
        this.select();
      },

      /**
       * @FIXME add description
       * @param toolId
       */
      setActiveTool(toolId) {
        this.$emit('setactivetool', toolId, this.state.id);
        this.select();
      },

      /**
       * @since g3w-client-plugin-editing@v3.8.0
       */
      toggleFilterByRelation() {
        this.toggled = !this.toggled;
        this.$emit('update-filter-layers', this.toggled ? [this.state.id, ...this.state.editing.dependencies]: []);
      }

    },

    watch: {

      async 'state.activetool'(activetool) {
        await this.$nextTick();
        this.currenttoolhelpmessage = activetool && activetool.getHelpMessage();
      },
      /**
       * Method to watch toolbox in editing state
       * @param bool
       */
      'state.editing.on'(bool) {
        this.$emit('on-editing', bool);
      }

    },

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
  .panel:not(.toolboxselected) .has-relations {
    opacity: .4;
  }
  .panel:not(.toolboxactive) .panel-heading {
    border-radius: 3px;
  }
  .editbtn.start-editing {
    padding: 8px;
    margin: 0;
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
</style>
