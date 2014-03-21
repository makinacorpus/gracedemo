GraceDemo
=========

GraceDemo est un prototype de portail de démonstration 100% open source. L'objectif est de proposer un outil permettant d'exploiter une base de données conforme au geostandard ANT.
Gr@ce est le nom du portail de géoréférencement et de recensement des infrastructures de communications électroniques de la région Aquitaine.
http://grace.aquitaine.fr/accueil/


Install
=======

System dependencies
-------------------

list of system dependencies:

  - python-virtualenv
  - python-dev
  - postgresql-9.1
  - postgresql-server-dev-9.1
  - postgresql-9.1-postgis
  - git

with apt:

    apt-get install python-virtualenv python-dev postgresql-9.1 postgresql-server-dev-9.1 postgresql-9.1-postgis git

Database
--------

You must have a Gr@ce compatible base installed on your server


Install QGis server
-------------------

QGis server must be installed on your server. Please refer to the official Qgis site to find install procedure.


Install application
-------------------

Clone this directory, and go in the projet directory:

    $ cd gracedemo/

Create virtual env and install dependencies :

    $ virtualenv --no-site-packages .
    $ pip install -r requirements.txt


Launch    
------

    $ export DJANGO_GRACEDEMO_PROJECT=`pwd`
    $ source $DJANGO_GRACEDEMO_PROJECT/bin/activate    
    $ cd gracedemo
    $ ./manage.py runserver

Of course, you may launch django in various ways. Please refer to the official Django site.

