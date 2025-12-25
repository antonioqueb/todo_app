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
