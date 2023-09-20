<!-- ORIGINAL SOURCE: -->
<!-- vue/components/toolsoftool/snap.html@v3.4 -->
<!-- vue/components/toolsoftool/snap.js@v3.4 -->

<template>
  <div
    style="
      display: flex;
      width: 100%;
      justify-content: space-between;
  ">

    <!-- SNAP TO LAYER -->
    <input
      type    = "checkbox"
      class   = "magic-checkbox snap_tools_of_tools"
      :id     = "id"
      v-model ="checked"
    >
    <label
      :for                     = "id"
      v-t-tooltip:right.create = "'plugins.editing.toolsoftool.snap'"
    >
      <span
        :class = "g3wtemplate.font['magnete']"
      ></span>
    </label>

    <!-- SNAP TO ALL LAYERS -->
    <template v-if="showSnapAll" >
      <input
        type    = "checkbox"
        class   = "magic-checkbox snap_tools_of_tools"
        :id     = "idAll"
        v-model = "checkedAll"
      >
      <label
        :for                    = "idAll"
        v-t-tooltip:left.create = "'plugins.editing.toolsoftool.snapall'"
      >
        <span
          :class = "g3wtemplate.font['magnete']"
        ></span>
        <span
          style  = "font-weight: bold;"
          :class = "g3wtemplate.font['layers']"
        ></span>
      </label>
    </template>

  </div>
</template>

<script>

  const { GUI }        = g3wsdk.gui;
  const { Layer }      = g3wsdk.core.layer;
  const mapService     = GUI.getService('map');
  const editingService = require('../services/editingservice');

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
        showSnapAll: false
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
        features.forEach(feature => this.features.remove(feature));
      },

      setShowSnapAll() {
        this.showSnapAll = !!this.vectorToolboxesEditingState.find(editing => editing.on);
        this.checkedAll  = this.showSnapAll ? this.checkedAll : false;
      },

      activeSnapInteraction() {
        if (snapInteraction) {
          mapService.removeInteraction(snapInteraction);
        }

        snapInteraction = null;

        // snap = true
        if (this.add) {
          snapInteraction = new ol.interaction.Snap({
            source:   !this.checkedAll && this.checked && this.options.source, // SNAP TO LAYER: get options source as props pass from toolbox
            features: this.checkedAll  && this.features                        // SNAP TO ALL:   get features
          });
          mapService.addInteraction(snapInteraction);
        }
      },

      enableSnapInteraction(bool) {
        if (bool) {
          this.activeSnapInteraction();
        } else if (snapInteraction) {
          mapService.removeInteraction(snapInteraction);
        }
      },

    },

    watch: {

      checked(bool) {
        this.options.checked = bool;
        this.activeSnapInteraction()
      },

      checkedAll(bool) {
        this.options.checkedAll = bool;
        this.activeSnapInteraction()
      },

      'options.active'(bool) {
        this.enableSnapInteraction(bool);
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

      editingService
        .getLayers()
        .forEach(layer => {
          const layerId = layer.getId();

          // skip not vertor layers (raster, alphanumerical..)
          if (Layer.LayerTypes.VECTOR !== layer.getType()) {
            return;
          }

          const toolbox = editingService.getToolBoxById(layerId);
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
  label span {
    color: #222d32 !important;
  }
</style>
