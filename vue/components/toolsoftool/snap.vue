<template>
  <div>
    <input type="checkbox" class="magic-checkbox snap_tools_of_tools" :id="id" v-model="checked">
    <label :for="id">Snap</label>
  </div>
</template>

<script>
  const GUI = g3wsdk.gui.GUI;
  let snapInteraction;
  const mapService = GUI.getComponent('map').getService();
  export default {
    name: "snap",
    props: ['options'],
    data() {
      return {
        id: `snap_${Date.now()}`,
        checked: false
      }
    },
    computed: {
      add() {
        return this.checked && this.active;
      },
      active() {
        return this.options.active;
      }
    },
    watch: {
      'add': function(add) {
        if (add) {
          snapInteraction = new ol.interaction.Snap({
            source: this.options.source
          });
          mapService.addInteraction(snapInteraction);
        } else {
          mapService.removeInteraction(snapInteraction);
          snapInteraction = null;
        }
      }
    },
    destroyed() {
      if (snapInteraction) {
        mapService.removeInteraction(snapInteraction);
      }
    }
  }
</script>

<style scoped>

</style>
