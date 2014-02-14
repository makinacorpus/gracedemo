var map;
var view;
var layersArray = [];
var layersNameArray = [];
var num_layer = 0;
var highlight;
var HOST_URL = 'http://open.mapquestapi.com';
var SAMPLE_POST = HOST_URL + '/nominatim/v1/search.php?format=json&json_callback=renderBasicSearchNarrative';

var searchType = '';


$(function() {
    
    osm = new ol.source.OSM('OSM');
    osmLayer = new ol.layer.Tile({source: osm});
    /*osmLayer.on('postcompose', function(event) {
        var context = event.context;
        var canvas = context.canvas;
        var image = context.getImageData(0, 0, canvas.width, canvas.height);
        var data = image.data;
        for (var i = 0, ii = data.length; i < ii; i += 4) {
            data[i] = data[i + 1] = data[i + 2] = (3 * data[i] + 4 * data[i + 1] + data[i + 2]) / 8;
        }
        context.putImageData(image, 0, 0);
    });*/

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

    addWMS("artere");
    addWMS("noeud");
    
    //addGeoJSON("artere", true);    
    //addGeoJSON("noeud", true);
    //addGeoJSON("fourreau");  
    
    // Get infos
    $(map.getViewport()).on('mousemove', function(evt) {
        var pixel = map.getEventPixel(evt.originalEvent);
        displayFeatureInfo(pixel);
    });

    map.on('singleclick', function(evt) {
        displayFeatureInfo(evt.pixel);
    });
    
    
    //map.on('moveend', onMoveEnd);
    
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

function addWMS(layer) {
    var wmsSourceArtere = new ol.source.TileWMS({
        url: QGISSERVER_URL,
        params: {'LAYERS': layer}
    });

    var wmsArtere = new ol.layer.Tile({
        source: wmsSourceArtere
    });    
    
    map.addLayer(wmsArtere);

    colorObj = '#000';

    addLayerToLegend(wmsArtere, colorObj, layer, 'wms');
}

function addGeoJSON(table_name, init, idLayer) {
    var extent = map.getView().calculateExtent(map.getSize());
    var bottomLeft = ol.proj.transform(ol.extent.getBottomLeft(extent), 'EPSG:3857', 'EPSG:4326');
    var topRight = ol.proj.transform(ol.extent.getTopRight(extent), 'EPSG:3857', 'EPSG:4326');
    currentZoom = map.getView().getZoom();
    
    if (!init) {
        map.removeLayer(layersArray[idLayer]);
    }
    
    if(currentZoom > 13) {
        bbox = bottomLeft[0] + ',' + bottomLeft[1] + ',' + topRight[0] + ',' + topRight[1]
    } else {
        alert("Vous devez zoom réduire la vue (zoomez)");
        return;
    }
    
    var objSource = new ol.source.GeoJSON({
            //projection: 'EPSG:3857',
            url: '/export/data_geojson/' + table_name + '?bbox=' + bbox
        });
    var json_layer = new ol.layer.Vector({
        source: objSource,
        styleFunction: styleFunction
    }); 
    //objSource.on('addfeature', function(event) {
    //    window.console.log('added feature');
    //});    
    map.addLayer(json_layer);
    
    styleObj = legendStyleFunction(table_name);
    if(styleObj[0].getStroke())
        colorObj = styleObj[0].getStroke().getColor();
    else
        colorObj= styleObj[0].getImage().getStroke().getColor();
    
    if (init) {
        addLayerToLegend(json_layer, colorObj, table_name, 'json');
    }
    else {
        layersArray[idLayer] = json_layer;
    }
}

function addLayerToLegend(layer, colorObj, id, type) {
    reloadBtn = '';
    if(type == 'json')
        reloadBtn = '<input type="button" class="btn btn-default btn-load" value="Reload" id="'+num_layer+'" onclick="reloadGeoJSON(this)"/>';
    if(type == 'wms')
        reloadBtn = '<input type="button" class="btn btn-default btn-load" value="Load JSON" id="'+num_layer+'" onclick="loadGeoJSON(this)"/>';
    
    $('#layers_list').append('<li><div style="width:16px;height:18px;background:'+colorObj+';margin-top:2px; float: left;"></div><input type="checkbox" name="check_'+id+'" id="check_'+id+'" value="'+num_layer+'" onclick="displayLayer(this)" checked> '+id+' '+reloadBtn+'</li>');
    
    layersArray.push(layer);
    layersNameArray.push(id);
    num_layer = num_layer + 1;
}

function displayLayer(evt) {    
    layersArray[evt.value].setVisible(evt.checked);
}

function loadGeoJSON(evt) {    
    addGeoJSON(layersNameArray[evt.id],true)    
}

function reloadGeoJSON(evt) {    
    addGeoJSON(layersNameArray[evt.id],false, evt.id)    
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






