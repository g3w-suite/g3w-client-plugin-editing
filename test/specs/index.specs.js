const EditingPlugin = require('./index');
const {assert, expect} = require('chai');
module.exports = function TestEditing({config={}, testConfig={}}={}) {
  let service;
  describe('#Test editing', function() {
    before(async ()=>{
      await EditingPlugin.init(config);
      service = EditingPlugin.getService();
    });

    it(`Editing Layer count`, async() => {
      const layers = service.getLayers();
      expect(layers).to.be.length(testConfig.layers.count);
    });

    it("add feature", async()=>{
      assert.isOk(true);
    });

    it('delete feature', async()=>{
      assert.isOk(true);
    })
  })
};
