<template>

  <section>

    <div id = "g3w-select-editable-layers-content">
      <select
        id        = "g3w-select-editable-layers-to-copy"
        v-select2 = "'id'"
      >
        <option
          v-for  = "layer in $options.layers"
          :key   = "layer.id"
          :value = "layer.id"
        >{{ layer.name }}</option>
      </select>

    </div>

  </section>

</template>

<script>

  const { GUI }                                  = g3wsdk.gui;

  export default {

    name: 'Copyfeaturesfromotherlayers',

    data() {
      return {
        id: this.$options.layers.find(l => l.selected).id,
      };
    },

    watch: {
      'id'(id) {
        this.$options.layers.forEach(l => l.selected = id === l.id);
      }
    },

  };
</script>

