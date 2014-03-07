from __future__ import with_statement

from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render_to_response, get_object_or_404
from django.http import HttpResponse
from django.template import RequestContext, loader
from django.utils import simplejson
from django.utils.datastructures import SortedDict
from django.conf import settings
from django.utils.translation import ugettext as _
from django.core.servers.basehttp import FileWrapper

#from easydict import EasyDict
from shapely.wkt import loads
from geojson import dumps

import json
import sqlite3 as lite
from shutil import copyfile
from tempfile import NamedTemporaryFile

import time
import datetime
import os
import tempfile

from gracemap.utils import sync_db, query_db, commit_transaction


@csrf_exempt
def view_map(request):
    """
    View map
    """
    rdict = {'x': 45, 'y': 5, 'qgis_server_url' : settings.QGIS_SERVER_URL}
    template = loader.get_template('gracemap/index.html')
    context = RequestContext(request, rdict)
    return HttpResponse(template.render(context))      

@csrf_exempt
def export_data_geojson(request, table_name):
    """
    Export data from DataBase as geojson format
    """

    bbox = []
    if request.GET.get('bbox'):
        bbox = request.GET.get('bbox').split(',')
        
    response_content = []
    #params = request.POST
    #if params:
        #table_name = params['table_name']
        #original_column_name = params['column_name']
    #else:
        #response_content.append({
            #'status': _("No POST param given")
        #})
        #response = HttpResponse()
        #simplejson.dump(response_content, response,
                    #ensure_ascii=False, separators=(',', ':'))
        #return response
    
    # Get infos
    response_objects = []
    response_content = {"type": "FeatureCollection", "features": []}

    # Get the operation on the column if necessary (percents, rounds)    
    get_data_object_geojson(response_objects, table_name, bbox)

    response_content["features"] = response_objects

    response = HttpResponse()
    simplejson.dump(response_content, response,
                ensure_ascii=False, separators=(',', ':'))

    return response



def get_data_object_geojson(response_content, table_name, bbox):
    """
    Perform a SELECT on the DB to retreive infos on associated object, geojson format
    Param: table_name : name of the table
    """

    select_columns = settings.GRACE_TABLE_INFOS_GEOJSON.get(table_name).get('select_col')
    geom_column = settings.GRACE_TABLE_INFOS_GEOJSON.get(table_name).get('geom_col')
    
    if bbox :
        select_string = "SELECT %s FROM %s WHERE ST_Intersects(ST_Transform(ST_SetSRID(ST_MakeBox2D(ST_Point(%s, %s), ST_Point(%s,%s)), 4326), 2154), geom)" % \
                    (select_columns, table_name, bbox[0], bbox[1], bbox[2], bbox[3] )
    else :
        select_string = "SELECT %s FROM %s limit 500" % (select_columns, table_name)

    cursor = query_db(select_string)
    i = 0  # feature index
    for row in cursor.fetchall():
        data = zip([column[0] for column in cursor.description], row)
        feat_dict = SortedDict({"type": "Feature", "id": i})
        properties_dict = SortedDict({})
        for attr in data:
            key = attr[0]
            val = attr[1]
            if type(val).__name__ == "date":
                val = val.strftime("%d/%m/%Y")

            if key == "geom":
                geom = loads(val)
                geometry_dict = dumps(geom)
            else:
                properties_dict[key] = val

        feat_dict["properties"] = properties_dict
        feat_dict["geometry"] = simplejson.loads(geometry_dict)

        i = i + 1
        response_content.append(feat_dict)


@csrf_exempt
def search_obj(request, criteria):
    """
    Search obj from criteria
    """

    response_content = []
    #params = request.POST
    #if params:
        #table_name = params['table_name']
        #original_column_name = params['column_name']
    #else:
        #response_content.append({
            #'status': _("No POST param given")
        #})
        #response = HttpResponse()
        #simplejson.dump(response_content, response,
                    #ensure_ascii=False, separators=(',', ':'))
        #return response
    
    # Get infos
    response_objects = []
    #response_content = {"type": "FeatureCollection", "features": []}

    # Get the operation on the column if necessary (percents, rounds)    
    get_result_object_json(response_objects, criteria)

    response_content = response_objects

    response = HttpResponse()
    simplejson.dump(response_content, response,
                ensure_ascii=False, separators=(',', ':'))

    return response

    
def get_result_object_json(response_content, criteria):
    """
    Perform a SELECT on the DB to search for objects
    Param: criteria : criteria of search
    """

    for table_name in settings.GRACE_TABLES:
        select_result_columns = settings.GRACE_TABLE_INFOS_GEOJSON.get(table_name).get('select_result_col')
        search_columns = settings.GRACE_TABLE_INFOS_GEOJSON.get(table_name).get('search_col')
        geom_column = settings.GRACE_TABLE_INFOS_GEOJSON.get(table_name).get('geom_col')
        where_tab = []
        
        for search_col in search_columns:
            where_criteria = '%s ilike \'%%%%%s%%%%\'' % (search_col, criteria)
            where_tab.append(where_criteria)
        
        select_string = "SELECT %s FROM %s WHERE %s" % (select_result_columns, table_name, ' OR '.join(where_tab))
        
        cursor = query_db(select_string)
        i = 0  # feature index
        for row in cursor.fetchall():
            data = zip([column[0] for column in cursor.description], row)
            #feat_dict = SortedDict({"type": "Feature", "id": i})
            feat_dict = SortedDict({})
            properties_dict = SortedDict({})
            for attr in data:
                key = attr[0]
                val = attr[1]
                if key == "center" or key == "geom":
                    geom = loads(val)
                    geometry_dict = dumps(geom)
                    feat_dict[key] = simplejson.loads(geometry_dict)
                else:
                    properties_dict[key] = val
                    feat_dict[key] = val

            #feat_dict["properties"] = properties_dict
            

            i = i + 1
            response_content.append(feat_dict)


@csrf_exempt
def get_layers(request):

    response_content = []
    #sub_feat_dict_1 = SortedDict({"id": 2, "label": "OSM", "inode": False, "checkbox": False, "radio": True })
    #sub_feat_dict_2 = SortedDict({"id": 3, "label": "GMaps", "inode": False, "checkbox": False, "radio": True })
    #feat_dict = SortedDict({"id": "root_fdp", "label": "Fonds de plan", "inode": True, "checkbox": False, "radio": False , "branch": [sub_feat_dict_1, sub_feat_dict_2]})
    feat_dict = SortedDict({"id": "root_fdp", "label": "Fonds de plan", "inode": True, "checkbox": False, "radio": False})
    response_content.append(feat_dict)
    #sub_feat_dict_3 = SortedDict({"id": 11, "label": "Arteres", "inode": False, "checkbox": True, "radio": False })
    #sub_feat_dict_4 = SortedDict({"id": 12, "label": "Noeuds", "inode": False, "checkbox": True, "radio": False })
    feat_dict = SortedDict({"id": "root_ref", "label": "Referentiel", "inode": True, "checkbox": True, "radio": False})
    response_content.append(feat_dict)

    response = HttpResponse()
    simplejson.dump(response_content, response,
                ensure_ascii=False, separators=(',', ':'))

    return response


@csrf_exempt
def get_layers_infos(request):

    response_content = []
    feat_dict = SortedDict({"id": "artere", "label": "Artere", "type": "wms", "url": settings.QGIS_SERVER_URL})
    response_content.append(feat_dict)
    feat_dict = SortedDict({"id": "noeud", "label": "Noeud", "type": "wms", "url": settings.QGIS_SERVER_URL})
    response_content.append(feat_dict)
    feat_dict = SortedDict({"id": "tranchee", "label": "Tranchee", "type": "wms", "url": settings.QGIS_SERVER_URL})
    response_content.append(feat_dict)

    response = HttpResponse()
    simplejson.dump(response_content, response,
                ensure_ascii=False, separators=(',', ':'))

    return response
    