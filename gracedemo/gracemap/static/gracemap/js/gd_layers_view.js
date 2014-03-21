// Layers model
LayersModel = Backbone.Model.extend({
    defaults: {
        "id": "Unknown",
        "label": "Unknown",
        "type": "Unknown",
        "url": "Unknown",
        "num_layer": 0,
        "source": '',
        "json_layer": '',
        "json_layer_num": '',
        "tv_root": '',
        "queryable": false,
        "active": true
    }});

gd.LayersCollection = Backbone.Collection.extend({
    model: LayersModel
});
var layers = new gd.LayersCollection();

var LayersView = Backbone.View.extend({
    init: true,
    //template: _.template( $('#layerTemplate').html()),
    template: '',
    render: function(){
        this.$el.empty();

        this.collection.each(function(model){
            // Add layer to treeview
            model.attributes.num_layer = gd.mapView.num_layer;
            
            iconQueryable = "";
            if(model.attributes.queryable)
                    iconQueryable = "<div class='queryable' onclick='gd.mapView.showInfosLayer();'></div>";
                
            labelContent = iconQueryable + '<span class="layername" onclick="gd.mapView.activeLayer(\''+model.attributes.id+'\', this);">'+model.attributes.label+'</span>';
            
            // TODO make this process automatic !
            var root_tv = null;
            if(model.attributes.tv_root == "support") { 
                root_tv = gd.mapView.root_support_tv;
            }
            if(model.attributes.tv_root == "cablage") { 
                root_tv = gd.mapView.root_cablage_tv;
            }
            
            //var sub_root = gd.mapView.apiTreeView.searchId(true, true, {id: 'root_support'});
            
            checked = true;
            if(!model.attributes.active)
                checked = false;
                
            // Add to treeview
            gd.mapView.apiTreeView.append(root_tv, {
                    uid: model.attributes.num_layer,
                    success: function(item, options) {
                    },
                    fail: function(item, options) {
                    },
                    itemData: {"id": model.attributes.num_layer, "label": labelContent, "inode": false, "checked": checked, "checkbox": true, "radio": false, "layerName": model.attributes.id}
                });
            
            // Add layer to map
            layerAdded = gd.mapView.addWMS(model, model.attributes.id, model.attributes.url);
            
            // Add table in object result view
            reloadBtn = '<span class="layername reloadspan" onclick="gd.mapView.activeLayer(\''+model.attributes.id+'\');">'+'<div class="reload-btn"></div>'+'</span>';
            document.getElementById('json-objects-contents').innerHTML += "<h4>"+model.attributes.label+reloadBtn+"</h4><table id='json-objects-contents-"+model.attributes.id+"'><thead></thead><tbody></tbody></table>";
            
            gd.mapView.layersArray.push(layerAdded);

            // Active by default ?
            if(!model.attributes.active)
                gd.mapView.layersArray[gd.mapView.num_layer].setVisible(false);

            gd.mapView.num_layer = gd.mapView.num_layer + 1;

        }, this);
        
    }
});
gd.layersView = new LayersView({ el: $('#layers_list'), collection: layers });
