var map;

$(function() {
    map = new ol.Map({
        target: 'map',
        view: new ol.View2D({
            center: ol.proj.transform([2, 48], 'EPSG:4326', 'EPSG:3857'),
        zoom: 6
        })
    });
    var osmSource = new ol.source.OSM();
    var osmLayer = new ol.layer.Tile({source: osmSource});
    
    map.addLayer(osmLayer);
    
    //addGeoJSON("artere");
    
});

function addGeoJSON(table_name) {
    var json_layer = new ol.layer.Vector({
        source: new ol.source.GeoJSON({
            url: '/export/data_geojson/'+table_name
        }),
        styleFunction: function(feature, resolution) {
            var styleArray = [new ol.style.Style({
            fill: new ol.style.Fill({
                color: 'rgba(255, 255, 255, 0.6)'
            }),
            stroke: new ol.style.Stroke({
                color: '#319FD3',
                width: 1
            }),
            zIndex: (feature.getGeometry().getType() !== 'MultiPolygon') ? 2 : 1
            })];
            return styleArray;
        }
    }); 
    map.addLayer(json_layer);
}
