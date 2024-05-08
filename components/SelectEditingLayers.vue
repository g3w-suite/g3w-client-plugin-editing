<template>
  <div
    id    = "g3w-select-editable-layers-content"
    class = "skin-color"
  >
    <label
      for = "g3w-select-editable-layers-to-show"
      v-t = "'Layers'"
    ></label>
    <select
      id        = "g3w-select-editable-layers-to-show"
      multiple  = "multiple"
      clear     = "true"
      v-select2 = "'selectedlayers'"
    >
      <option
        v-for  = "editinglayer in editinglayers"
        :value = "editinglayer.id"
        :key   = "editinglayer.id"
      >{{ editinglayer.name }}</option>
    </select>
  </div>
</template>

<script>

  export default {

    name: 'Selecteditinglayers',

    data() {
      return {
        selectedlayers: [],
        editinglayers: Object
          .entries(g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').getEditableLayers())
          .map(([id, layer]) => ({ id, name: layer.getName(), title: layer.getTitle() })),
      };
    },

    watch: {

      selectedlayers(layers) {
        const has_layers = layers.length > 0;

        this.editinglayers
          .forEach(({ id }) => {
            const toolbox     = g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').getToolBoxById(id);
            const is_commit   = has_layers && toolbox.state.editing.history.commit;
            const is_selected = (-1 !== layers.indexOf(id));

            toolbox.setShow(has_layers ? is_selected : true);

            if (has_layers && !is_selected && is_commit) {
              g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing')
                .commit({ toolbox })
                .always(() => toolbox.stop());
            }
            if (has_layers && !is_selected && !is_commit) {
              toolbox.stop();
            }
          });
      },

    },

  };
</script>

<style scoped>
  #g3w-select-editable-layers-content {
    margin-bottom: 10px;
    font-weight: bold;
  }
  #g3w-select-editable-layers-content label {
    color: #fff !important;
  }
  #g3w-select-editable-layers-to-show {
    cursor: pointer;
  }
</style>
