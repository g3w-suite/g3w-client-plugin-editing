<template>
    <div class="addfeaturemethod" style="display: flex; flex-direction: column; justify-content: space-between">
        <div class="seleziona">
            <h4 style="font-weight: bold;" class="skin-color"> Usa file </h4>
            <div class="file-features skin-border-color skin-color"  style="display: flex; margin: 10px 0 10px 0; padding: 5px; position: relative; border: 2px dashed;     height: 100px;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;">
                <input type="file" ref="externalinputfilefeatures" @change="addFileFeatures($event)" :accept="'.zip, .csv'" style="position: absolute;margin: 0;padding: 0;width: 100%; height: 100%; outline: none;opacity: 0;cursor: pointer">
                <i :class="g3wtemplate.getFontClass('cloud-upload')" style="font-size: 60px;" aria-hidden="true"></i>
                <p style="font-weight: bold">[.csv, .zip(shapefile)]</p>
            </div>
            <button v-disabled="true" v-t-plugin="'editing.form.buttons.add'" class="btn btn-success" style="width: 100%; font-weight: bold" @click="addFeatures"></button>
            <div>
                <h4 style="font-weight: bold;" class="skin-color"> Disegna </h4>
                <button class="btn skin-button" style="width: 100%; margin-top: 10px;" @click="drawFeatures">
                    <i :class="g3wtemplate.font['pencil']"></i>
                </button>
            </div>
        </div>
        <div class="buttons" style="align-self: center; font-weight: bold; width: 100%; display: flex; justify-content: center">
            <button v-t-plugin="'editing.form.buttons.cancel'" class="btn btn-danger" style="width: 100%; font-weight: bold" @click="cancel"></button>
        </div>
    </div>
</template>

<script>
    const GUI = g3wsdk.gui.GUI;
    const {createVectorLayerFromFile, singleGeometriesToMultiGeometry} = g3wsdk.core.geoutils;
    const Feature = g3wsdk.core.layer.features.Feature;
    export default {
        name: 'Addfeaturemethod',
        data(){
          return {}
        },
        methods: {
            cancel(){
                const EditingService = require('../../../services/editingservice');
                EditingService.stopAllWorkflowsStack();
            },
            async drawFeatures(){
                this.cancel();
                await this.editingFeaturesReport({
                    toolId: 'addfeature'
                });
            },
            async editingFeaturesReport({toolId}={}){
                const EditingService = require('../../../services/editingservice');
                EditingService.editingFeaturesReport({toolId});
            },
            async addFileFeatures(evt) {
                try {
                    const EditingService = require('../../../services/editingservice');
                    const mapService = GUI.getComponent('map').getService();
                    let type = evt.target.files[0].name.split('.');
                    type = type[type.length-1].toLowerCase();
                    if (['zip'].indexOf(type) !== -1) {
                        const mapCrs = mapService.getEpsg();
                        const data = evt.target.files[0];
                        const layer = await createVectorLayerFromFile({
                            type,
                            data,
                            mapCrs,
                            crs:mapCrs
                        });
                        const featuresToolbox = EditingService.getToolBoxById(EditingService.getLayerFeaturesId());
                        const layerId = featuresToolbox.getId();
                        const featureReportGeometryType = featuresToolbox.getLayer().getGeometryType();
                        const featuresSession = featuresToolbox.getSession();
                        const newReportFeatures = layer.getSource().getFeatures();
                        if (newReportFeatures.length){
                            const promises = [];
                            const newGeometryType = newReportFeatures[0].getGeometry().getType();
                            if (newGeometryType !== featureReportGeometryType){
                                GUI.showUserMessage({
                                    type: 'warning',
                                    message: 'La tipologia di geometria inserita non è uguale quella di destinazione',
                                    messageText: true
                                });
                                this.$refs.externalinputfilefeatures.value = null;
                            } else {
                                await this.editingFeaturesReport();
                                newReportFeatures.forEach(olFeature => {
                                    const feature = new Feature({
                                        feature: olFeature
                                    });
                                    feature.setTemporaryId();
                                    featuresToolbox.getEditingLayerSource().addFeature(feature);
                                    featuresSession.pushAdd(layerId, feature);
                                    promises.push(EditingService.createVertexfromReportFeatures([feature]));
                                });
                                await Promise.allSettled(promises);
                                featuresSession.save();
                                mapService.zoomToFeatures(newReportFeatures, {
                                    highlight: true
                                });
                            }
                        }

                    }
                } catch(err) {
                    console.log(err)
                }

            }
        }
    };
</script>
