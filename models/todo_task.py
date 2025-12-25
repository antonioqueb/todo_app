from odoo import models, fields, api

class TodoTask(models.Model):
    _name = 'todo.task'
    _description = 'Tarea de Prueba'
    _order = 'priority desc, create_date desc'

    name = fields.Char(string='Descripción', required=True)
    is_done = fields.Boolean(string='¿Hecho?', default=False)
    priority = fields.Selection([
        ('0', 'Baja'),
        ('1', 'Media'),
        ('2', 'Alta')
    ], string='Prioridad', default='1')
    
    date_deadline = fields.Date(string='Fecha Límite')
    notes = fields.Text(string='Notas')
    color = fields.Integer(string='Color Index')
    
    @api.model
    def get_dashboard_data(self):
        tasks = self.search([])
        total = len(tasks)
        done = len(tasks.filtered(lambda t: t.is_done))
        
        return {
            'total': total,
            'done': done,
            'pending': total - done,
            'by_priority': {
                'alta': len(tasks.filtered(lambda t: t.priority == '2')),
                'media': len(tasks.filtered(lambda t: t.priority == '1')),
                'baja': len(tasks.filtered(lambda t: t.priority == '0')),
            },
            'completion_rate': round((done / total * 100) if total else 0, 1),
        }
