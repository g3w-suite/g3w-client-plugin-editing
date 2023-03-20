<template>
  <div style="display: flex; flex-direction: column">
    <select class="form-control" style="width: 100%" v-model="options.current_shape_type">
      <option
        v-for="shape_type in this.options.shape_types"
        :value="shape_type.type"
        style="font-weight: bold"
        v-t-plugin="`signaler_iim.shape_types.${shape_type.label}`"></option>
    </select>
    <template v-if="isCircle && show_circle_ellipse">
      <div style="margin-top: 5px;">
        <label for="g3w-current-radius_circle" v-t-plugin="'signaler_iim.draw.circle.radius'"></label>
        <input id="g3w-current-radius_circle" class="form-control" readonly :value="options.radius">
      </div>
    </template>
    <template v-if="isEllipse && show_circle_ellipse">
      <div style="margin-top: 5px;">
        <label for="g3w-current-ellipse-h" v-t-plugin="'signaler_iim.draw.ellipse.semi_horizontal'"></label>
        <input id="g3w-current-ellipse-h" class="form-control" readonly :value="options.ellipse.horizontal">
        <label for="g3w-current-ellipse-v" v-t-plugin="'signaler_iim.draw.ellipse.semi_vertical'"></label>
        <input id="g3w-current-ellipse-v" class="form-control" readonly :value="options.ellipse.vertical">
      </div>
    </template>

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
      data(){
        return {
          show_circle_ellipse: false // need to be show right input label
        }
      },
      computed: {
        isCircle(){
          return this.options.current_shape_type === 'Circle';
        },
        isEllipse(){
          return this.options.current_shape_type === 'Ellipse';
        }
      },
      watch: {
        async 'options.current_shape_type'(type){
          this.show_circle_ellipse = false;
          await this.$nextTick();
          this.options.onChange(type);
          this.show_circle_ellipse = true;
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
