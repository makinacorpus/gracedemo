var map;
var view;
var layersArray = [];
var num_layer = 0;
var highlight;
var HOST_URL = 'http://open.mapquestapi.com';
var SAMPLE_POST = HOST_URL + '/nominatim/v1/search.php?format=json&json_callback=renderBasicSearchNarrative';
var searchType = '';


$(function() {
    
    osm = new ol.source.OSM('OSM');
    osmLayer = new ol.layer.Tile({source: osm});
    osmLayer.on('postcompose', function(event) {
        var context = event.context;
        var canvas = context.canvas;
        var image = context.getImageData(0, 0, canvas.width, canvas.height);
        var data = image.data;
        for (var i = 0, ii = data.length; i < ii; i += 4) {
            data[i] = data[i + 1] = data[i + 2] = (3 * data[i] + 4 * data[i + 1] + data[i + 2]) / 8;
        }
        context.putImageData(image, 0, 0);
    });

    var mousePositionControl = new ol.control.MousePosition({
        coordinateFormat: ol.coordinate.createStringXY(4),
        projection: 'EPSG:4326',
        // comment the following two lines to have the mouse position
        // be placed within the map.
        className: 'custom-mouse-position',
        target: document.getElementById('mouse-position'),
        undefinedHTML: '&nbsp;'
    });    
    
    view = new ol.View2D({
        center: ol.proj.transform([-0.2385, 44.9313], 'EPSG:4326', 'EPSG:3857'),
        zoom: 12
    });

    map = new ol.Map({
        controls: ol.control.defaults().extend([mousePositionControl]),
        layers: [
            osmLayer
        ],
        renderer: 'canvas',
        target: 'map',
        view: view
    });

    addGeoJSON("artere");    
    addGeoJSON("noeud");
    addGeoJSON("fourreau");  
    
    // Get infos
    $(map.getViewport()).on('mousemove', function(evt) {
        var pixel = map.getEventPixel(evt.originalEvent);
        displayFeatureInfo(pixel);
    });

    map.on('singleclick', function(evt) {
        displayFeatureInfo(evt.pixel);
    });
    
    var highlightStyleCache = {};
    var featureOverlay = new ol.FeatureOverlay({
        map: map,
        styleFunction: function(feature, resolution) {
            //var text = resolution < 5000 ? feature.get('id_com_insee') : '';
            var text = feature.get('typeobj') + " : " +  feature.getId();
            if (!highlightStyleCache[text]) {
                highlightStyleCache[text] = [new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: '#d26105',
                        width: 5
                    }),
                    fill: new ol.style.Fill({
                        color: 'rgba(255,0,0,0.1)'
                    }),
                    text: new ol.style.Text({
                        font: '20px Arial,sans-serif',
                        text: text,
                        fill: new ol.style.Fill({
                            color: '#FFF'
                        }),
                        stroke: new ol.style.Stroke({
                            color: '#d26105',
                            width: 3
                        })
                    })
                })];
            }
            return highlightStyleCache[text];
        }
    });    
    
    // Get infos on features
    var displayFeatureInfo = function(pixel) {
        var feature = map.forEachFeatureAtPixel(pixel, function(feature, layer) {
            return feature;
        });

        var info = document.getElementById('infos-content');
        if (feature) {
            info.innerHTML = feature.get('typeobj') + '<br/>ID: ' + feature.getId();
            for (prop in feature.getProperties()) {
                if(prop != 'geometry' && prop != 'typeobj') {
                    info.innerHTML = info.innerHTML + '<br/>' + prop + ': ' + feature.get(prop);
                }
            }
            
        } else {
            info.innerHTML = '&nbsp;';
        }

        if (feature !== highlight) {
            if (highlight) {
                featureOverlay.removeFeature(highlight);
            }
            if (feature) {
                featureOverlay.addFeature(feature);
            }
            highlight = feature;
        }
    };    
    
});

function addGeoJSON(table_name) {
    var objSource = new ol.source.GeoJSON({
            //projection: 'EPSG:3857',
            url: '/export/data_geojson/' + table_name
        });
    var json_layer = new ol.layer.Vector({
        source: objSource,
        styleFunction: styleFunction
    }); 
    //objSource.on('addfeature', function(event) {
    //    window.console.log('added feature');
    //});    
    map.addLayer(json_layer);
    
    id = table_name;
    $('#layers_list').append('<li><input type="checkbox" name="check_'+id+'" id="check_'+id+'" value="'+num_layer+'" onclick="displayLayer(this)" checked> '+id+'</li>');
    
    layersArray.push(json_layer);
    num_layer = num_layer + 1;
}

function displayLayer(evt) {    
    layersArray[evt.value].setVisible(evt.checked);
}


// Geolocalisation
function doBasicSearchClick() {
    var newURL = SAMPLE_POST + "&q=" + $('#place-to-search').val();
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = newURL;
    document.body.appendChild(script);
};

function renderBasicSearchNarrative(response) {
    if(response){
        for(var i =0; i < response.length; i++){
            var result = response[i];
            var new_center = ol.proj.transform([result.lon*1.0, result.lat*1.0], 'EPSG:4326', 'EPSG:3857');
            //var new_center = ol.proj.transform([-0.12755, 51.507222], 'EPSG:4326', 'EPSG:3857');
            var pan = ol.animation.pan({
                duration: 2000,
                source: (view.getCenter())
            });
            map.beforeRender(pan);
            view.setCenter(new_center);            
            break;
        }       
    }    
}






