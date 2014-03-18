var image = new ol.style.Circle({
  radius: 5,
  fill: null,
  stroke: new ol.style.Stroke({color: 'rgba(255, 255, 0, 0.7)', width: 3})
});

var styles = {
  'Point': [new ol.style.Style({
    image: image
  })],
  'noeud': [new ol.style.Style({
    image: image
  })],
  'site_technique': [new ol.style.Style({
    image: image
  })],
  'chambre': [new ol.style.Style({
    image: image
  })],
  'bpe': [new ol.style.Style({
    image: image
  })],
  'LineString': [new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: 'green',
      width: 1
    })
  })],
  'MultiLineString': [new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: 'rgba(255, 255, 0, 0.5)',
      width: 5
    }),
    highlight: new ol.style.Stroke({
      color: '#ffff00',
      width: 5
    })
  })],
  'artere': [new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: 'rgba(255, 255, 0, 0.5)',
      width: 5
    }),
    highlight: new ol.style.Stroke({
      color: '#ffff00',
      width: 5
    })
  })],
  'fourreau': [new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: 'rgba(255, 255, 0, 0.5)',
      width: 2
    }),
    highlight: new ol.style.Stroke({
      color: '#ffff00',
      width: 5
    })
  })],
  'tranchee': [new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: 'rgba(255, 255, 0, 0.5)',
      width: 3
    }),
    highlight: new ol.style.Stroke({
      color: '#ffff00',
      width: 5
    })
  })],
  'cable': [new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: 'rgba(255, 255, 0, 0.5)',
      width: 3
    }),
    highlight: new ol.style.Stroke({
      color: '#ffff00',
      width: 5
    })
  })],
  'MultiPoint': [new ol.style.Style({
    image: image
  })],
  'MultiPolygon': [new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: 'yellow',
      width: 1
    }),
    fill: new ol.style.Fill({
      color: 'rgba(255, 255, 0, 0.1)'
    })
  })],
  'Polygon': [new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: 'blue',
      lineDash: [4],
      width: 3
    }),
    fill: new ol.style.Fill({
      color: 'rgba(0, 0, 255, 0.1)'
    })
  })],
  'GeometryCollection': [new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: 'magenta',
      width: 2
    }),
    fill: new ol.style.Fill({
      color: 'magenta'
    }),
    image: new ol.style.Circle({
      radius: 10,
      fill: null,
      stroke: new ol.style.Stroke({
        color: 'magenta'
      })
    })
  })],
  'Circle': [new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: 'red',
      width: 2
    }),
    fill: new ol.style.Fill({
      color: 'rgba(255,0,0,0.2)'
    })
  })]
};

var styleFunction = function(feature, resolution) {
  //return styles[feature.getGeometry().getType()];
  return styles[feature.get('typeobj')]
};

var legendStyleFunction = function(typeObj) {
  return styles[typeObj]
};

var kmlStyleFunction = function(feature, resolution) {
  var featureStyleFunction = feature.getStyleFunction();
  if (featureStyleFunction) {
    return featureStyleFunction.call(feature, resolution);
  } else {
    return styles[feature.getGeometry().getType()];
  }
};
