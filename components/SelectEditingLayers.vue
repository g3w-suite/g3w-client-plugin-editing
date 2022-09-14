<template>
  <div id="g3w-select-editable-layers-content" class="skin-color">
    <label for="g3w-select-editable-layers-to-show" v-t="'Layers'"></label>
    <select id="g3w-select-editable-layers-to-show" multiple="multiple" clear="true" v-select2="'selectedlayers'">
      <option v-for="editinglayer in editinglayers" :value="editinglayer.id" :key="editinglayer.id">{{editinglayer.name}}</option>
    </select>
  </div>
</template>

<script>
  const EditingService = require('../services/editingservice');

  export default {
    name: 'Selecteditinglayers',
    data(){
      const editinglayers = Object.entries(EditingService.getEditableLayers()).map(([layerId, layer]) => ({
        id: layerId,
        name: layer.getName(),
        title: layer.getTitle()
      }));
      return {
        selectedlayers: [],
        editinglayers
      }
    },
    watch: {
      selectedlayers(layers){
        if (layers.length > 0) this.editinglayers.forEach(({id})=> {
          const bool = layers.indexOf(id) !== -1; // check if editing layer is selected
          const toolbox =  EditingService.getToolBoxById(id); // show or not toolbox of layer based on bool value
          toolbox.setShow(bool);
          if (!bool)  {
            if (toolbox.state.editing.history.commit)
              EditingService.commit({toolbox}).always(() => toolbox.stop());
            else toolbox.stop();
          } // in case of bool === false (not selected) need to stop editing on layer
        }); else this.editinglayers.forEach(({id}) => EditingService.getToolBoxById(id).setShow(true));
      }
    }
  };
</script>

<style scoped>
  #g3w-select-editable-layers-content {
    margin-bottom: 10px;
    font-weight: bold;
  }
  #g3w-select-editable-layers-content label {
    color: #ffffff !important;
  }
  #g3w-select-editable-layers-to-show {
    cursor: pointer;
  }
</style>
