<template>
    <div @click ="state.enabled ? toggletool(): null" v-if="state.visible" class="editbtn" :class="{'enabled' : state.enabled, 'toggled' : state.active}">
        <img height="25px" width="25px" :alt="state.name" :src="resourcesurl + 'images/'+ state.icon" v-t-title:plugin="state.name"/>
    </div>
</template>

<script>
    export default {
      name: 'Tool',
      props: ['state' ,'resourcesurl'],
      data: function() {
        return {}
      },
      methods: {
        toggletool() {
          if (!this.state.active) this.$emit('setactivetool', this.state.id);
          else this.$emit('stopactivetool');
        }
      }
    };
</script>
