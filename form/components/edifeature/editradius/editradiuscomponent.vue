<template>
    <div class="editingradiuscomponent" style="display: flex; flex-direction: column; justify-content: space-between">
      <div class="change_radius">
        <label for="g3w_feature_report_radius">Raggio [m]</label>
        <input id="g3w_feature_report_radius" class="form-control"  type="number" min="0" step="1" v-model="radius">
      </div>
      <div class="buttons" style="align-self: center; font-weight: bold; width: 100%; display: flex; justify-content: center">
        <button v-t-plugin="'signaler_iim.form.buttons.save'" class="btn btn-success"  style="min-width: 80px; font-weight: bold; margin: 5px;" @click="save"></button>
        <button v-t-plugin="'signaler_iim.form.buttons.cancel'" class="btn btn-danger" style="min-width: 80px; margin: 5px; font-weight: bold" @click="cancel"></button>
      </div>
    </div>
</template>

<script>
    import SIGNALER_IIM_CONFIG from "../../../../global_plugin_data";
    const {GUI, ComponentsFactory} = g3wsdk.gui;
    const {singleGeometriesToMultiGeometry} = g3wsdk.core.geoutils;
    const EditingService = require('../../../../services/editingservice');
    export default {
        name: 'radiuscompoent',
        data(){
            return {
              radius: 10,
              changed: false,
            }
        },
        methods:{
          changeRadius(){
            this.sourceFeature.getGeometry().setRadius(1*this.radius);
            this.changed = true;
          },
          save(){
            const {geo_layer_id} = SIGNALER_IIM_CONFIG;
            const session = EditingService.getToolBoxById(geo_layer_id).getSession();
            const polygonGeometryFromCircle = ol.geom.Polygon.fromCircle(this.sourceFeature.getGeometry());
            this.sourceFeature.setGeometry(singleGeometriesToMultiGeometry([polygonGeometryFromCircle]));
            this.featureReport.setGeometry(singleGeometriesToMultiGeometry([polygonGeometryFromCircle]));
            session.pushUpdate(geo_layer_id, this.featureReport, this.originalFeatureReportFeature);
            this.close();
          },
          cancel(){
            if (this.changed) this.sourceFeature.setGeometry(this.originalFeatureReportFeature.getGeometry());
            this.close();
          },
          close(){
            GUI.popContent();
          },
          getSourceFeatureReport(){
            const {geo_layer_id} = SIGNALER_IIM_CONFIG;
            const featureLayerToolBox = EditingService.getToolBoxById(geo_layer_id);
            const feature = featureLayerToolBox.getEditingLayerSource().getFeatures().find(feature => feature.getId() === this.featureReport.getId());
            return feature;
          },
        },
        watch: {
          radius(){
            this.changeRadius();
          }
        },
        created() {
          this.featureReport = EditingService.getCurrentFeatureReport();
          this.originalFeatureReportFeature = this.getSourceFeatureReport().clone();
          const center = this.featureReport.getGeometry().getFlatInteriorPoints();
          const extent = this.featureReport.getGeometry().getExtent();
          this.radius = Math.min(extent[2] - extent[0], extent[3] - extent[1]) / 2;
          this.sourceFeature = this.getSourceFeatureReport();
          this.sourceFeature.setGeometry(new ol.geom.Circle([center[0], center[1]], this.radius))
        },
      async mounted(){}
    };
</script>
