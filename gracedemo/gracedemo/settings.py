# Django settings for gracedemo project.
import os

ABSOLUTE_PATH = os.getcwd()

DEBUG = True
TEMPLATE_DEBUG = DEBUG

ADMINS = (
    # ('Your Name', 'your_email@example.com'),
)

MANAGERS = ADMINS

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.', # Add 'postgresql_psycopg2', 'mysql', 'sqlite3' or 'oracle'.
        'NAME': '',                      # Or path to database file if using sqlite3.
        'USER': '',                      # Not used with sqlite3.
        'PASSWORD': '',                  # Not used with sqlite3.
        'HOST': '',                      # Set to empty string for localhost. Not used with sqlite3.
        'PORT': '',                      # Set to empty string for default. Not used with sqlite3.
    }
}

# Hosts/domain names that are valid for this site; required if DEBUG is False
# See https://docs.djangoproject.com/en/1.4/ref/settings/#allowed-hosts
ALLOWED_HOSTS = []

# Local time zone for this installation. Choices can be found here:
# http://en.wikipedia.org/wiki/List_of_tz_zones_by_name
# although not all choices may be available on all operating systems.
# In a Windows environment this must be set to your system time zone.
TIME_ZONE = 'America/Chicago'

# Language code for this installation. All choices can be found here:
# http://www.i18nguy.com/unicode/language-identifiers.html
LANGUAGE_CODE = 'en-us'

SITE_ID = 1

# If you set this to False, Django will make some optimizations so as not
# to load the internationalization machinery.
USE_I18N = True

# If you set this to False, Django will not format dates, numbers and
# calendars according to the current locale.
USE_L10N = True

# If you set this to False, Django will not use timezone-aware datetimes.
USE_TZ = True

# Absolute filesystem path to the directory that will hold user-uploaded files.
# Example: "/home/media/media.lawrence.com/media/"
MEDIA_ROOT = ''

# URL that handles the media served from MEDIA_ROOT. Make sure to use a
# trailing slash.
# Examples: "http://media.lawrence.com/media/", "http://example.com/media/"
MEDIA_URL = ''

# Absolute path to the directory static files should be collected to.
# Don't put anything in this directory yourself; store your static files
# in apps' "static/" subdirectories and in STATICFILES_DIRS.
# Example: "/home/media/media.lawrence.com/static/"
#STATIC_ROOT = ''
STATIC_ROOT = os.path.join(ABSOLUTE_PATH, 'static_collected/')

# URL prefix for static files.
# Example: "http://media.lawrence.com/static/"
STATIC_URL = '/static/'

# Additional locations of static files
STATICFILES_DIRS = (
    # Put strings here, like "/home/html/static" or "C:/www/django/static".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
)

# List of finder classes that know how to find static files in
# various locations.
STATICFILES_FINDERS = (
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
#    'django.contrib.staticfiles.finders.DefaultStorageFinder',
)

# Make this unique, and don't share it with anybody.
SECRET_KEY = '#iv#*!67hd&amp;b)ciofxvec0j820lr&amp;sblg@lja3-tf_q-&amp;mk^=8'

# List of callables that know how to import templates from various sources.
TEMPLATE_LOADERS = (
    'django.template.loaders.filesystem.Loader',
    'django.template.loaders.app_directories.Loader',
#     'django.template.loaders.eggs.Loader',
)

MIDDLEWARE_CLASSES = (
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    # Uncomment the next line for simple clickjacking protection:
    # 'django.middleware.clickjacking.XFrameOptionsMiddleware',
)

ROOT_URLCONF = 'gracedemo.urls'

# Python dotted path to the WSGI application used by Django's runserver.
WSGI_APPLICATION = 'gracedemo.wsgi.application'

TEMPLATE_DIRS = (
    # Put strings here, like "/home/html/django_templates" or "C:/www/django/templates".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
)

INSTALLED_APPS = (
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.sites',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Uncomment the next line to enable the admin:
    'django.contrib.admin',
    # Uncomment the next line to enable admin documentation:
    # 'django.contrib.admindocs',
    'gracemap',
)

# A sample logging configuration. The only tangible logging
# performed by this configuration is to send an email to
# the site admins on every HTTP 500 error when DEBUG=False.
# See http://docs.djangoproject.com/en/dev/topics/logging for
# more details on how to customize your logging configuration.
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse'
        }
    },
    'handlers': {
        'mail_admins': {
            'level': 'ERROR',
            'filters': ['require_debug_false'],
            'class': 'django.utils.log.AdminEmailHandler'
        }
    },
    'loggers': {
        'django.request': {
            'handlers': ['mail_admins'],
            'level': 'ERROR',
            'propagate': True,
        },
    }
}



TABLE_ARTERE = 'artere'
TABLE_NOEUD = 'noeud'
TABLE_FOURREAU = 'fourreau'
TABLE_TRANCHEE = 'tranchee'
TABLE_SITE_TECHNIQUE = 'site_technique'
TABLE_CABLE = 'cable'
TABLE_CHAMBRE = 'chambre'
TABLE_BPE= 'bpe'

#GRACE_TABLES = [TABLE_TRANCHEE, TABLE_ARTERE, TABLE_NOEUD, TABLE_FOURREAU, TABLE_SITE_TECHNIQUE, TABLE_CABLE, TABLE_CHAMBRE, TABLE_BPE]
GRACE_TABLES = [TABLE_TRANCHEE, TABLE_FOURREAU, TABLE_SITE_TECHNIQUE, TABLE_CABLE, TABLE_CHAMBRE, TABLE_BPE]

GRACE_TABLE_INFOS_GEOJSON =  {
    TABLE_ARTERE: {
        'id_col': 'id_artere',
        'geom_col': 'geom',
        'select_col': '\'artere\' as typeobj, ST_AsText(ST_Transform(geom, 4326)) as geom, ST_AsText(ST_SnapToGrid(ST_Centroid(ST_Transform(geom, 4326)),0.00001)) as center, id_com_insee_artere as "Insee", noeud_a as "Noeud A", noeud_b as "Noeud B"',
        'select_result_col': '\'artere\' as typeobj, id_artere as id, ST_AsText(ST_SnapToGrid(ST_Centroid(ST_Transform(geom, 4326)),0.00001)) as center',
        'search_col': ['id_artere', 'voie_artere']
    },
    TABLE_CABLE: {
        'id_col': 'id_cable',
        'geom_col': 'geom',
        'select_col': '\'cable\' as typeobj, id_cable as "Id", ST_AsText(ST_Transform(geom, 4326)) as geom, ST_AsText(ST_SnapToGrid(ST_Centroid(ST_Transform(geom, 4326)),0.00001)) as center, type_cable as "Type", nbr_fibre_cable as "Nombre fibres"',
        'select_result_col': '\'cable\' as typeobj, id_cable as id, ST_AsText(ST_SnapToGrid(ST_Centroid(ST_Transform(geom, 4326)),0.00001)) as center',
        'search_col': ['id_cable']
    },
    TABLE_NOEUD: {
        'id_col': 'id_noeud',
        'geom_col': 'geom',
        'select_col': '\'noeud\' as typeobj, nom_noeud as "Nom", type_physique_noeud as "Type", ST_AsText(ST_Transform(geom, 4326)) as geom, ST_AsText(ST_SnapToGrid(ST_Centroid(ST_Transform(geom, 4326)),0.00001)) as center, id_com_insee_noeud as "Insee"',
        'select_result_col': '\'noeud\' as typeobj, id_noeud as id, ST_AsText(ST_SnapToGrid(ST_Centroid(ST_Transform(geom, 4326)),0.00001)) as center',
        'search_col': ['id_noeud', 'voie_noeud']
    },
    TABLE_BPE: {
        'id_col': 'id_noeud',
        'geom_col': 'geom',
        'select_col': '\'bpe\' as typeobj,  nom_noeud as "Nom", type_physique_noeud as "Type", ST_AsText(ST_Transform(geom, 4326)) as geom, ST_AsText(ST_SnapToGrid(ST_Centroid(ST_Transform(geom, 4326)),0.00001)) as center, id_com_insee_noeud as "Insee" FROM noeud WHERE noeud.type_logiq_noeud = \'RACCORDEMENT\'',
        'select_result_col': '\'bpe\' as typeobj, id_noeud as id, ST_AsText(ST_SnapToGrid(ST_Centroid(ST_Transform(geom, 4326)),0.00001)) as center FROM noeud WHERE noeud.type_logiq_noeud = \'RACCORDEMENT\'',
        'search_col': ['id_noeud', 'voie_noeud']
    },
    TABLE_SITE_TECHNIQUE: {
        'id_col': 'id_lt',
        'geom_col': 'geom',
        'select_col': '\'site_technique\' as typeobj, type_lt as "Type", ST_AsText(ST_Transform(n.geom, 4326)) as geom, ST_AsText(ST_SnapToGrid(ST_Centroid(ST_Transform(n.geom, 4326)),0.00001)) as center, n.id_com_insee_noeud as "Insee" FROM noeud n, local_technique lt WHERE lt.id_noeud = n.id_noeud',
        'select_result_col': '\'site_technique\' as typeobj, id_lt as id, ST_AsText(ST_SnapToGrid(ST_Centroid(ST_Transform(n.geom, 4326)),0.00001)) as center FROM noeud n, local_technique lt WHERE lt.id_noeud = n.id_noeud',
        'search_col': ['id_lt', 'hbgmt_lt']
    },
    TABLE_CHAMBRE: {
        'id_col': 'id_chbre',
        'geom_col': 'geom',
        'select_col': '\'chambre\' as typeobj, id_chbre as "Id", type_chambre as "Type", ST_AsText(ST_Transform(n.geom, 4326)) as geom, ST_AsText(ST_SnapToGrid(ST_Centroid(ST_Transform(n.geom, 4326)),0.00001)) as center, n.id_com_insee_noeud as "Insee" FROM noeud n, chambre c WHERE c.id_noeud = n.id_noeud',
        'select_result_col': '\'chambre\' as typeobj, id_chbre as id, ST_AsText(ST_SnapToGrid(ST_Centroid(ST_Transform(n.geom, 4326)),0.00001)) as center FROM noeud n, chambre c WHERE c.id_noeud = n.id_noeud',
        'search_col': ['id_chbre', 'type_chambre']
    },
    TABLE_FOURREAU: {
        'id_col': 'id_four',
        'geom_col': 'geom',
        'select_col': '\'fourreau\' as typeobj, ST_AsText(ST_Transform(geom, 4326)) as geom, ST_AsText(ST_SnapToGrid(ST_Centroid(ST_Transform(geom, 4326)),0.00001)) as center, type_four as "Type", etat_four as "Etat"',
        'select_result_col': '\'fourreau\' as typeobj, id_four as id, ST_AsText(ST_SnapToGrid(ST_Centroid(ST_Transform(geom, 4326)),0.00001)) as center',
        'search_col': ['id_four', 'etat_four']        
    },
    TABLE_TRANCHEE: {
        'id_col': 'id_tranchee',
        'geom_col': 'geom',
        'select_col': '\'tranchee\' as typeobj, ST_AsText(ST_Transform(geom, 4326)) as geom, ST_AsText(ST_SnapToGrid(ST_Centroid(ST_Transform(geom, 4326)),0.00001)) as center, mod_pose_tranchee as "Pose", long_tranchee as "Longueur"',
        'select_result_col': '\'tranchee\' as typeobj, id_tranchee as id, ST_AsText(ST_SnapToGrid(ST_Centroid(ST_Transform(geom, 4326)),0.00001)) as center',
        'search_col': ['id_tranchee', 'mod_pose_tranchee']        
    }
    
    
}

from settings_local import *