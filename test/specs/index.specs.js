const EditingPlugin = require('./index');
const {assert, expect} = require('chai');
module.exports = function TestEditing({config={}, testConfig={}}={}) {
  let service;
  describe('#Test editing', function() {
    this.timeout(0);
    before(async ()=>{
      await EditingPlugin.init(config);
      service = EditingPlugin.getService();
    });

    it(`Editing Layer count`, async() => {
      const layers = service.getLayers();
      expect(layers).to.be.length(testConfig.layers.count);
    });

    it("check features", async()=>{
      const edit = testConfig.edit;
      for (let i =0; i < edit.length; i++) {
        const {layerId, filter, features , actions} = edit[i];
        const toolbox = service.getToolBoxById(layerId);
        const getFeaturesOption = {
          editing: true,
          filter
        };
        const session = toolbox.getSession();
        const promise = new Promise((resolve, reject) =>{
          session.start(getFeaturesOption).then(promise => {
            promise.then(features =>{
              resolve(features)
            })
          }).fail(err => {
            reject(err)
          })
        });
        const features_from_server = await promise;
        expect(features_from_server).to.be.length(features.count);
        if (actions.update){
          const feature = features_from_server.find(feature => feature.getId() == actions.update.id);
          if (feature) {
            const originalFeature = feature.clone();
            Object.keys(actions.update.attributes).forEach(attribute =>{
              feature.set(attribute, actions.update.attributes[attribute]);
            });
            session.pushUpdate(layerId, feature, originalFeature);
            const promise = new Promise((resolve, reject) =>{
              session.save().then(()=>{
                session.commit()
                  .then(response =>{
                    resolve(response)
                  })
                  .fail(err=> reject(err))
              })
            });
            const response = await promise;
          }
        } 
        session.stop();
      }
    });

    it('delete feature', async()=>{
      assert.isOk(true);
    })
  })
};
