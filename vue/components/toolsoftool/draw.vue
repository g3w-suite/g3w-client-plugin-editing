<template>
  <div style="display: flex; flex-direction: column">
    <select class="form-control" style="width: 100%" v-model="options.current_shape_type">
      <option v-for="shape_type in this.options.shape_types" :value="shape_type" style="font-weight: bold">{{shape_type}}</option>
    </select>
    <div v-if="showradius" style="margin-top: 5px;">
      <label for="g3w-current-radius">Raggio [m]</label>
      <input id="g3w-current-radius" class="form-control" readonly :value="options.radius">
    </div>
  </div>

</template>

<script>
    const GUI = g3wsdk.gui.GUI;
    const Layer = g3wsdk.core.layer.Layer;
    const mapService = GUI.getComponent('map').getService();
    const editingService = require('../../../services/editingservice');
    export default {
      name: "draw",
      props: ['options'],
      computed: {
        showradius(){
          return this.options.current_shape_type === 'Circle';
        }
      },
      watch: {
        'options.current_shape_type'(type){
          this.options.onChange(type);
        }
      },
      beforeDestroy() {
        this.options.onBeforeDestroy();
      }
    }
</script>

<style scoped>

</style>
