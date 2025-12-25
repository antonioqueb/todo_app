{
    'name': 'Tareas Minimalistas Odoo',
    'version': '1.1',
    'category': 'Tools',
    'summary': 'Dashboard con Chart.js nativo de Odoo',
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