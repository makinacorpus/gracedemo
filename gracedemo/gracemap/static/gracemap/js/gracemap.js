var map;

$(function() {
    map = new ol.Map({
        layers: [
            new ol.layer.Tile({
                source: new ol.source.OSM()
            })
        ],
        renderer: 'canvas',
        target: 'map',
        view: new ol.View2D({
            center: ol.proj.transform([2, 48], 'EPSG:4326', 'EPSG:3857'),
            zoom: 6
        })
    });

    addGeoJSON("artere");    
});

function addGeoJSON(table_name) {
    var objSource = new ol.source.GeoJSON({
            url: '/export/data_geojson/'+table_name
        });
    var json_layer = new ol.layer.Vector({
        source: objSource,
        styleFunction: styleFunction
    }); 
    map.addLayer(json_layer);
}




