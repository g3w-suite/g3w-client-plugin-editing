<template>
  <div class="g3w-export-formats-content" style="width: 100%; display: flex" @click.prevent.stop="">
    <select  style="flex-grow: 1" v-select2="'export_format'" :search="false" class="form-control">
      <option v-for="export_format in config.export_formats" :key="export_format.id" v-download :value="export_format.config.url">
        <span style="font-weight: bold">{{export_format.config.label}}</span>
      </option>
    </select>
    <button style="border-radius: 0 3px 3px 0;" class="btn skin-button" @click.stop=export_signaler_format v-download>
      <span :class="g3wtemplate.getFontClass('export_signaler')">
      </span>
    </button>
  </div>
</template>

<script>
  export default {
    name: "export_signaler_formats",
    data(){
      const export_format = this.config.export_formats[0].config.url;
      return {
        export_format
      }
    },
    props: {
      featureIndex: {
        type: Number,
      },
      feature: {
        type: Object
      },
      layer: {
        type: Object
      },
      config: {
        type: Object,
        default: null
      },
    },
    methods: {
      async export_signaler_format(){
        try {
          const export_format_signaler = this.config.export_formats.find(action => action.config.url === this.export_format);
          await export_format_signaler.cbk(this.layer, this.feature ? this.feature : this.layer.features, export_format_signaler, this.featureIndex);
        }
        catch(err){
          console.log(err)
        }
      }
    }
  }
</script>

<style scoped>
</style>