<!-- ORIGINAL SOURCE: -->
<!-- vue/components/toolsoftool/snap.html@v3.4 -->
<!-- vue/components/toolsoftool/snap.js@v3.4 -->

<template>
  <div style="display: flex;width: 100%; justify-content: space-between">
    <input type="checkbox" class="magic-checkbox snap_tools_of_tools" :id="id" v-model="checked">
    <label :for="id" v-t-tooltip:right.create="'plugins.editing.toolsoftool.snap'">
      <span :class="g3wtemplate.font['magnete']" ></span>
    </label>
    <template v-if="showSnapAll" >
      <input type="checkbox" class="magic-checkbox snap_tools_of_tools" :id="idAll" v-model="checkedAll">
      <label :for="idAll" v-t-tooltip:left.create="'plugins.editing.toolsoftool.snapall'">
        <span :class="g3wtemplate.font['magnete']" ></span>
        <span style="font-weight: bold" :class="g3wtemplate.font['layers']" ></span>
      </label>
    </template>
  </div>
</template>

<script>
  const { GUI } = g3wsdk.gui;
  const { Layer } = g3wsdk.core.layer;
  let snapInteraction;
  const mapService = GUI.getService('map');
  const editingService = require('../services/editingservice');
  export default {
    name: "snap",
    props: ['options'],
    data() {
      return {
        id: `snap_${Date.now()}`,
        idAll: `snap_${Date.now()}_all`,
        checked: false,
        checkedAll: false,
        showSnapAll: false
      }
    },
    computed: {
      add() {
        return (this.checked || this.checkedAll) && this.options.active;
      }
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
        this.showSnapAll = this.vectorToolboxesEditingState.find(editing => editing.on) && true || false;
        this.checkedAll = this.showSnapAll ? this.checkedAll : false;
      },
      activeSnapInteraction() {
        const snap = this.add;
        if (snapInteraction) {
          mapService.removeInteraction(snapInteraction);
        }
        snapInteraction = null;
        if (snap) {
          snapInteraction = new ol.interaction.Snap({
            //in case of snap to single layer get options source
            // as props pass from toolbox

            source: this.checked && !this.checkedAll && this.options.source,
            // In case of snapAll layers get features
            features: this.checkedAll && this.features
          });
          mapService.addInteraction(snapInteraction);
        }
      },
      enableSnapInteraction(bool) {
        if (bool) {
          this.activeSnapInteraction();
        } else {
          if (snapInteraction) {
            mapService.removeInteraction(snapInteraction);
          }
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
      }
    },
    created() {
      this.features = new ol.Collection();
      this.sourcesAndEventsKeys = [];
      // editing toolboxes dependencies
      this.vectorToolboxesEditingState = [];
      // unwatched function
      this.unwatches = [];
      editingService
        .getLayers()
        .forEach(layer => {
          const layerId = layer.getId();
          //Check if is a Vector Layer
          if (layer.getType() === Layer.LayerTypes.VECTOR) {
            const toolbox = editingService.getToolBoxById(layerId);
            const source = toolbox.getLayer().getEditingSource();
            this.features.extend(source.readFeatures());
            const addFeaturesKey = source.onbefore('addFeatures', this.addFeatures);
            const addFeatureKey = source.onbefore('addFeature', this.addFeatures);
            const clearKey = source.onbefore('clear', () =>{
              const features = source.readFeatures();
              this.removeFeatures(features);
            });
            const olKey = source.getFeaturesCollection()
                .on('add', evt => this.addFeature(evt.element));
            this.sourcesAndEventsKeys.push({
              source,
              settersAndKeys: {
                'addFeatures': addFeaturesKey,
                'addFeature': addFeatureKey,
                'clear': clearKey
              },
              olKey
            });
            // handle snap all. Check if layerId is not equal to current editing layer
            if (this.options.layerId !== layerId) {
              const editing = toolbox.getState().editing;
              const unwatch = this.$watch(() => editing.on, this.setShowSnapAll);
              this.unwatches.push(unwatch);
              this.vectorToolboxesEditingState.push(editing);
            }
        }
      });
      this.setShowSnapAll();
    },
    beforeDestroy() {
      this.sourcesAndEventsKeys
          .forEach(sourceAndKey => {
            const {source, settersAndKeys, olKey} = sourceAndKey;
            Object.keys(settersAndKeys).forEach(eventName =>{
              const key = settersAndKeys[eventName];
              source.un(eventName, key)
            });
            ol.Observable.unByKey(olKey)
          });
      this.unwatches.forEach(unwatch => unwatch());
      snapInteraction = null;
      this.unwatches = null;
      this.vectorToolboxesEditingState = null;
      this.sourcesAndEventsKeys = null;
    }
  }
</script>

<style scoped>
  label span {
    color: #222d32 !important;
  }
</style>
