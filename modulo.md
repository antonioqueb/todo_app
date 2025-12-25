## ./__init__.py
```py
from . import models
```

## ./__manifest__.py
```py
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
```

## ./models/__init__.py
```py
from . import todo_task
```

## ./models/todo_task.py
```py
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
```

## ./static/src/js/todo_dashboard.js
```js
/** @odoo-module **/
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { Component, useState, onWillStart, onMounted } from "@odoo/owl";

export class TodoDashboard extends Component {
    static template = "todo_app.Dashboard";

    setup() {
        this.orm = useService("orm");
        this.action = useService("action");
        this.notification = useService("notification");
        
        this.state = useState({
            total: 0, done: 0, pending: 0,
            by_priority: { alta: 0, media: 0, baja: 0 },
            completion_rate: 0, loading: true,
        });

        onWillStart(async () => {
            await this.loadDashboardData();
        });

        onMounted(() => {
            this.renderChart();
        });
    }

    async loadDashboardData() {
        try {
            const data = await this.orm.call("todo.task", "get_dashboard_data", []);
            Object.assign(this.state, data, { loading: false });
        } catch (error) {
            this.state.loading = false;
        }
    }

    renderChart() {
        const canvas = document.getElementById('priorityChart');
        if (!canvas) return;
        
        // Odoo ya carga Chart.js globalmente en el backend
        if (this.chart) { this.chart.destroy(); }
        
        this.chart = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: ['Alta', 'Media', 'Baja'],
                datasets: [{
                    data: [this.state.by_priority.alta, this.state.by_priority.media, this.state.by_priority.baja],
                    backgroundColor: ['#dc3545', '#ffc107', '#28a745'],
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    openTasks(domain) {
        this.action.doAction({
            type: 'ir.actions.act_window',
            name: 'Tareas',
            res_model: 'todo.task',
            view_mode: 'list,form',
            views: [[false, 'list'], [false, 'form']],
            domain: domain,
            target: 'current',
        });
    }

    async createQuickTask() {
        const name = prompt("Nombre de la nueva tarea:");
        if (name) {
            await this.orm.create("todo.task", [{ name, priority: '1' }]);
            await this.refresh();
        }
    }

    async refresh() {
        this.state.loading = true;
        await this.loadDashboardData();
        this.renderChart();
    }

    celebrate() {
        this.notification.add("🎉 ¡Excelente trabajo!", { type: "success" });
        this.launchConfetti();
    }

    launchConfetti() {
        const canvas = document.createElement('canvas');
        canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999';
        document.body.appendChild(canvas);
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        let particles = Array.from({ length: 50 }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            color: '#' + Math.floor(Math.random()*16777215).toString(16),
            v: Math.random() * 5 + 2
        }));
        const draw = () => {
            ctx.clearRect(0,0,canvas.width,canvas.height);
            particles.forEach(p => {
                ctx.fillStyle = p.color;
                ctx.fillRect(p.x, p.y, 8, 8);
                p.y += p.v;
                if(p.y > canvas.height) p.y = -10;
            });
            requestAnimationFrame(draw);
        };
        draw();
        setTimeout(() => canvas.remove(), 3000);
    }
}

registry.category("actions").add("todo_dashboard_action", TodoDashboard);
```

## ./static/src/xml/todo_dashboard.xml
```xml
<?xml version="1.0" encoding="UTF-8"?>
<templates xml:space="preserve">
    <t t-name="todo_app.Dashboard">
        <div class="o_action p-4 bg-light h-100 overflow-auto">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2 class="mb-0">Todo Dashboard</h2>
                <div>
                    <button class="btn btn-primary me-2" t-on-click="createQuickTask">Nueva Tarea</button>
                    <button class="btn btn-light border" t-on-click="refresh"><i class="fa fa-refresh"/></button>
                </div>
            </div>

            <t t-if="state.loading">
                <div class="text-center p-5"><i class="fa fa-spinner fa-spin fa-3x"/></div>
            </t>
            <t t-else="">
                <div class="row mb-4">
                    <div class="col-md-3">
                        <div class="card shadow-sm text-center p-3 border-0" t-on-click="() => this.openTasks([])" style="cursor:pointer">
                            <div class="text-muted small">TOTAL</div>
                            <div class="h2 text-primary" t-esc="state.total"/>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card shadow-sm text-center p-3 border-0 border-start border-warning border-4" t-on-click="() => this.openTasks([['is_done','=',false]])" style="cursor:pointer">
                            <div class="text-muted small">PENDIENTES</div>
                            <div class="h2 text-warning" t-esc="state.pending"/>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card shadow-sm text-center p-3 border-0 border-start border-success border-4" t-on-click="() => this.openTasks([['is_done','=',true]])" style="cursor:pointer">
                            <div class="text-muted small">HECHAS</div>
                            <div class="h2 text-success" t-esc="state.done"/>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card shadow-sm text-center p-3 border-0 border-start border-danger border-4">
                            <div class="text-muted small">CUMPLIMIENTO</div>
                            <div class="h2 text-danger"><t t-esc="state.completion_rate"/>%</div>
                        </div>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-6">
                        <div class="card shadow-sm p-4 border-0">
                            <h5>Prioridades</h5>
                            <div style="height: 250px;"><canvas id="priorityChart"/></div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card shadow-sm p-4 border-0 h-100 d-flex flex-column justify-content-center align-items-center">
                            <t t-if="state.completion_rate >= 100">
                                <button class="btn btn-success btn-lg" t-on-click="celebrate">¡CELEBRAR! 🎉</button>
                            </t>
                            <t t-else="">
                                <div class="progress w-100" style="height: 20px;">
                                    <div class="progress-bar bg-info" t-attf-style="width: {{state.completion_rate}}%"/>
                                </div>
                                <p class="mt-2 text-muted">Faltan tareas para completar el día</p>
                            </t>
                        </div>
                    </div>
                </div>
            </t>
        </div>
    </t>
</templates>
```

## ./views/todo_views.xml
```xml
<?xml version="1.0" encoding="utf-8"?>
<odoo>
    <record id="view_todo_task_list" model="ir.ui.view">
        <field name="name">todo.task.list</field>
        <field name="model">todo.task</field>
        <field name="arch" type="xml">
            <list editable="bottom" decoration-success="is_done">
                <field name="name"/>
                <field name="priority" widget="priority"/>
                <field name="is_done" widget="boolean_toggle"/>
            </list>
        </field>
    </record>

    <record id="view_todo_task_form" model="ir.ui.view">
        <field name="name">todo.task.form</field>
        <field name="model">todo.task</field>
        <field name="arch" type="xml">
            <form>
                <sheet>
                    <group>
                        <field name="name"/>
                        <field name="priority" widget="priority"/>
                        <field name="is_done"/>
                    </group>
                </sheet>
            </form>
        </field>
    </record>

    <record id="action_todo_dashboard" model="ir.actions.client">
        <field name="name">Dashboard</field>
        <field name="tag">todo_dashboard_action</field>
    </record>

    <record id="action_todo_task" model="ir.actions.act_window">
        <field name="name">Tareas</field>
        <field name="res_model">todo.task</field>
        <field name="view_mode">list,form</field>
    </record>

    <menuitem id="menu_todo_root" name="Todo App" sequence="10"/>
    <menuitem id="menu_todo_dashboard" name="Dashboard" parent="menu_todo_root" action="action_todo_dashboard" sequence="5"/>
    <menuitem id="menu_todo_task" name="Tareas" parent="menu_todo_root" action="action_todo_task" sequence="10"/>
</odoo>
```

