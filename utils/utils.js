const GUI = g3wsdk.gui.GUI;
const utils = {
  validation: {
    line: {
      add() {},
      delete() {},
      edit(){},
      commit({features=[]}={}) {
        let isStartLine;
        if (features.length < 2)
          return true;
        for (let i=0; i < features.length; i++) {
          isStartLine = false;
          const feature = features[i];
          const coordinate = feature.getGeometry().getCoordinates();
          const startVertexCoordinateString = coordinate[1].toString();
          for (let i = 0; i < features.length; i++ ) {
            const _feature = features[i];
            if (feature !== _feature) {
              const coordinate = _feature.getGeometry().getCoordinates();
              isStartLine = startVertexCoordinateString === coordinate[0].toString();
              if (isStartLine)
                break;
            }
          }
          if (isStartLine)
            break;
        }
        return isStartLine;
      }
    },
    point: {
      add() {},
      delete() {},
      edit(){},
      commit(){}
    },
    polygon: {
      add() {},
      delete() {},
      edit(){},
      commit(){}
    }
  }
};

module.exports = utils;
