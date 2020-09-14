<template>
  <div style="display: flex; justify-content: space-between; width: 100%">
    <input type="checkbox" class="magic-checkbox snap_tools_of_tools" :id="id" v-model="checked">
    <label :for="id">Snap</label>
    <template v-if="showSnapAll">
      <input type="checkbox" class="magic-checkbox snap_tools_of_tools"  :id="idAll" v-model="checkedAll">
      <label :for="idAll">Snap All</label>
    </template>
  </div>
</template>

<script>
  const GUI = g3wsdk.gui.GUI;
  const Layer = g3wsdk.core.layer.Layer;
  let snapInteraction;
  const mapService = GUI.getComponent('map').getService();
  const editingService = require('../../../services/editingservice');
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
        return (this.checked || this.checkedAll) && this.active;
      },
      active() {
        return this.options.active;
      }
    },
    methods: {
      addFeatures(features){
        this.features.extend(features)
      },
      addFeature(feature){
        this.addFeatures([feature]);
      },
      removeFeatures(features){
        features.forEach(feature => this.features.remove(feature));
      },
      setShowSnapAll(){
        this.showSnapAll = this.vectorToolboxesEditingState.find(editing => editing.on) && true || false;
        this.checkedAll = this.showSnapAll ? this.checkedAll : false;
      },
      activeSnapInteraction({source, features, snaptype}={}) {
        snaptype === 'snapall' ? this.checked = false : this.checkedAll = false;
        snapInteraction &&  mapService.removeInteraction(snapInteraction);
        snapInteraction = null;
        snapInteraction = new ol.interaction.Snap({
          source,
          features
        });
        mapService.addInteraction(snapInteraction);
      }
    },
    watch: {
      add(add) {
        !add && mapService.removeInteraction(snapInteraction);
      },
      checked(bool) {
        bool && this.activeSnapInteraction({
            source: this.options.source,
            type: 'snap'
          });
      },
      checkedAll(bool) {
        bool && this.activeSnapInteraction({
            features: this.features,
            type: 'snapall'
          });
      }
    },
    created() {
      this.features = new ol.Collection();
      this.sourcesAndEventsKeys = [];
      // editing toolboxes dependencies
      this.vectorToolboxesEditingState = [];
      // unwatched function
      this.unwatches = [];
      editingService.getLayers().forEach(layer => {
        const layerId = layer.getId();
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
          const olKey = source.getFeaturesCollection().on('add', evt => this.addFeature(evt.element));
          this.sourcesAndEventsKeys.push({
            source,
            settersAndKeys: {
              'addFeatures': addFeaturesKey,
              'addFeature': addFeatureKey,
              'clear': clearKey
            },
            olKey
          });
          // handle snap all
          if (this.options.layerId !== layerId) {
            const editing = toolbox.getState().editing;
            const unwatch = this.$watch(()=> editing.on, this.setShowSnapAll);
            this.unwatches.push(unwatch);
            this.vectorToolboxesEditingState.push(editing);
          }
        }
      });
      this.setShowSnapAll();
    },
    beforeDestroy() {
      snapInteraction && mapService.removeInteraction(snapInteraction);
      this.sourcesAndEventsKeys.forEach(sourceAndKey =>{
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
    }
  }
</script>

<style scoped>

</style>
