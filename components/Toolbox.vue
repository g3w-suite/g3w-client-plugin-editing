<!-- ORIGINAL SOURCE: -->
<!-- vue/components/toolbox.html@v3.4 -->
<!-- vue/components/toolbox.js@v3.4 -->

<template>
  <div
    :id    = "'id_toolbox_' + state.id"
    v-show = "state.show"
    class  = "toolbox"
  >

    <div
      @click.stop = "select"
      class       = "panel"
      :class      = "{
        'mobile':          isMobile(),
        'toolboxselected': state.selected,
        'toolboxactive':   state.editing.on && canEdit,
        'geolayer': state.layer.isGeoLayer(),
      }"
    >

      <!-- LOADING BAR -->
      <div v-show = "!isLayerReady" class = "bar-loader" ></div>

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
            [g3wtemplate.font[(state.editing.on || toggled.layer) ? 'checkmark' : 'pencil']]: true
          }"
          v-t-tooltip:left.create = "'plugins.editing.tooltip.edit_layer'"
        ></i>

      </div>

      <bar-loader :loading = "loading" />

      <div
        v-if       = "!state.changingtools && (state.editing.on || toggled.layer)"
        class      = "panel-body"
        v-disabled = "(!isLayerReady || !canEdit) "
      >

        <!-- HAS NO GEOMETRY -->
        <div v-if = "!state.layer.isGeoLayer()" class = "info">
          <i :class = "g3wtemplate.font['info']"></i>
          <span v-t-plugin = "'editing.messages.toolbox_has_no_geometry'"></span>
          <divider/>
        </div>

        <!-- HAS RELATION -->
        <div v-if="hasRelations" class="info">
          <i :class="g3wtemplate.font['info']"></i>
          <span v-t-plugin="'editing.messages.toolbox_has_relation'"></span>
          <divider/>
        </div>

        <!-- MESSAGE -->
        <div v-if = "state.message" style = "color: #000">
          <div class = "text-justify" v-t-plugin = "state.message"></div>
          <divider/>
        </div>

        <!-- TOOLS -->
        <!-- ORIGINAL SOURCE: components/Tool.vue@v3.7.1 -->
        <div class = "tools-content">
          <div
            v-for               = "tool in state.tools"
            :key                = "tool.id"
            v-if                = "tool.visible"
            @click.prevent.stop = "tool.enabled && toggleTool(tool.active ? undefined : tool.id)"
            :class              = "{ 'enabled' : tool.enabled, 'toggled' : tool.active, [`editbtn ${tool.id}`]: true }"
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
          <transition name = "fade">
            <!-- ORIGINAL SOURCE: components/ToolsOfTool.vue@v3.7.1 -->
            <div
              v-if = "showtoolsoftool"
              id   = "toolsoftoolcontainer"
            >
              <!-- ORIGINAL SOURCE: components\ToolsOfToolMeasure.vue@v3.7.1 -->
              <!-- ORIGINAL SOURCE: components\ToolsOfToolSnap.vue@v3.7.1 -->
              <template v-for = "tool in state.toolsoftool">

                <!-- MEASURE TOOL -->
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
                  <label for = "g3w_editing_show_measure_tool" v-t-tooltip:right.create = "'plugins.editing.toolsoftool.measure'">
                    <b :class = "g3wtemplate.font['measure']"></b>
                  </label>
                </div>

                <div
                  v-else-if = "'snap' === tool.type"
                  class     = "tools-of-tool-snap"
                >

                  <!-- SNAP TO LAYER -->
                  <input
                    type    = "checkbox"
                    class   = "magic-checkbox snap_tools_of_tools"
                    :id     = "`snap_${state.id}`"
                    v-model = "tool.options.checked"
                  />
                  <label :for = "`snap_${state.id}`" v-t-tooltip:right.create= " 'plugins.editing.toolsoftool.snap'">
                    <span :class = "g3wtemplate.font['magnete']"></span>
                  </label>

                  <!-- SNAP TO ALL LAYERS -->
                  <input
                    v-if    = "snapAll"
                    type    = "checkbox"
                    class   = "magic-checkbox snap_tools_of_tools"
                    :id     = "`snap_all_${state.id}`"
                    v-model = "tool.options.checkedAll"
                  />
                  <label
                    v-if                    = "snapAll"
                    :for                    = "`snap_all_${state.id}`"
                    v-t-tooltip:left.create = "'plugins.editing.toolsoftool.snapall'"
                  >
                    <span :class = "g3wtemplate.font['magnete']"></span>
                    <b    :class = "g3wtemplate.font['layers']"></b>
                  </label>

                </div>

                <divider />

              </template>

            </div>
          </transition>

          <!-- HELP MESSAGE (ENABLED TOOL) -->
          <div
            v-if       = "helpmessage"
            class      = "toolbox_help_message"
            v-t-plugin = "helpmessage"
          ></div>

        </div>

      </div>

    </div>

  </div>
</template>

<script>
  const { GUI }   = g3wsdk.gui;
  const { Layer } = g3wsdk.core.layer;

  let snapInteraction;

  export default {

    name: 'Toolbox',

    props: [
      'state',
      'resourcesurl'
    ],

    data() {
      return {
        active:      false,
        helpmessage: null,
        //@since 3.8.0
        toggled:     {
          relation: false, //click on relation icon
          layer:    false, //click on pencil icon
        },
        snapAll:     false,
      };
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
        return this.state.toolsoftool.length > 0;
      },

      /**
       * @returns { Promise }
       */
      isLayerReady() {
        return this.state.layer.state.editing.ready;
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
        this.toggled.layer = !(this.state.editing.on || this.toggled.layer);
        if (this.toggled.layer && this.state.layer.state.editing.ready && !this.state.loading) {
          this.$emit(this.state.editing.on ? 'stoptoolbox' : 'starttoolbox', this.state.id);
        }
        if (!this.toggled.layer) {
          this.$emit('stoptoolbox', this.state.id);
        }

      },

      /**
       * @fires setactivetool
       * @fires stopactivetool
       * 
       * @since g3w-client-plugin-editing@v3.8.0
       */
      toggleTool(toolId) {
        if (undefined === toolId) {
          this.$emit('stopactivetool', this.state.id);
        } else {
          this.$emit('setactivetool', toolId, this.state.id);
        }
        this.select();
      },

      /**
       * @since g3w-client-plugin-editing@v3.8.0
       */
      toggleFilterByRelation() {
        this.toggled.relation = !this.toggled.relation;
        this.$emit('update-filter-layers', this.toggled.relation ? [this.state.id, ...this.state.editing.dependencies]: []);
      },

      /**
       * ORIGINAL SOURCE: g3w-client-plugin-editing/components/ToolsOfToolSnap.vue@v3.7.1
       * 
       * @since g3w-client-plugin-editing@v3.8.0
       */
      _initSnap() {
        const tool = (this.state.toolsoftool || []).find(tool => 'snap' === tool.type);

        if (!tool) {
          return;
        }

        /**
         * @FIXME add description
         */
        this.snapFeatures = new ol.Collection();

        /**
         * @FIXME add description
         */
        this.snapEvents = [];

        /**
         * editing toolboxes dependencies
         */
        this.snapToolboxes = [];

        /**
         * unwatched function
         */
        this.snapUnwatches = [];

        this.$watch(() => tool.options.checked, () => this.activeSnapInteraction());
        this.$watch(() => tool.options.checkedAll, () => this.activeSnapInteraction());
        // Toggle snap interaction
        this.$watch(() => tool.options.active, () => {
          if (tool.options.active) {
            this.activeSnapInteraction();
          } else if (snapInteraction) {
            GUI.getService('map').removeInteraction(snapInteraction);
          }
        });

        g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing')
          .getLayers()
          .filter(layer => Layer.LayerTypes.VECTOR === layer.getType()) // skip raster, alphanumerical..
          .forEach(layer => {
            const toolbox = g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').getToolBoxById(layer.getId());
            const source  = toolbox.getLayer().getEditingSource();

            this.snapFeatures.extend(source.readFeatures());

            this.snapEvents.push({
              source,
              olKey:           source.getFeaturesCollection().on('add', evt => this.addSnapFeatures([evt.element])),
              settersAndKeys: {
                'addFeatures': source.onbefore('addFeatures', this.addSnapFeatures),
                'addFeature':  source.onbefore('addFeature', this.addSnapFeatures),
                'clear':       source.onbefore('clear', () => { source.readFeatures().forEach(f => this.snapFeatures.remove(f)); })
              },
            });

            // SNAP TO ALL: check if current editing layer is not equal to `layerId`
            if (tool.options.layerId !== layer.getId()) {
              const editing = toolbox.getState().editing;
              this.snapUnwatches.push(this.$watch(() => editing.on, this.setShowSnapAll));
              this.snapToolboxes.push(editing);
            }
        });

        this.setShowSnapAll();

      },

      /**
       * ORIGINAL SOURCE: g3w-client-plugin-editing/components/ToolsOfToolSnap.vue@v3.7.1
       * 
       * @since g3w-client-plugin-editing@v3.8.0
       */
      _unloadSnap() {
        if (!snapInteraction) { return }

        try {
          // stops event listeners
          this
            .snapEvents
            .forEach(d => {
              Object
                .keys(d.settersAndKeys)
                .forEach(event => { d.source.un(event, d.settersAndKeys[event]) });
              ol.Observable.unByKey(d.olKey)
            });
          this.snapUnwatches.forEach(unwatch => unwatch());

          snapInteraction    = null;

          this.snapUnwatches = null;
          this.snapToolboxes = null;
          this.snapEvents    = null;
        } catch (e) {
          console.warn(e);
        }
      },

      /**
       * ORIGINAL SOURCE: g3w-client-plugin-editing/components/ToolsOfToolSnap.vue@v3.7.1
       * 
       * @since g3w-client-plugin-editing@v3.8.0
       */
      addSnapFeatures(features) {
        this.snapFeatures.extend(features)
      },

      /**
       * ORIGINAL SOURCE: g3w-client-plugin-editing/components/ToolsOfToolSnap.vue@v3.7.1
       * 
       * @since g3w-client-plugin-editing@v3.8.0
       */
      setShowSnapAll() {
        const tool = (this.state.toolsoftool || []).find(tool => 'snap' === tool.type);
        if (tool) {
          this.snapAll            = !!this.snapToolboxes.find(editing => editing.on);
          tool.options.checkedAll = tool.options.showSnapAll ? tool.options.checkedAll : false;
        }
      },

      /**
       * ORIGINAL SOURCE: g3w-client-plugin-editing/components/ToolsOfToolSnap.vue@v3.7.1
       * 
       * @since g3w-client-plugin-editing@v3.8.0
       */
      activeSnapInteraction() {
        const map  = GUI.getService('map');
        const tool = (this.state.toolsoftool || []).find(tool => 'snap' === tool.type);

        if (snapInteraction) {
          map.removeInteraction(snapInteraction);
        }

        snapInteraction = null;

        // snap = true
        if ((tool.options.checked || tool.options.checkedAll) && tool.options.active) {
          snapInteraction = new ol.interaction.Snap({
            source:   !tool.options.checkedAll && tool.options.checked && tool.options.source, // SNAP TO LAYER: get options source as props pass from toolbox
            features: tool.options.checkedAll  && this.snapFeatures                        // SNAP TO ALL:   get features
          });
          map.addInteraction(snapInteraction);
        }
      },

    },

    watch: {

      async 'state.activetool'(tool) {
        await this.$nextTick();
        this.helpmessage = tool && (tool.messages.help || tool.name);
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
        if (!newTools.length) {
          oldTools.filter(t => 'measure' === t.type).forEach(t => t.options.onChange(false));
          this._unloadSnap();
        } else {
          this._initSnap();
        }
      },

    },

    /**
     * @fires canEdit
     */
    created() {
      this.$emit('canEdit', { id: this.state.id });
      // this._initSnap();
    },

    async mounted() {
      // wait a little bit so others plugin can change things in toolbox
      // (ex. tools visibility which differs from default behaviour)
      await this.$nextTick();
    },

    beforeDestroy() {
      this._unloadSnap();
    },

  };
</script>

<style scoped>
  .panel.mobile {
    margin-bottom: 5px;
  }
  .panel.mobile .panel-heading {
    display: flex;
    justify-content: space-between;
  }
  .panel.mobile .panel-heading .panel-title {
    margin-top: auto;
    margin-bottom: auto;
  }
  .panel.mobile .panel-heading .start-editing {
    margin: auto;
    margin-right: 0;
    padding: 6px;
  }
  .panel.mobile .tools-content .editbtn {
    padding: 9px;
  }
  .panel.mobile .toolbox .panel-body {
    padding: 5px !important;
  }
  .toolbox_help_message {
    font-weight: lighter;
  }
  .toolbox {
    padding-bottom: 5px;
  }
  .panel {
    border: 0 !important;
    margin-bottom: 8px;
  }
  .panel-heading {
    padding: 5px 10px 5px 10px;
    width:100%;
  }
  .toolboxselected {
    box-shadow: 0px 0px 0px 3px var(--skin-color);
  }
  .panel:not(.toolboxselected) .info {
    opacity: .4;
  }
  .panel:not(.toolboxactive) .panel-heading {
    border-radius: 3px;
    filter: grayscale(.8);
  }
  .panel:not(.geolayer) .panel-body {
    padding-top: 0;
  }
  .panel.toolboxactive:not(.geolayer) .editbtn.start-editing {
    color: #fff !important;
  }
  .panel:not(.geolayer) .panel-heading {
    color: #3a4448;
  }
  .editbtn.start-editing {
    padding: 13px;
    color: currentColor !important;
    font-size: 1.1em;
    margin: 0px;
  }
  .panel-title {
    font-weight: bold;
    word-break: break-word;
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
  .info {
    color: #000;
  }
  .info > i {
    color: #007bff;
    padding-right: 2px
  }
  .info + .tools-content {
    margin-top: 1em;
  }
  .filter-by-relation {
    margin-right:5px;
    cursor:pointer;
    color: currentColor !important;
  }
  .tools-content {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .message {
    margin-top: 5px;
    margin-bottom: 5px;
    font-size: 1.1em;
    color: #000;
    margin-top: 5px;
  }
  .snap-tool {
    display: flex;
  }
  .snap-tool label > b {
    color: #222d32 !important;
  }
  .tools-of-tool-snap {
    display: flex;
    width: 100%;
    justify-content: space-between;
  }
  .tools-of-tool-snap label span {
    color: #222d32 !important;
  }
</style>
