var map;
var layersArray = [];
var num_layer = 0;

$(function() {
    
    osm = new ol.source.OSM('Simple OSM Map', null, {
                eventListeners: {
                    tileloaded: function(evt) {
                        var ctx = evt.tile.getCanvasContext();
                        if (ctx) {
                            var imgd = ctx.getImageData(0, 0, evt.tile.size.w, evt.tile.size.h);
                            var pix = imgd.data;
                            for (var i = 0, n = pix.length; i < n; i += 4) {
                                pix[i] = pix[i + 1] = pix[i + 2] = (3 * pix[i] + 4 * pix[i + 1] + pix[i + 2]) / 8;
                            }
                            ctx.putImageData(imgd, 0, 0);
                            evt.tile.imgDiv.removeAttribute("crossorigin");
                            evt.tile.imgDiv.src = ctx.canvas.toDataURL();
                        }
                    }
                }
            });

    map = new ol.Map({        
        layers: [
            new ol.layer.Tile({
                source: osm
            })
        ],
        renderer: 'canvas',
        target: 'map',
        view: new ol.View2D({
            center: ol.proj.transform([-0.3, 45], 'EPSG:4326', 'EPSG:3857'),
            zoom: 10
        })
    });

    addGeoJSON("artere");    
    addGeoJSON("noeud");  
    
});

function addGeoJSON(table_name) {
    var objSource = new ol.source.GeoJSON({
            url: '/export/data_geojson/' + table_name
        });
    var json_layer = new ol.layer.Vector({
        source: objSource,
        styleFunction: styleFunction
    }); 
    map.addLayer(json_layer);
    
    id = table_name;
    $('#layers_list').append('<li><input type="checkbox" name="check_'+id+'" id="check_'+id+'" value="'+num_layer+'" onclick="displayLayer(this)" checked> '+id+'</li>');
    
    layersArray.push(json_layer);
    num_layer = num_layer + 1;
}

function displayLayer(evt) {    
    layersArray[evt.value].setVisible(evt.checked);
}

