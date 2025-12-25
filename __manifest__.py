{
    'name': 'Tareas Minimalistas Odoo',
    'version': '1.0',
    'category': 'Tools',
    'summary': 'Dashboard de tareas con OWL y Chart.js nativo',
    'depends': ['base', 'web'],
    'data': [
        'security/ir.model.access.csv',
        'views/todo_views.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'todo_app/static/src/js/todo_dashboard.js',
            'todo_app/static/src/xml/todo_dashboard.xml',
        ],
    },
    'installable': True,
    'application': True,
    'license': 'LGPL-3',
}
