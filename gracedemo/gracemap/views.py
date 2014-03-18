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
from django.contrib.sites.models import get_current_site

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
import urllib2 

from gracemap.utils import sync_db, query_db, commit_transaction


@csrf_exempt
def view_map(request):
    """
    View map
    """
    center = ''
    if request.GET.get('center'):
        center = request.GET.get('center')
    zoom = ''
    if request.GET.get('zoom'):
        zoom = request.GET.get('zoom')
    
    #base_url = request.build_absolute_uri()
    base_url = ''.join(['http://', get_current_site(request).domain])
    rdict = {'qgis_server_url' : settings.QGIS_SERVER_URL, 'base_url': base_url, 'center': center, 'zoom': zoom}
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
    
    # Check if it is a request with JOIN or not
    resFrom = select_columns.find('FROM')
    
    if bbox :
        if resFrom == -1:
            select_string = "SELECT %s FROM %s WHERE ST_Intersects(ST_Transform(ST_SetSRID(ST_MakeBox2D(ST_Point(%s, %s), ST_Point(%s,%s)), 4326), 2154), geom)" % \
                        (select_columns, table_name, bbox[0], bbox[1], bbox[2], bbox[3] )
        else:
            where_complement = "WHERE ST_Intersects(ST_Transform(ST_SetSRID(ST_MakeBox2D(ST_Point(%s, %s), ST_Point(%s,%s)), 4326), 2154), geom) AND " % ( bbox[0], bbox[1], bbox[2], bbox[3])
            select_string = "SELECT %s " % (select_columns)
            select_string = select_string.replace("WHERE", where_complement)
    else :
        if resFrom == -1:
            select_string = "SELECT %s FROM %s limit 500" % (select_columns, table_name)
        else:
            select_string = "SELECT %s limit 500" % (select_columns)

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
        # Check if it is a request with join or not
        resFrom = select_result_columns.find('FROM')

        for search_col in search_columns:
            where_criteria = '%s ilike \'%%%%%s%%%%\'' % (search_col, criteria)
            where_tab.append(where_criteria)
        
        #select_string = "SELECT %s FROM %s WHERE %s" % (select_result_columns, table_name, ' OR '.join(where_tab))

        #if bbox :
        if resFrom == -1:
            select_string = "SELECT %s FROM %s WHERE %s" % (select_result_columns, table_name, ' OR '.join(where_tab))
        else:
            where_complement = "WHERE (%s) AND " % (' OR '.join(where_tab))
            select_string = "SELECT %s" % (select_result_columns)
            select_string = select_string.replace("WHERE", where_complement)

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

            i = i + 1
            response_content.append(feat_dict)

@csrf_exempt
def get_layers_infos(request):

    response_content = []
    
    feat_dict = SortedDict({"id": "tranchee", "label": "Tranchee", "type": "wms", "url": settings.QGIS_SERVER_URL, "tv_root" : "support", "queryable": True})
    response_content.append(feat_dict)
    feat_dict = SortedDict({"id": "cable", "label": "Cables", "type": "wms", "url": settings.QGIS_SERVER_URL, "tv_root" : "cablage", "queryable": True})
    response_content.append(feat_dict)
    feat_dict = SortedDict({"id": "fourreau", "label": "Fourreaux", "type": "wms", "url": settings.QGIS_SERVER_URL, "tv_root" : "support", "queryable": True})
    response_content.append(feat_dict)

    feat_dict = SortedDict({"id": "chambre", "label": "Chambres", "type": "wms", "url": settings.QGIS_SERVER_URL, "tv_root" : "support", "queryable": True})
    response_content.append(feat_dict)
    feat_dict = SortedDict({"id": "bpe", "label": "BPE", "type": "wms", "url": settings.QGIS_SERVER_URL, "tv_root" : "cablage", "queryable": True})
    response_content.append(feat_dict)
    feat_dict = SortedDict({"id": "site_technique", "label": "Sites techniques", "type": "wms", "url": settings.QGIS_SERVER_URL, "tv_root" : "", "queryable": True})
    response_content.append(feat_dict)

    response = HttpResponse()
    simplejson.dump(response_content, response,
                ensure_ascii=False, separators=(',', ':'))

    return response


@csrf_exempt
def get_feature_infos(request):
    # proxy for getfeatureinfos requests

    if request.GET.get('url'):
        url = request.GET.get('url')
    
    f = urllib2.urlopen(urllib2.Request(url=url))
    html = f.read()
    return HttpResponse(html)
    
    
    