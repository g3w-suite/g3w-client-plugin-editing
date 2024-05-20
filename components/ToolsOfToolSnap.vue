<!-- ORIGINAL SOURCE: -->
<!-- vue/components/toolsoftool/snap.html@v3.4 -->
<!-- vue/components/toolsoftool/snap.js@v3.4 -->

<template>
  <div class="tools-of-tool-snap">

    <!-- SNAP TO LAYER -->
    <input
      type    = "checkbox"
      class   = "magic-checkbox snap_tools_of_tools"
      :id     = "id"
      v-model ="checked"
    />
    <label :for="id" v-t-tooltip:right.create="'plugins.editing.toolsoftool.snap'">
      <span :class="g3wtemplate.font['magnete']"></span>
    </label>

    <!-- SNAP TO ALL LAYERS -->
    <template v-if="showSnapAll" >
      <input
        type    = "checkbox"
        class   = "magic-checkbox snap_tools_of_tools"
        :id     = "idAll"
        v-model = "checkedAll"
      />
      <label :for="idAll" v-t-tooltip:left.create="'plugins.editing.toolsoftool.snapall'">
        <span :class="g3wtemplate.font['magnete']"></span>
        <b    :class="g3wtemplate.font['layers']"></b>
      </label>
    </template>

  </div>
</template>

<script>

  const { GUI }   = g3wsdk.gui;
  const { Layer } = g3wsdk.core.layer;

  let snapInteraction;

  export default {

    name: "snap",

    props: ['options'],

    data() {
      return {
        id:          `snap_${Date.now()}`,
        idAll:       `snap_${Date.now()}_all`,
        checked:     false,
        checkedAll:  false,
        showSnapAll: false,
      };
    },

    computed: {

      add() {
        return (this.checked || this.checkedAll) && this.options.active;
      },

    },

    methods: {

      addFeatures(features) {
        this.features.extend(features)
      },

      addFeature(feature) {
        this.addFeatures([feature]);
      },

      removeFeatures(features) {
        features.forEach(f => this.features.remove(f));
      },

      setShowSnapAll() {
        this.showSnapAll = !!this.vectorToolboxesEditingState.find(editing => editing.on);
        this.checkedAll  = this.showSnapAll ? this.checkedAll : false;
      },

      activeSnapInteraction() {
        const map = GUI.getService('map');

        if (snapInteraction) {
          map.removeInteraction(snapInteraction);
        }

        snapInteraction = null;

        // snap = true
        if (this.add) {
          snapInteraction = new ol.interaction.Snap({
            source:   !this.checkedAll && this.checked && this.options.source, // SNAP TO LAYER: get options source as props pass from toolbox
            features: this.checkedAll  && this.features                        // SNAP TO ALL:   get features
          });
          map.addInteraction(snapInteraction);
        }
      },

      /**
       * @param { boolean } active 
       */
      enableSnapInteraction(active) {
        if (active) {
          this.activeSnapInteraction();
        } else if (snapInteraction) {
          GUI.getService('map').removeInteraction(snapInteraction);
        }
      },

    },

    watch: {

      /**
       * @param { boolean } checked
       */
      checked(checked) {
        this.options.checked = checked;
        this.activeSnapInteraction()
      },

      /**
       * @param { boolean } checkedAll 
       */
      checkedAll(checkedAll) {
        this.options.checkedAll = checkedAll;
        this.activeSnapInteraction()
      },

      /**
       * @param { boolean } active 
       */
      'options.active'(active) {
        this.enableSnapInteraction(active);
      },

    },

    created() {

      /**
       * @FIXME add description
       */
      this.features = new ol.Collection();

      /**
       * @FIXME add description
       */
      this.sourcesAndEventsKeys = [];

      /**
       * editing toolboxes dependencies
       */
      this.vectorToolboxesEditingState = [];

      /**
       * unwatched function
       */
      this.unwatches = [];

      g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing')
        .getLayers()
        .forEach(layer => {
          const layerId = layer.getId();

          // skip not vertor layers (raster, alphanumerical..)
          if (Layer.LayerTypes.VECTOR !== layer.getType()) {
            return;
          }

          const toolbox = g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').getToolBoxById(layerId);
          const source  = toolbox.getLayer().getEditingSource();

          this.features.extend(source.readFeatures());

          this.sourcesAndEventsKeys.push({
            source,
            olKey:           source.getFeaturesCollection().on('add', evt => this.addFeature(evt.element)),
            settersAndKeys: {
              'addFeatures': source.onbefore('addFeatures', this.addFeatures),
              'addFeature':  source.onbefore('addFeature', this.addFeatures),
              'clear':       source.onbefore('clear', () => { this.removeFeatures(source.readFeatures()); })
            },
          });

          // SNAP TO ALL: check if current editing layer is not equal to `layerId`
          if (this.options.layerId !== layerId) {
            const editing = toolbox.getState().editing;
            this.unwatches.push(this.$watch(() => editing.on, this.setShowSnapAll));
            this.vectorToolboxesEditingState.push(editing);
          }
      });

      this.setShowSnapAll();
    },

    beforeDestroy() {

      // stops event listeners
      this
        .sourcesAndEventsKeys
        .forEach(d => {
          Object
            .keys(d.settersAndKeys)
            .forEach(event => { d.source.un(event, d.settersAndKeys[event]) });
          ol.Observable.unByKey(d.olKey)
        });
      this.unwatches.forEach(unwatch => unwatch());

      snapInteraction                  = null;
      this.unwatches                   = null;
      this.vectorToolboxesEditingState = null;
      this.sourcesAndEventsKeys        = null;
    },

  };
</script>

<style scoped>
  .tools-of-tool-snap {
    display: flex;
    width: 100%;
    justify-content: space-between;
  }
  label span {
    color: #222d32 !important;
  }
</style>
