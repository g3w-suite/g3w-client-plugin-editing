<template>
  <select class="form-control" style="width: 100%" v-model="selected_shape_type">
    <option v-for="shape_type in this.options.shape_types" :value="shape_type" style="font-weight: bold">{{shape_type}}</option>
  </select>
</template>

<script>
    const GUI = g3wsdk.gui.GUI;
    const Layer = g3wsdk.core.layer.Layer;
    let snapInteraction;
    const mapService = GUI.getComponent('map').getService();
    const editingService = require('../../../services/editingservice');
    export default {
      name: "draw",
      props: ['options'],
      data() {
        return {
          selected_shape_type: this.options.shape_types[0]
        }
      },
      watch: {
        selected_shape_type(type){
          this.options.onChange(type);
        }
      }

    }
</script>

<style scoped>

</style>
