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
          'toolboxselected': state.selected
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

          <!-- CHILD DEPENDENCIES -->
          <div
            v-if  = "father"
            style = "margin-right:5px; cursor:pointer;"
            class = "pull-left enabled dropdown"
          >
            <span :class="g3wtemplate.font['relation']"></span>
            <div
              class = "dropdown-content skin-background-color"
              style = "padding: 5px; border-radius: 3px;"
            >
              <div
                v-for = "dependency in state.editing.dependencies"
                style = "font-weight: bold"
              >{{ dependency }}</div>
            </div>
          </div>

          <!-- PANEL TITLE -->
          <div
            class          = "panel-title"
            :class         = "[father ? 'col-md-6' : 'col-md-8']"
            v-t-plugin:pre = "'editing.toolbox.title'"
          >{{ state.title }}</div>

          <!-- TOGGLE BUTTON -->
          <div
            v-disabled       = "editDisabled"
            data-placement   = "left"
            data-toggle      = "tooltip"
            ref              = "editingbutton"
            @click.stop      = "toggleEditing"
            class            = "start-editing editbtn skin-tooltip-left"
            :class           = "{
              'pull-right': !isMobile(),
              'enabled': isLayerReady,
              'g3w-icon-toggled': state.editing.on,
            }"
            v-t-title:plugin = "edit_layer_tooltip"
          >
            <span
              style  = "font-size: 1.1em; padding: 5px; !important;"
              :class = "g3wtemplate.font['pencil']">
            </span>
          </div>

        </div>

        <bar-loader :loading="loading" />

        <div
          v-show = "!state.changingtools"
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
          <div
            v-if  = "state.message"
            style = "color: #000"
          >
            <div
              class      = "text-justify"
              v-t-plugin = "state.message">
            </div>

            <divider/>

          </div>

          <!-- TOOLS CONTENT (1) -->
          <div
            class = "tools-content row1"
            style = "display: flex; flex-wrap: wrap;"
          >
            <tool
              v-for           = "toolstate in toolsrow1"
              :key            = "toolstate.id"
              :state          = "toolstate"
              :resourcesurl   = "resourcesurl"
              @stopactivetool = "stopActiveTool"
              @setactivetool  = "setActiveTool"
            />
          </div>

          <!-- TOOLS CONTENT (2) -->
          <div
            class = "tools-content row2"
            style = "display: flex; flex-wrap: wrap;"
          >
            <tool
              v-for           = "toolstate in toolsrow2"
              :key            = "toolstate.id"
              :state          = "toolstate"
              :resourcesurl   = "resourcesurl"
              @stopactivetool = "stopActiveTool"
              @setactivetool  = "setActiveTool"
            />
          </div>

          <!-- TOOLS CONTENT (3) -->
          <div
            class = "tools-content row3"
            style = "display: flex; flex-wrap: wrap;"
          >
            <tool
              v-for           = "toolstate in toolsrow3"
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
              <toolsoftool
                v-if   = "showtoolsoftool"
                :tools = "state.toolsoftool"
              />
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
  import ToolComponent        from './Tool.vue';
  import ToolsOfToolComponent from './ToolsOfTool.vue';

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
      };
    },

    components: {
      'tool':        ToolComponent,
      'toolsoftool': ToolsOfToolComponent
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
       * @FIXME add description
       * @return {*}
       */
      toolsrow1() {
        return this.state.tools.filter(t => t.row === 1);
      },

      /**
       * @FIXME add description
       * @return {*}
       */
      toolsrow2() {
        return this.state.tools.filter(t => t.row === 2);
      },

      /**
       * @FIXME add description
       * @return {*}
       */
      toolsrow3() {
        return this.state.tools.filter(t => t.row === 3);
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
      this.edit_layer_tooltip = 'editing.tooltip.edit_layer';
      this.$emit('canEdit', { id: this.state.id });
    },

    async mounted() {
      // wait a little bit so others plugin can change things in toolbox
      // (ex. tools visibility which differs from default behaviour)
      await this.$nextTick();

      $(this.$refs.editingbutton).tooltip();
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
</style>
