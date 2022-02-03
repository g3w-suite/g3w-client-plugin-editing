<template>
  <div style="display: flex; flex-direction: column">
    <select class="form-control" style="width: 100%" v-model="options.current_shape_type">
      <option v-for="shape_type in this.options.shape_types" :value="shape_type" style="font-weight: bold">{{shape_type}}</option>
    </select>
    <div v-if="isCircle" style="margin-top: 5px;">
      <label for="g3w-current-radius_circle">Raggio [m]</label>
      <input id="g3w-current-radius_circle" class="form-control" readonly :value="options.radius">
    </div>
    <div v-if="isEllipse" style="margin-top: 5px;">
      <label for="g3w-current-ellipse-h">Semiasse Orizzontale[m]</label>
      <input id="g3w-current-ellipse-h" class="form-control" readonly :value="options.ellipse.horizontal">
      <label for="g3w-current-ellipse-v">Semiasse Verticale[m]</label>
      <input id="g3w-current-ellipse-v" class="form-control" readonly :value="options.ellipse.vertical">
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
        isCircle(){
          return this.options.current_shape_type === 'Circle';
        },
        isEllipse(){
          return this.options.current_shape_type === 'Ellipse';
        }
      },
      watch: {
        'options.current_shape_type'(type){
          this.options.onChange(type);
        }
      },
      created(){
        this.options.init();
      },
      beforeDestroy() {
        this.options.onBeforeDestroy();
      }
    }
</script>

<style scoped>

</style>
