<template>
    <div class="editingradiuscomponent" style="display: flex; flex-direction: column; justify-content: space-between;">
      <report-info-component>
        <template v-slot:content>
          <div v-if="isEllipse" class="change_ellipse">
            <label for="g3w_feature_report_ellipse_horizontal">Semiasse Orizzontale [m]</label>
            <input id="g3w_feature_report_ellipse_horizontal" class="form-control"  type="number" min="0" step="1" @keyup.enter="loseFocusInput" @change="changeEllipse" v-model.lazy="ellipse.horizontal">
            <label for="g3w_feature_report_ellipse_vertical">Semiasse Verticale [m]</label>
            <input id="g3w_feature_report_ellipse_vertical" class="form-control"  type="number" min="0" step="1"  @keyup.enter="loseFocusInput" @change="changeEllipse" v-model.lazy="ellipse.vertical">
          </div>
          <div v-else="isEllipse" class="change_radius">
            <label for="g3w_feature_report_radius">Raggio [m]</label>
            <input id="g3w_feature_report_radius" class="form-control"  type="number" min="0" step="1" @keyup.enter="loseFocusInput" v-model.lazy="radius">
          </div>
          <div class="bold" style="color: #000000; margin-top: 5px;" v-t="'Centro'"></div>
          <div style="display: flex; flex-direction: column; align-items: center; background-color: #FFFFFF; margin: 5px 0 5px 0; padding: 5px">
            <div style="width: 100%; display: flex; justify-content: space-between; padding: 5px; border: 2px solid rgb(238, 238, 238); margin-bottom: 5px;">
              <button class="btn skin-button" style="margin-right: 5px;" @click="moveFeature" v-disabled="activeGetCenter">
                <i :class="g3wtemplate.font['crosshairs']"></i>
              </button>
              <change-point-component @change-point="changedPoint":point="centerPoint"></change-point-component>
            </div>
          </div>
        </template>
      </report-info-component>
      <div class="buttons" style="align-self: center; font-weight: bold; width: 100%; display: flex; justify-content: center">
        <button v-t-plugin="'signaler_iim.form.buttons.save'" class="btn btn-success"  style="min-width: 80px; font-weight: bold; margin: 5px;" @click="save"></button>
        <button v-t-plugin="'signaler_iim.form.buttons.cancel'" class="btn btn-danger" style="min-width: 80px; margin: 5px; font-weight: bold" @click="cancel"></button>
      </div>
    </div>
</template>

<script>
    import SIGNALER_IIM_CONFIG from "../../../../global_plugin_data";
    import ReportInfoComponent from '../../reportinfo.vue';
    import ChangePointComponent  from '../changepoint/changepoint.vue';
    import PointMixins from '../mixins';
    const {GUI, ComponentsFactory} = g3wsdk.gui;
    const {singleGeometriesToMultiGeometry, createVectorLayerFromGeometry} = g3wsdk.core.geoutils;
    const PickCoordinatesInteraction = g3wsdk.ol.interactions.PickCoordinatesInteraction;
    const EditingService = require('../../../../services/editingservice');
    const {fromCircle} = ol.geom.Polygon;
    export default {
        name: 'radiuscompoent',
        data(){
            return {
              centerPoint: null,
              radius: null,
              activeGetCenter: false,
              ellipse:{
                horizontal: null,
                vertical: null
              }
            }
        },
        components:{
          ReportInfoComponent,
          ChangePointComponent
        },
        mixins: [PointMixins],
        methods:{
          activeGetCenterFromMap(){
            this.activeGetCenter = true;
            this.pickCenterFromMapInteraction.setActive(true);
            EditingService.getMapService().addInteraction(this.pickCenterFromMapInteraction);
          },
          deactiveGetCenterFromMap(){
            this.activeGetCenter = false;
            this.pickCenterFromMapInteraction.setActive(false);
            EditingService.getMapService().removeInteraction(this.pickCenterFromMapInteraction);
          },
          moveFeature(){
            this.activeGetCenterFromMap();
            this.pickCenterFromMapInteraction.once('picked', ({coordinate:coordinates}) =>{
              this.setPointCoordinatesInMapProjection({point: this.centerPoint, coordinates});
              this.changeCenter(coordinates);
              this.deactiveGetCenterFromMap();
            })
          },
          changedPoint(){
            this.deactiveGetCenterFromMap();
            const center = this.getPointCoordinatesInMapProjection(this.centerPoint);
            this.changeCenter(center);
          },
          changeCenter(center){
            if (this.isEllipse) {
              const delta = EditingService.getDeltaXY({
                x: center[0],
                y: center[1],
                coordinates: this.center
              });
              this.sourceFeature.getGeometry().translate(delta.x, delta.y);
            } else this.sourceFeature.getGeometry().setCenter(center);
            this.center = center;
            this.changed = true;
          },
          changeEllipse(){
            const dx = this.ellipse.horizontal;
            const dy = this.ellipse.vertical;
            const radius = Math.sqrt(dx * dx + dy * dy);
            const circle = new ol.geom.Circle(this.center, radius);
            const geometry = singleGeometriesToMultiGeometry([fromCircle(circle, 64)]);
            geometry.scale(dx / radius, dy / radius);
            this.sourceFeature.setGeometry(geometry);
          },
          changeRadius(){
            const radius = 1*this.radius;
            this.sourceFeature.getGeometry().setRadius(radius);
            this.changed = true;
          },
          save(){
            if (this.changed){
              const {geo_layer_id} = SIGNALER_IIM_CONFIG;
              const session = EditingService.getToolBoxById(geo_layer_id).getSession();
              if (this.isEllipse) this.featureReport.setGeometry(this.sourceFeature.getGeometry());
              else {
                const polygonGeometryFromCircle = ol.geom.Polygon.fromCircle(this.sourceFeature.getGeometry());
                this.sourceFeature.setGeometry(singleGeometriesToMultiGeometry([polygonGeometryFromCircle]));
                this.featureReport.setGeometry(singleGeometriesToMultiGeometry([polygonGeometryFromCircle]));
              }
              session.pushUpdate(geo_layer_id, this.featureReport, this.originalFeatureReportFeature);
            }
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
          this.pickCenterFromMapInteraction = new PickCoordinatesInteraction();
          this.featureReport = EditingService.getCurrentFeatureReport();
          const featureGeometry =  this.featureReport.getGeometry();
          this.originalFeatureReportFeature = this.getSourceFeatureReport().clone();
          const center = featureGeometry.getFlatInteriorPoints();
          this.center = [center[0], center[1]];
          const {pointObject} = this.createPoint(this.center);
          this.centerPoint = pointObject;
          const extent = featureGeometry.getExtent();
          const ext1 = Math.abs(extent[2] - extent[0]);
          const ext2 = Math.abs(extent[3] - extent[1]);
          this.isEllipse =  this.featureReport.get('shape') === 'Ellipse';
          if (this.isEllipse){
            this.ellipse.horizontal = ext1/2;
            this.ellipse.vertical = ext2/2;
          } else this.radius = Math.min(ext1, ext2) / 2;
          this.sourceFeature = this.getSourceFeatureReport();
          !this.isEllipse && this.sourceFeature.setGeometry(new ol.geom.Circle([this.center[0], this.center[1]], this.radius))
        },
        async mounted(){},
        beforeDestroy() {
          this.deactiveGetCenterFromMap();
          this.pickCenterFromMapInteraction = null;
        }
    };
</script>
